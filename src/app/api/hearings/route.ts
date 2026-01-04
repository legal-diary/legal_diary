import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';
import { generateHearingInsights } from '@/lib/openai';
import { createCalendarEvent, isGoogleCalendarConnected } from '@/lib/googleCalendar';
import { checkRateLimit } from '@/lib/rateLimit';

// GET hearings for user's firm (role-based filtering)
export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Role-based filtering:
    // - ADMIN sees hearings from all cases in their firm
    // - ADVOCATE sees hearings only from cases they're assigned to
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = isAdmin
      ? { firmId: user.firmId }
      : { firmId: user.firmId, assignments: { some: { userId: user.id } } };

    // Check if calendar mode is requested (optimized for calendar view)
    const url = new URL(request.url);
    const calendarMode = url.searchParams.get('calendar') === 'true';

    if (calendarMode) {
      // Optimized query for calendar - only necessary fields
      const hearings = await prisma.hearing.findMany({
        where: {
          Case: caseFilter,
        },
        select: {
          id: true,
          caseId: true,
          hearingDate: true,
          hearingTime: true,
          hearingType: true,
          courtRoom: true,
          Case: {
            select: {
              caseNumber: true,
              caseTitle: true,
              clientName: true,
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
            clientName: true,
            status: true,
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
    console.error('Error fetching hearings');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new hearing
export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const {
      caseId,
      hearingDate,
      hearingTime,
      hearingType,
      courtRoom,
      notes,
    } = body;

    // Validation
    if (!caseId || !hearingDate) {
      return NextResponse.json(
        { error: 'caseId and hearingDate are required' },
        { status: 400 }
      );
    }

    // Role-based case access verification
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = {
      id: caseId,
      firmId: user.firmId,
      ...(isAdmin ? {} : { assignments: { some: { userId: user.id } } }),
    };

    const caseRecord = await prisma.case.findFirst({
      where: caseFilter,
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Create hearing
    const hearing = await prisma.hearing.create({
      data: {
        caseId,
        hearingDate: new Date(hearingDate),
        hearingTime,
        hearingType: hearingType || 'ARGUMENTS',
        courtRoom,
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
          clientName: caseRecord.clientName,
          hearingDate: new Date(hearingDate),
          hearingTime,
          hearingType: hearingType || 'ARGUMENTS',
          courtRoom,
          notes,
        });
        console.log('[Hearings] Auto-synced to Google Calendar');
      }
    } catch (googleError) {
      console.error('[Hearings] Google Calendar sync failed');
      // Don't fail the request if Google sync fails
    }

    // Generate hearing insights asynchronously
    try {
      const aiRateLimit = checkRateLimit(`ai-hearing:${user.id}`, 10, 10 * 60 * 1000);
      if (aiRateLimit.allowed) {
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
      }
    } catch (aiError) {
      console.error('Error generating hearing insights');
    }

    return NextResponse.json(hearing, { status: 201 });
  } catch (error) {
    console.error('Error creating hearing');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
