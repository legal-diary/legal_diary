import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const IST = 'Asia/Kolkata';

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

    // Use IST explicitly so Vercel (UTC) and local (IST) produce the same boundaries
    const todayStart = dayjs().tz(IST).startOf('day').toDate();
    const todayEnd = dayjs().tz(IST).endOf('day').toDate();

    // Role-based filtering:
    // - ADMIN sees data from all cases in their firm
    // - ADVOCATE sees data only from cases they're assigned to
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = isAdmin
      ? { firmId: user.firmId }
      : { firmId: user.firmId, assignments: { some: { userId: user.id } } };

    // Execute all queries in parallel for maximum speed
    const [todaysHearings, upcomingHearings, casesMinimal, pendingClosureHearings, closedHearings] = await Promise.all([
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
          hearingType: true,
          courtHall: true,
          notes: true,
          status: true,
          Case: {
            select: {
              id: true,
              caseNumber: true,
              caseTitle: true,
              petitionerName: true,
              respondentName: true,
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
          hearingType: true,
          courtHall: true,
          notes: true,
          status: true,
          Case: {
            select: {
              caseNumber: true,
              caseTitle: true,
              petitionerName: true,
              respondentName: true,
            },
          },
        },
        orderBy: { hearingDate: 'asc' },
        take: 15,
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
          petitionerName: true,
          respondentName: true,
        },
        orderBy: { caseNumber: 'asc' },
      }),

      // Pending closures: past hearings still UPCOMING (deadline passed) + explicitly PENDING
      prisma.hearing.findMany({
        where: {
          OR: [
            {
              status: 'UPCOMING',
              hearingDate: { lt: todayStart }, // hearing day has fully passed
            },
            {
              status: 'PENDING',
            },
          ],
          Case: caseFilter,
        },
        select: {
          id: true,
          caseId: true,
          hearingDate: true,
          hearingType: true,
          courtHall: true,
          notes: true,
          status: true,
          Case: {
            select: {
              id: true,
              caseNumber: true,
              caseTitle: true,
              petitionerName: true,
              respondentName: true,
              courtName: true,
            },
          },
        },
        orderBy: { hearingDate: 'asc' },
      }),

      // Closed hearings where hearingDate is within last 30 days
      prisma.hearing.findMany({
        where: {
          status: 'CLOSED',
          hearingDate: { gte: dayjs().tz(IST).subtract(30, 'day').startOf('day').toDate() },
          Case: caseFilter,
        },
        select: {
          id: true,
          caseId: true,
          hearingDate: true,
          closedAt: true,
          closureNote: true,
          closedBy: {
            select: { name: true },
          },
          Case: {
            select: {
              caseNumber: true,
              caseTitle: true,
              petitionerName: true,
              respondentName: true,
            },
          },
        },
        orderBy: { hearingDate: 'desc' },
        take: 50,
      }),
    ]);

    // Lazy status update: mark overdue UPCOMING hearings as PENDING in the database
    const overdueIds = pendingClosureHearings
      .filter(h => h.status === 'UPCOMING')
      .map(h => h.id);
    if (overdueIds.length > 0) {
      await prisma.hearing.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: 'PENDING' },
      });
    }

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
        partyName: hearing.Case.caseTitle,
        petitionerName: hearing.Case.petitionerName,
        respondentName: hearing.Case.respondentName,
        caseTitle: hearing.Case.caseTitle,
        stage: hearing.Case.status,
        courtName: hearing.Case.courtName,
        hearingType: hearing.hearingType,
        courtHall: hearing.courtHall,
        notes: hearing.notes,
        previousDate: previousHearing?.hearingDate || null,
        currentDate: hearing.hearingDate,
        nextDate: nextHearing?.hearingDate || null,
        status: hearing.status,
      };
    });

    // Filter upcoming to exclude today and limit to 10
    const filteredUpcoming = upcomingHearings
      .filter(h => !dayjs(h.hearingDate).isSame(dayjs(), 'day') ||
                   !todaysHearings.some(th => th.id === h.id))
      .slice(0, 10);

    // Process pending closures — normalize status to PENDING for display
    const processedPendingClosures = pendingClosureHearings.map(h => ({
      ...h,
      status: 'PENDING' as const,
    }));

    // Build response payload
    const payload = {
      date: dayjs().format('YYYY-MM-DD'),
      todayHearings: {
        hearings: processedTodayHearings,
        totalCount: processedTodayHearings.length,
      },
      upcomingHearings: filteredUpcoming,
      cases: casesMinimal,
      pendingClosures: processedPendingClosures,
      totalPendingCount: processedPendingClosures.length,
      closedHearings,
    };

    // Generate ETag from response content for conditional requests
    // Using a simple hash of the stringified payload
    const payloadString = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const etag = `"${hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')}"`;

    // Check If-None-Match header — return 304 if data unchanged
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
        },
      });
    }

    // Return full response with ETag
    const response = NextResponse.json(payload);
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');

    return response;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
