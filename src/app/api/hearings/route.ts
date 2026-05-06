import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { readCaseFilter, writeCaseFilter } from '@/lib/access';
import { generateHearingInsights } from '@/lib/openai';
import { createCalendarEvent, isGoogleCalendarConnected } from '@/lib/googleCalendar';
import { ActivityLogger } from '@/lib/activityLog';

// GET hearings for user's firm (role-based filtering)
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

    // Read is firm-wide for everyone; the calendar/dashboard surfaces show
    // assignee chips so advocates can tell whose hearing each row is.
    const caseFilter = readCaseFilter({ firmId: user.firmId });

    // Check if calendar mode is requested (optimized for calendar view)
    const url = new URL(request.url);
    const calendarMode = url.searchParams.get('calendar') === 'true';

    if (calendarMode) {
      // Date-range filtering for calendar (limits data to visible range)
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      const dateFilter = (startDate && endDate)
        ? { gte: new Date(startDate), lte: new Date(endDate) }
        : undefined;

      // Optimized query for calendar - only necessary fields
      const hearings = await prisma.hearing.findMany({
        where: {
          Case: caseFilter,
          ...(dateFilter ? { hearingDate: dateFilter } : {}),
        },
        select: {
          id: true,
          caseId: true,
          hearingDate: true,
          hearingType: true,
          courtHall: true,
          status: true,
          closureNote: true,
          closedAt: true,
          Case: {
            select: {
              id: true,
              caseNumber: true,
              caseTitle: true,
              petitionerName: true,
              respondentName: true,
              courtName: true,
              status: true,
              assignments: {
                select: {
                  userId: true,
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          CalendarSync: {
            select: {
              id: true,
              googleEventId: true,
              syncStatus: true,
              lastSyncedAt: true,
            },
          },
        },
        orderBy: { hearingDate: 'asc' },
      });

      return NextResponse.json(hearings, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Full data for other views
    const hearings = await prisma.hearing.findMany({
      where: {
        Case: caseFilter,
      },
      include: {
        Case: {
          select: {
            id: true,
            caseNumber: true,
            caseTitle: true,
            petitionerName: true,
            respondentName: true,
            status: true,
            assignments: {
              select: {
                userId: true,
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        Reminder: true,
        CalendarSync: true,
      },
      orderBy: { hearingDate: 'asc' },
    });

    return NextResponse.json(hearings, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching hearings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new hearing
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

    const {
      caseId,
      hearingDate,
      hearingType,
      courtHall,
      notes,
    } = await request.json();

    if (!caseId || !hearingDate) {
      return NextResponse.json(
        { error: 'caseId and hearingDate are required' },
        { status: 400 }
      );
    }

    // Creating a hearing is a write — advocates must be assigned to the case.
    const caseRecord = await prisma.case.findFirst({
      where: {
        id: caseId,
        ...writeCaseFilter({ id: user.id, firmId: user.firmId, role: user.role }),
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Prevent scheduling hearings for closed cases
    if (caseRecord.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Cannot schedule hearings for a closed case' },
        { status: 403 }
      );
    }

    const hearing = await prisma.hearing.create({
      data: {
        caseId,
        hearingDate: new Date(hearingDate),
        hearingType: hearingType || 'ARGUMENTS',
        courtHall: courtHall || '',
        notes,
      },
      include: {
        Case: true,
        Reminder: true,
      },
    });

    // Create default reminder (1 day before)
    const reminderDate = new Date(hearingDate);
    reminderDate.setDate(reminderDate.getDate() - 1);

    await prisma.reminder.create({
      data: {
        hearingId: hearing.id,
        reminderType: 'ONE_DAY_BEFORE',
        reminderTime: reminderDate,
      },
    });

    // Auto-sync to Google Calendar if connected
    try {
      const googleConnected = await isGoogleCalendarConnected(user.id);
      if (googleConnected) {
        await createCalendarEvent(user.id, {
          hearingId: hearing.id,
          caseNumber: caseRecord.caseNumber,
          caseTitle: caseRecord.caseTitle,
          hearingDate: new Date(hearingDate),
          hearingType: hearingType || 'ARGUMENTS',
          courtHall,
          notes,
        });
        console.log('[Hearings] Auto-synced to Google Calendar:', hearing.id);
      }
    } catch (googleError) {
      console.error('[Hearings] Google Calendar sync failed:', googleError);
      // Don't fail the request if Google sync fails
    }

    // Log the hearing creation activity
    const hearingDateStr = new Date(hearingDate).toLocaleDateString();
    ActivityLogger.hearingCreated(user.id, user.firmId, hearing.id, caseRecord.caseNumber, hearingDateStr, request);

    // Generate hearing insights asynchronously
    try {
      const insights = await generateHearingInsights(
        caseRecord.caseTitle,
        hearingType || 'ARGUMENTS'
      );
      // Store insights in notes
      if (!notes || notes.length === 0) {
        await prisma.hearing.update({
          where: { id: hearing.id },
          data: { notes: insights },
        });
      }
    } catch (aiError) {
      console.error('Error generating hearing insights:', aiError);
    }

    return NextResponse.json(hearing, { status: 201 });
  } catch (error) {
    console.error('Error creating hearing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
