import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import dayjs from 'dayjs';

// Optimized dashboard endpoint - returns all data in ONE call
// with minimal fields for maximum performance
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

    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();

    // Execute all queries in parallel for maximum speed
    const [todaysHearings, upcomingHearings, casesMinimal] = await Promise.all([
      // Today's hearings with only necessary case fields
      prisma.hearing.findMany({
        where: {
          hearingDate: {
            gte: todayStart,
            lte: todayEnd,
          },
          case: {
            firmId: user.firmId,
          },
        },
        select: {
          id: true,
          hearingDate: true,
          hearingTime: true,
          hearingType: true,
          courtRoom: true,
          notes: true,
          status: true,
          case: {
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
          case: {
            firmId: user.firmId,
          },
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
          case: {
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

      // Minimal case data for dropdown (only active cases)
      prisma.case.findMany({
        where: {
          firmId: user.firmId,
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
    const caseIds = [...new Set(todaysHearings.map(h => h.case.id))];

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
      const caseHearings = hearingsByCase.get(hearing.case.id) || [];
      const currentIndex = caseHearings.findIndex((h) => h.id === hearing.id);

      const previousHearing = currentIndex > 0 ? caseHearings[currentIndex - 1] : null;
      const nextHearing = currentIndex < caseHearings.length - 1 ? caseHearings[currentIndex + 1] : null;

      return {
        id: hearing.id,
        caseId: hearing.case.id,
        caseNumber: hearing.case.caseNumber,
        partyName: hearing.case.clientName,
        caseTitle: hearing.case.caseTitle,
        stage: hearing.case.status,
        courtName: hearing.case.courtName,
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

    // Add cache headers for performance
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');

    return response;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
