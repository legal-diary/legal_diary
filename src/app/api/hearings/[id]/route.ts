import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import {
  updateCalendarEvent,
  deleteCalendarEvent,
  isGoogleCalendarConnected,
} from '@/lib/googleCalendar';
import { ActivityLogger } from '@/lib/activityLog';

// GET a specific hearing (role-based access)
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

    // Role-based filtering through case assignments
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = isAdmin
      ? { firmId: user.firmId }
      : { firmId: user.firmId, assignments: { some: { userId: user.id } } };

    const hearing = await prisma.hearing.findFirst({
      where: {
        id,
        Case: caseFilter,
      },
      include: {
        Case: true,
        Reminder: true,
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

// PUT - Update a hearing (role-based access)
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

    // Role-based access verification
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = isAdmin
      ? { firmId: user.firmId }
      : { firmId: user.firmId, assignments: { some: { userId: user.id } } };

    const existingHearing = await prisma.hearing.findFirst({
      where: {
        id,
        Case: caseFilter,
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
        Case: {
          select: {
            caseNumber: true,
            caseTitle: true,
            clientName: true,
          },
        },
        Reminder: true,
      },
    });

    // Log the hearing update activity
    const changes = {
      ...(hearingDate && { hearingDate }),
      ...(hearingTime !== undefined && { hearingTime }),
      ...(hearingType && { hearingType }),
      ...(courtRoom !== undefined && { courtRoom }),
      ...(notes !== undefined && { notes: 'updated' }),
      ...(status && { status }),
    };
    ActivityLogger.hearingUpdated(user.id, user.firmId, id, updatedHearing.Case.caseNumber, changes, request);

    // Auto-sync to Google Calendar if connected
    try {
      const googleConnected = await isGoogleCalendarConnected(user.id);
      if (googleConnected) {
        await updateCalendarEvent(user.id, {
          hearingId: updatedHearing.id,
          caseNumber: updatedHearing.Case.caseNumber,
          caseTitle: updatedHearing.Case.caseTitle,
          clientName: updatedHearing.Case.clientName,
          hearingDate: updatedHearing.hearingDate,
          hearingTime: updatedHearing.hearingTime,
          hearingType: updatedHearing.hearingType,
          courtRoom: updatedHearing.courtRoom,
          notes: updatedHearing.notes,
        });
        console.log('[Hearings] Updated Google Calendar event:', updatedHearing.id);
      }
    } catch (googleError) {
      console.error('[Hearings] Google Calendar update failed:', googleError);
    }

    return NextResponse.json(updatedHearing);
  } catch (error) {
    console.error('Error updating hearing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a hearing (role-based access)
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

    // Role-based access verification
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = isAdmin
      ? { firmId: user.firmId }
      : { firmId: user.firmId, assignments: { some: { userId: user.id } } };

    const existingHearing = await prisma.hearing.findFirst({
      where: {
        id,
        Case: caseFilter,
      },
      include: {
        Case: {
          select: { caseNumber: true },
        },
      },
    });

    if (!existingHearing) {
      return NextResponse.json({ error: 'Hearing not found' }, { status: 404 });
    }

    // Delete from Google Calendar first (if connected)
    try {
      const googleConnected = await isGoogleCalendarConnected(user.id);
      if (googleConnected) {
        await deleteCalendarEvent(user.id, id);
        console.log('[Hearings] Deleted Google Calendar event:', id);
      }
    } catch (googleError) {
      console.error('[Hearings] Google Calendar delete failed:', googleError);
    }

    await prisma.hearing.delete({
      where: { id },
    });

    // Log the hearing deletion activity
    ActivityLogger.hearingDeleted(user.id, user.firmId, id, existingHearing.Case.caseNumber, request);

    return NextResponse.json({ message: 'Hearing deleted successfully' });
  } catch (error) {
    console.error('Error deleting hearing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
