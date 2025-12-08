import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';

// GET a specific hearing
export async function GET(
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

    const hearing = await prisma.hearing.findFirst({
      where: {
        id,
        case: { firmId: user.firmId },
      },
      include: {
        case: true,
        reminders: true,
      },
    });

    if (!hearing) {
      return NextResponse.json({ error: 'Hearing not found' }, { status: 404 });
    }

    return NextResponse.json(hearing);
  } catch (error) {
    console.error('Error fetching hearing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a hearing
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

    // Verify hearing ownership
    const existingHearing = await prisma.hearing.findFirst({
      where: {
        id,
        case: { firmId: user.firmId },
      },
    });

    if (!existingHearing) {
      return NextResponse.json({ error: 'Hearing not found' }, { status: 404 });
    }

    const {
      hearingDate,
      hearingTime,
      hearingType,
      courtRoom,
      notes,
      status,
    } = await request.json();

    const updatedHearing = await prisma.hearing.update({
      where: { id },
      data: {
        ...(hearingDate && { hearingDate: new Date(hearingDate) }),
        ...(hearingTime !== undefined && { hearingTime }),
        ...(hearingType && { hearingType }),
        ...(courtRoom !== undefined && { courtRoom }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
      },
      include: {
        case: true,
        reminders: true,
      },
    });

    return NextResponse.json(updatedHearing);
  } catch (error) {
    console.error('Error updating hearing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a hearing
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

    // Verify hearing ownership
    const existingHearing = await prisma.hearing.findFirst({
      where: {
        id,
        case: { firmId: user.firmId },
      },
    });

    if (!existingHearing) {
      return NextResponse.json({ error: 'Hearing not found' }, { status: 404 });
    }

    await prisma.hearing.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Hearing deleted successfully' });
  } catch (error) {
    console.error('Error deleting hearing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
