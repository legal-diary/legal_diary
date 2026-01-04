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

    const { email, name, password, firmName, firmId } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    // Validate that either firmName or firmId is provided
    if (!firmName && !firmId) {
      return NextResponse.json(
        { error: 'Either firmName (to create new) or firmId (to join existing) is required' },
        { status: 400 }
      );
    }

    // Prevent both from being provided
    if (firmName && firmId) {
      return NextResponse.json(
        { error: 'Provide either firmName or firmId, not both' },
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

    // Determine role based on firm action:
    // - Creating a new firm (firmName) → ADMIN (firm owner)
    // - Joining existing firm (firmId) → ADVOCATE (team member)
    const role = firmName ? 'ADMIN' : 'ADVOCATE';

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

    // Handle firm assignment
    let assignedFirmId: string | null = null;

    if (firmName) {
      // Case 1: Create a new firm
      // Validate firm name
      if (firmName.length < 2 || firmName.length > 100) {
        // Clean up user if firm creation fails
        await prisma.user.delete({ where: { id: user.id } });
        return NextResponse.json(
          { error: 'Firm name must be between 2 and 100 characters' },
          { status: 400 }
        );
      }

      const newFirm = await prisma.firm.create({
        data: {
          name: firmName,
          ownerId: user.id,
        },
      });

      assignedFirmId = newFirm.id;
    } else if (firmId) {
      // Case 2: Join an existing firm
      // Verify the firm exists
      const existingFirm = await prisma.firm.findUnique({
        where: { id: firmId },
      });

      if (!existingFirm) {
        // Clean up user if firm doesn't exist
        await prisma.user.delete({ where: { id: user.id } });
        return NextResponse.json(
          { error: 'Specified firm does not exist' },
          { status: 404 }
        );
      }

      assignedFirmId = firmId;
    }

    // Update user with firm ID
    if (assignedFirmId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { firmId: assignedFirmId },
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
