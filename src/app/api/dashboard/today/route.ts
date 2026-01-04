import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';
import dayjs from 'dayjs';

// GET today's hearings for the legal referencer dashboard (role-based filtering)
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

    // Get today's date range (start and end of day)
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();

    // Fetch today's hearings with case details
    const todaysHearings = await prisma.hearing.findMany({
      where: {
        hearingDate: {
          gte: todayStart,
          lte: todayEnd,
        },
        Case: caseFilter,
      },
      include: {
        Case: {
          select: {
            id: true,
            caseNumber: true,
            clientName: true,
            caseTitle: true,
            status: true,
            courtName: true,
            Hearing: {
              orderBy: { hearingDate: 'asc' },
              select: {
                id: true,
                hearingDate: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { hearingDate: 'asc' },
    });

    // Process hearings to add previous and next dates
    const processedHearings = todaysHearings.map((hearing) => {
      const allHearings = hearing.Case.Hearing;
      const currentIndex = allHearings.findIndex((h) => h.id === hearing.id);

      // Find previous hearing (before today's hearing)
      const previousHearing = currentIndex > 0 ? allHearings[currentIndex - 1] : null;

      // Find next hearing (after today's hearing)
      const nextHearing = currentIndex < allHearings.length - 1 ? allHearings[currentIndex + 1] : null;

      return {
        id: hearing.id,
        caseId: hearing.Case.id,
        caseNumber: hearing.Case.caseNumber,
        partyName: hearing.Case.clientName,
        caseTitle: hearing.Case.caseTitle,
        stage: hearing.Case.status,
        courtName: hearing.Case.courtName,
        hearingType: hearing.hearingType,
        courtRoom: hearing.courtRoom,
        notes: hearing.notes,
        previousDate: previousHearing?.hearingDate || null,
        currentDate: hearing.hearingDate,
        nextDate: nextHearing?.hearingDate || null,
      };
    });

    return NextResponse.json({
      date: dayjs().format('YYYY-MM-DD'),
      hearings: processedHearings,
      totalCount: processedHearings.length,
    });
  } catch (error) {
    console.error('Error fetching today\'s hearings');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
