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

    const courtTypes = await prisma.courtType.findMany({
      where: {
        OR: [
          { isDefault: true },
          { firmId: user.firmId },
        ],
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(courtTypes);
  } catch (error) {
    console.error('Error fetching court types:', error);
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

    const { name } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Court type name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check if this court type already exists (either as default or for this firm)
    const existing = await prisma.courtType.findFirst({
      where: {
        name: trimmedName,
        OR: [
          { isDefault: true },
          { firmId: user.firmId },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const courtType = await prisma.courtType.create({
      data: {
        name: trimmedName,
        firmId: user.firmId,
        isDefault: false,
      },
    });

    return NextResponse.json(courtType, { status: 201 });
  } catch (error) {
    console.error('Error creating court type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
