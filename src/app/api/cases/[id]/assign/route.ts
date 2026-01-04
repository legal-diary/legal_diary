import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';

/**
 * POST /api/cases/[id]/assign
 * Assign advocates to a case (ADMIN only)
 * Body: { userIds: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMIN can assign advocates
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can assign advocates to cases' },
        { status: 403 }
      );
    }

    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

    // Verify case belongs to firm
    const caseRecord = await prisma.case.findFirst({
      where: {
        id: caseId,
        firmId: user.firmId,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Verify all users belong to the same firm
    const usersInFirm = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        firmId: user.firmId,
      },
      select: { id: true },
    });

    if (usersInFirm.length !== userIds.length) {
      return NextResponse.json(
        { error: 'One or more users do not belong to your firm' },
        { status: 400 }
      );
    }

    // Create assignments (skip existing ones)
    const existingAssignments = await prisma.caseAssignment.findMany({
      where: {
        caseId,
        userId: { in: userIds },
      },
      select: { userId: true },
    });

    const existingUserIds = new Set(existingAssignments.map(a => a.userId));
    const newUserIds = userIds.filter((id: string) => !existingUserIds.has(id));

    if (newUserIds.length > 0) {
      await prisma.caseAssignment.createMany({
        data: newUserIds.map((userId: string) => ({
          caseId,
          userId,
        })),
      });
    }

    // Return updated case with assignments
    const updatedCase = await prisma.case.findFirst({
      where: { id: caseId },
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: `${newUserIds.length} advocate(s) assigned successfully`,
      case: updatedCase,
    });
  } catch (error) {
    console.error('Error assigning advocates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cases/[id]/assign
 * Remove advocates from a case (ADMIN only)
 * Body: { userIds: string[] }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMIN can remove advocates
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can remove advocates from cases' },
        { status: 403 }
      );
    }

    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

    // Verify case belongs to firm
    const caseRecord = await prisma.case.findFirst({
      where: {
        id: caseId,
        firmId: user.firmId,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Delete assignments
    const deleteResult = await prisma.caseAssignment.deleteMany({
      where: {
        caseId,
        userId: { in: userIds },
      },
    });

    // Return updated case with assignments
    const updatedCase = await prisma.case.findFirst({
      where: { id: caseId },
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: `${deleteResult.count} advocate(s) removed successfully`,
      case: updatedCase,
    });
  } catch (error) {
    console.error('Error removing advocates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cases/[id]/assign
 * Get all assignments for a case
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Role-based access check
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = {
      id: caseId,
      firmId: user.firmId,
      ...(isAdmin ? {} : { assignments: { some: { userId: user.id } } }),
    };

    const caseRecord = await prisma.case.findFirst({
      where: caseFilter,
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json(caseRecord.assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
