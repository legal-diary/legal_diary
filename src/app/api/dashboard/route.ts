import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';
import dayjs from 'dayjs';

// Optimized dashboard endpoint - returns all data in ONE call
// with minimal fields for maximum performance
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

    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();

    // Role-based filtering:
    // - ADMIN sees data from all cases in their firm
    // - ADVOCATE sees data only from cases they're assigned to
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = isAdmin
      ? { firmId: user.firmId }
      : { firmId: user.firmId, assignments: { some: { userId: user.id } } };

    // Execute all queries in parallel for maximum speed
    const [todaysHearings, upcomingHearings, casesMinimal] = await Promise.all([
      // Today's hearings with only necessary case fields
      prisma.hearing.findMany({
        where: {
          hearingDate: {
            gte: todayStart,
            lte: todayEnd,
          },
          Case: caseFilter,
        },
        select: {
          id: true,
          hearingDate: true,
          hearingTime: true,
          hearingType: true,
          courtRoom: true,
          notes: true,
          status: true,
          Case: {
            select: {
              id: true,
              caseNumber: true,
              clientName: true,
              caseTitle: true,
              status: true,
              courtName: true,
            },
          },
        },
        orderBy: { hearingDate: 'asc' },
      }),

      // Upcoming hearings (next 10, excluding today for this query)
      prisma.hearing.findMany({
        where: {
          hearingDate: {
            gte: todayStart,
          },
          Case: caseFilter,
        },
        select: {
          id: true,
          caseId: true,
          hearingDate: true,
          hearingTime: true,
          hearingType: true,
          courtRoom: true,
          notes: true,
          status: true,
          Case: {
            select: {
              caseNumber: true,
              caseTitle: true,
              clientName: true,
            },
          },
        },
        orderBy: { hearingDate: 'asc' },
        take: 15, // Take a few extra to account for today's items
      }),

      // Minimal case data for dropdown (only active cases user has access to)
      prisma.case.findMany({
        where: {
          ...caseFilter,
          status: {
            in: ['ACTIVE', 'PENDING_JUDGMENT', 'APPEAL'],
          },
        },
        select: {
          id: true,
          caseNumber: true,
          caseTitle: true,
          clientName: true,
        },
        orderBy: { caseNumber: 'asc' },
      }),
    ]);

    // Get previous and next dates for today's hearings
    // Use a single query to get all related hearing dates
    const caseIds = [...new Set(todaysHearings.map(h => h.Case.id))];

    const relatedHearings = caseIds.length > 0
      ? await prisma.hearing.findMany({
          where: {
            caseId: { in: caseIds },
          },
          select: {
            id: true,
            caseId: true,
            hearingDate: true,
          },
          orderBy: { hearingDate: 'asc' },
        })
      : [];

    // Group hearings by case for efficient lookup
    const hearingsByCase = new Map<string, { id: string; hearingDate: Date }[]>();
    relatedHearings.forEach(h => {
      const existing = hearingsByCase.get(h.caseId) || [];
      existing.push({ id: h.id, hearingDate: h.hearingDate });
      hearingsByCase.set(h.caseId, existing);
    });

    // Process today's hearings with prev/next dates
    const processedTodayHearings = todaysHearings.map((hearing) => {
      const caseHearings = hearingsByCase.get(hearing.Case.id) || [];
      const currentIndex = caseHearings.findIndex((h) => h.id === hearing.id);

      const previousHearing = currentIndex > 0 ? caseHearings[currentIndex - 1] : null;
      const nextHearing = currentIndex < caseHearings.length - 1 ? caseHearings[currentIndex + 1] : null;

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

    // Filter upcoming to exclude today and limit to 10
    const filteredUpcoming = upcomingHearings
      .filter(h => !dayjs(h.hearingDate).isSame(dayjs(), 'day') ||
                   !todaysHearings.some(th => th.id === h.id))
      .slice(0, 10);

    // Return all data in a single response
    const response = NextResponse.json({
      date: dayjs().format('YYYY-MM-DD'),
      todayHearings: {
        hearings: processedTodayHearings,
        totalCount: processedTodayHearings.length,
      },
      upcomingHearings: filteredUpcoming,
      cases: casesMinimal,
    });

    response.headers.set('Cache-Control', 'no-store');

    return response;
  } catch (error) {
    console.error('Error fetching dashboard data');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
