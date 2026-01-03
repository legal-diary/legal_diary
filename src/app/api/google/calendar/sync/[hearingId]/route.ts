import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import {
  createCalendarEvent,
  updateCalendarEvent,
  isGoogleCalendarConnected,
} from '@/lib/googleCalendar';

/**
 * POST /api/google/calendar/sync/[hearingId]
 * Sync a single hearing to Google Calendar
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hearingId: string }> }
) {
  try {
    const { hearingId } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const isAdmin = user.role === 'ADMIN';

    // Check if connected
    const connected = await isGoogleCalendarConnected(user.id);
    if (!connected) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      );
    }

    // Get hearing with case details
    const hearing = await prisma.hearing.findFirst({
      where: {
        id: hearingId,
        Case: {
          firmId: user.firmId,
          ...(isAdmin
            ? {}
            : {
                assignments: {
                  some: {
                    userId: user.id,
                  },
                },
              }),
        },
      },
      include: {
        Case: {
          select: {
            caseNumber: true,
            caseTitle: true,
            clientName: true,
          },
        },
        CalendarSync: true,
      },
    });

    if (!hearing) {
      return NextResponse.json({ error: 'Hearing not found' }, { status: 404 });
    }

    const hearingData = {
      hearingId: hearing.id,
      caseNumber: hearing.Case.caseNumber,
      caseTitle: hearing.Case.caseTitle,
      clientName: hearing.Case.clientName,
      hearingDate: hearing.hearingDate,
      hearingTime: hearing.hearingTime,
      hearingType: hearing.hearingType,
      courtRoom: hearing.courtRoom,
      notes: hearing.notes,
    };

    // Create or update event
    const result = hearing.CalendarSync.length > 0
      ? await updateCalendarEvent(user.id, hearingData)
      : await createCalendarEvent(user.id, hearingData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        eventId: 'eventId' in result ? result.eventId : undefined,
        message: 'Hearing synced to Google Calendar',
      });
    }

    return NextResponse.json(
      { error: result.error || 'Sync failed' },
      { status: 500 }
    );
  } catch (error) {
    console.error('[Google Sync Single] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync hearing' },
      { status: 500 }
    );
  }
}
