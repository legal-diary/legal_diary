import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateSessionToken } from '@/lib/auth';
import {
  isRateLimited,
  recordFailedAttempt,
  clearRateLimit,
  getRemainingAttempts,
  getResetTime,
} from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email is rate limited
    if (isRateLimited(email)) {
      const resetTime = getResetTime(email);
      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${resetTime} seconds.`,
          retryAfter: resetTime,
        },
        { status: 429 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        firmMember: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      // Record failed attempt
      const attempts = recordFailedAttempt(email);
      const remaining = getRemainingAttempts(email);

      return NextResponse.json(
        {
          error: 'Invalid email or password',
          attemptsRemaining: remaining,
        },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) {
      // Record failed attempt
      recordFailedAttempt(email);
      const remaining = getRemainingAttempts(email);

      return NextResponse.json(
        {
          error: 'Invalid email or password',
          attemptsRemaining: remaining,
        },
        { status: 401 }
      );
    }

    // Clear rate limit on successful login
    clearRateLimit(email);

    // Create session token
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Return user info and token
    const { password: _, firmMember, ...userWithoutPassword } = user;
    const userData = {
      ...userWithoutPassword,
      firm_name: firmMember?.name || null,
    };

    return NextResponse.json(
      {
        message: 'Login successful',
        user: userData,
        token,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);

    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // Check for Prisma-specific errors
    let errorMessage = 'Authentication service unavailable. Please try again later.';
    let errorDetails = {};

    if (error instanceof Error) {
      // Detect database connection errors
      if (error.message.includes('Can\'t reach database server') ||
          error.message.includes('Connection refused') ||
          error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Database connection failed. Please check DATABASE_URL configuration.';
        errorDetails = { hint: 'Verify DATABASE_URL in environment variables' };
      } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
        errorMessage = 'Database SSL connection error.';
        errorDetails = { hint: 'Check if database requires SSL connection' };
      } else if (error.message.includes('authentication failed')) {
        errorMessage = 'Database authentication failed.';
        errorDetails = { hint: 'Verify database credentials in DATABASE_URL' };
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          debug: error instanceof Error ? error.message : String(error),
          ...errorDetails
        })
      },
      { status: 500 }
    );
  }
}
