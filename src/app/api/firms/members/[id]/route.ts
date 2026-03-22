import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { ActivityLogger } from '@/lib/activityLog';

/**
 * PUT /api/firms/members/[id]
 * Update a team member's role
 * Only accessible by ADMIN users
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMINs can update roles
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    // Validate role
    const validRoles = ['ADVOCATE', 'ADMIN'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADVOCATE or ADMIN' },
        { status: 400 }
      );
    }

    // Find the target user
    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        firmId: user.firmId, // Must be in the same firm
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found in your firm' },
        { status: 404 }
      );
    }

    // Get firm to check ownership
    const firm = await prisma.firm.findUnique({
      where: { id: user.firmId },
    });

    // Prevent demoting the firm owner
    if (targetUser.id === firm?.ownerId && role === 'ADVOCATE') {
      return NextResponse.json(
        { error: 'Cannot demote the firm owner. Transfer ownership first.' },
        { status: 400 }
      );
    }

    // Prevent user from changing their own role
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Update the user's role
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Log the role change activity
    ActivityLogger.memberRoleChanged(
      user.id,
      user.firmId,
      targetUserId,
      targetUser.name || targetUser.email,
      targetUser.role,
      role,
      request
    );

    return NextResponse.json({
      message: `User role updated to ${role}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/firms/members/[id]
 * Remove a member from the firm
 * Only accessible by ADMIN users
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMINs can remove members
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find the target user
    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        firmId: user.firmId,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found in your firm' },
        { status: 404 }
      );
    }

    // Get firm to check ownership
    const firm = await prisma.firm.findUnique({
      where: { id: user.firmId },
    });

    // Prevent removing the firm owner
    if (targetUser.id === firm?.ownerId) {
      return NextResponse.json(
        { error: 'Cannot remove the firm owner' },
        { status: 400 }
      );
    }

    // Prevent removing yourself
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from the firm' },
        { status: 400 }
      );
    }

    // Remove user from firm with full cleanup in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Reassign their case assignments to the requesting admin
      await tx.caseAssignment.updateMany({
        where: { userId: targetUserId },
        data: { userId: user.id },
      });

      // 2. Delete duplicate assignments (admin may already be assigned)
      // Find cases where admin now has duplicate assignments
      const adminAssignments = await tx.caseAssignment.findMany({
        where: { userId: user.id },
        select: { caseId: true, id: true },
      });
      const seen = new Set<string>();
      const duplicateIds: string[] = [];
      for (const a of adminAssignments) {
        if (seen.has(a.caseId)) {
          duplicateIds.push(a.id);
        }
        seen.add(a.caseId);
      }
      if (duplicateIds.length > 0) {
        await tx.caseAssignment.deleteMany({
          where: { id: { in: duplicateIds } },
        });
      }

      // 3. Delete their active sessions (force logout)
      await tx.session.deleteMany({
        where: { userId: targetUserId },
      });

      // 4. Delete their Google Calendar tokens
      await tx.googleCalendarToken.deleteMany({
        where: { userId: targetUserId },
      });

      // 5. Remove user from firm
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          firmId: null,
          role: 'ADVOCATE',
        },
      });
    });

    // Log the member removal activity
    ActivityLogger.memberRemoved(
      user.id,
      user.firmId,
      targetUserId,
      targetUser.name || targetUser.email,
      request
    );

    return NextResponse.json({
      message: 'User removed from firm',
    });
  } catch (error) {
    console.error('Error removing user from firm:', error);
    return NextResponse.json(
      { error: 'Failed to remove user from firm' },
      { status: 500 }
    );
  }
}
