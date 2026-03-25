import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const existing = await prisma.todo.findFirst({
      where: { id, firmId: user.firmId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    if (existing.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Todo is already closed' }, { status: 400 });
    }

    // Authorization: admin or the assigned user can close
    if (user.role !== 'ADMIN' && existing.assignedTo !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned user or an admin can close this todo' },
        { status: 403 }
      );
    }

    const { closingComment } = await request.json();

    if (!closingComment || !closingComment.trim()) {
      return NextResponse.json(
        { error: 'Closing comment is required' },
        { status: 400 }
      );
    }

    if (closingComment.trim().length < 3) {
      return NextResponse.json(
        { error: 'Closing comment must be at least 3 characters' },
        { status: 400 }
      );
    }

    const updated = await prisma.todo.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        closingComment: closingComment.trim(),
        closedAt: new Date(),
        closedById: user.id,
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, caseTitle: true },
        },
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        closedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error closing todo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
