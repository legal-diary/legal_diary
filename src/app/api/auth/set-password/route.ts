import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { hashPassword, verifyPassword } from '@/lib/auth';

/**
 * POST /api/auth/set-password
 * Set or update password for the authenticated user
 * - For Google OAuth users: Set initial password (no current password required)
 * - For existing users: Change password (requires current password)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate new password
    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Get full user data with password
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, password: true },
    });

    if (!fullUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user already has a password, verify current password
    if (fullUser.password) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change your password' },
          { status: 400 }
        );
      }

      const isCurrentPasswordValid = await verifyPassword(
        currentPassword,
        fullUser.password
      );

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
    }

    // Hash and save new password
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      message: fullUser.password
        ? 'Password updated successfully'
        : 'Password set successfully. You can now login with email and password.',
    });
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/set-password
 * Check if user has a password set
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user with password field
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });

    return NextResponse.json({
      hasPassword: !!fullUser?.password,
    });
  } catch (error) {
    console.error('Check password error:', error);
    return NextResponse.json(
      { error: 'Failed to check password status' },
      { status: 500 }
    );
  }
}
