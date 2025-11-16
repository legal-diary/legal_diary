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
      include: { firmMember: true },
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
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(
      {
        message: 'Login successful',
        user: userWithoutPassword,
        token,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    // Return a more specific error message while protecting sensitive details
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Authentication service unavailable. Please try again later.' },
      { status: 500 }
    );
  }
}
