import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';

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

    const pendingCount = await prisma.todo.count({
      where: {
        firmId: user.firmId,
        assignedTo: user.id,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ pendingCount });
  } catch (error) {
    console.error('Error fetching pending todo count:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
