import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { generateHearingInsights } from '@/lib/openai';

// GET hearings for user's firm
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

    // Check if calendar mode is requested (optimized for calendar view)
    const url = new URL(request.url);
    const calendarMode = url.searchParams.get('calendar') === 'true';

    if (calendarMode) {
      // Optimized query for calendar - only necessary fields
      const hearings = await prisma.hearing.findMany({
        where: {
          case: { firmId: user.firmId },
        },
        select: {
          id: true,
          caseId: true,
          hearingDate: true,
          hearingTime: true,
          hearingType: true,
          courtRoom: true,
          case: {
            select: {
              caseNumber: true,
              caseTitle: true,
              clientName: true,
            },
          },
        },
        orderBy: { hearingDate: 'asc' },
      });

      const response = NextResponse.json(hearings);
      response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
      return response;
    }

    // Full data for other views
    const hearings = await prisma.hearing.findMany({
      where: {
        case: { firmId: user.firmId },
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            caseTitle: true,
            clientName: true,
            status: true,
          },
        },
        reminders: true,
      },
      orderBy: { hearingDate: 'asc' },
    });

    return NextResponse.json(hearings);
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
      hearingTime,
      hearingType,
      courtRoom,
      notes,
    } = await request.json();

    // Validation
    if (!caseId || !hearingDate) {
      return NextResponse.json(
        { error: 'caseId and hearingDate are required' },
        { status: 400 }
      );
    }

    // Verify case ownership
    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, firmId: user.firmId },
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
        case: true,
        reminders: true,
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
