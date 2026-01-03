import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';

/**
 * POST /api/auth/setup-firm
 * Sets up a firm for a user (typically after Google OAuth login)
 * Requires authentication
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

    // Check if user already has a firm
    if (user.firmId) {
      return NextResponse.json(
        { error: 'User already has a firm assigned' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { firmName, firmId } = body;

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

    let assignedFirmId: string;

    if (firmName) {
      // Create a new firm
      if (firmName.length < 2 || firmName.length > 100) {
        return NextResponse.json(
          { error: 'Firm name must be between 2 and 100 characters' },
          { status: 400 }
        );
      }

      const newFirm = await withRetry(() =>
        prisma.firm.create({
          data: {
            name: firmName,
            ownerId: user.id,
          },
        })
      );

      assignedFirmId = newFirm.id;
    } else {
      // Join an existing firm
      const existingFirm = await withRetry(() =>
        prisma.firm.findUnique({
          where: { id: firmId },
        })
      );

      if (!existingFirm) {
        return NextResponse.json(
          { error: 'Specified firm does not exist' },
          { status: 404 }
        );
      }

      assignedFirmId = firmId;
    }

    // Update user with firm ID
    const updatedUser = await withRetry(() =>
      prisma.user.update({
        where: { id: user.id },
        data: { firmId: assignedFirmId },
        include: {
          Firm_User_firmIdToFirm: {
            select: { name: true },
          },
        },
      })
    );

    // Return updated user info
    const { password: _, Firm_User_firmIdToFirm, ...userWithoutPassword } = updatedUser;
    const userData = {
      ...userWithoutPassword,
      firm_name: Firm_User_firmIdToFirm?.name || null,
    };

    return NextResponse.json({
      message: 'Firm setup successful',
      user: userData,
    });
  } catch (error) {
    console.error('[Setup Firm] Error:', error);
    return NextResponse.json(
      { error: 'Failed to set up firm' },
      { status: 500 }
    );
  }
}
