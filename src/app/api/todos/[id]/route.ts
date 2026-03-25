import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';

export async function PUT(
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

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update todos' }, { status: 403 });
    }

    const existing = await prisma.todo.findFirst({
      where: { id, firmId: user.firmId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const { description, caseId, assignedTo, status } = await request.json();

    // Block completing via PUT - must use /close endpoint
    if (status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'To close a todo, use the close endpoint with a closing comment' },
        { status: 400 }
      );
    }

    const updated = await prisma.todo.update({
      where: { id },
      data: {
        ...(description !== undefined && { description: description.trim() }),
        ...(caseId !== undefined && { caseId: caseId || null }),
        ...(assignedTo !== undefined && { assignedTo: assignedTo || null }),
        ...(status && { status }),
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
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete todos' }, { status: 403 });
    }

    const existing = await prisma.todo.findFirst({
      where: { id, firmId: user.firmId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    await prisma.todo.delete({ where: { id } });

    return NextResponse.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
