import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';

function normalizeUserIds(payload: unknown): string[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  }
  if (typeof payload === 'string') {
    return [payload];
  }
  return [];
}

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

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const userIds = normalizeUserIds(body?.userIds ?? body?.userId);

    if (userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds is required' },
        { status: 400 }
      );
    }

    const caseRecord = await prisma.case.findFirst({
      where: {
        id: caseId,
        firmId: user.firmId,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const firmUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        firmId: user.firmId,
        role: 'ADVOCATE',
      },
      select: { id: true },
    });

    const validUserIds = firmUsers.map((firmUser) => firmUser.id);

    if (validUserIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid advocates found for assignment' },
        { status: 400 }
      );
    }

    await prisma.caseAssignment.createMany({
      data: validUserIds.map((userId) => ({
        caseId,
        userId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      caseId,
      assignedUserIds: validUserIds,
    });
  } catch (error) {
    console.error('Error assigning advocates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const userIds = normalizeUserIds(body?.userIds ?? body?.userId);

    if (userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds is required' },
        { status: 400 }
      );
    }

    const caseRecord = await prisma.case.findFirst({
      where: {
        id: caseId,
        firmId: user.firmId,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const deleteResult = await prisma.caseAssignment.deleteMany({
      where: {
        caseId,
        userId: { in: userIds },
      },
    });

    return NextResponse.json({
      caseId,
      removedCount: deleteResult.count,
    });
  } catch (error) {
    console.error('Error removing advocates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
