import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

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

    const { email, name, password, firmName, role = 'ADVOCATE' } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
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

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Validate name
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 100 characters' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['ADVOCATE', 'ADMIN', 'SUPPORT_STAFF'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user first (without firm ID initially)
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
      },
    });

    // Create firm if firm name is provided
    let firm = null;
    if (firmName && role === 'ADVOCATE') {
      // Validate firm name
      if (firmName.length < 2 || firmName.length > 100) {
        // Clean up user if firm creation fails
        await prisma.user.delete({ where: { id: user.id } });
        return NextResponse.json(
          { error: 'Firm name must be between 2 and 100 characters' },
          { status: 400 }
        );
      }

      firm = await prisma.firm.create({
        data: {
          name: firmName,
          ownerId: user.id,
        },
      });

      // Update user with firm ID
      await prisma.user.update({
        where: { id: user.id },
        data: { firmId: firm.id },
      });
    }

    // Return success without password
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(
      {
        message: 'User registered successfully',
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again later.' },
      { status: 500 }
    );
  }
}
