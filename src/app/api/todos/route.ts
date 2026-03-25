import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';

const todoIncludes = {
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
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Role-based filtering: admins see all firm todos, others see only assigned
    const isAdmin = user.role === 'ADMIN';
    const baseWhere = isAdmin
      ? { firmId: user.firmId }
      : { firmId: user.firmId, assignedTo: user.id };

    // Fetch active (pending) todos
    const todos = await prisma.todo.findMany({
      where: { ...baseWhere, status: 'PENDING' },
      include: todoIncludes,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch last 10 completed todos for history
    const completedHistory = await prisma.todo.findMany({
      where: { ...baseWhere, status: 'COMPLETED' },
      include: todoIncludes,
      orderBy: { closedAt: 'desc' },
      take: 10,
    });

    // Count pending todos assigned to the current user (for badge)
    const pendingCount = await prisma.todo.count({
      where: {
        firmId: user.firmId,
        assignedTo: user.id,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ todos, completedHistory, pendingCount });
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Only admins can create todos' }, { status: 403 });
    }

    const { caseId, description, assignedTo } = await request.json();

    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    if (caseId) {
      const caseExists = await prisma.case.findFirst({
        where: { id: caseId, firmId: user.firmId },
      });
      if (!caseExists) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }
    }

    if (assignedTo) {
      const assigneeExists = await prisma.user.findFirst({
        where: { id: assignedTo, firmId: user.firmId },
      });
      if (!assigneeExists) {
        return NextResponse.json({ error: 'Assigned user not found in firm' }, { status: 404 });
      }
    }

    const todo = await prisma.todo.create({
      data: {
        firmId: user.firmId,
        caseId: caseId || null,
        description: description.trim(),
        assignedTo: assignedTo || null,
        createdById: user.id,
      },
      include: todoIncludes,
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
