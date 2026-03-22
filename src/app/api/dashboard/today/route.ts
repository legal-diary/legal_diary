import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const IST = 'Asia/Kolkata';

// GET today's hearings for the legal referencer dashboard (role-based filtering)
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

    // Role-based filtering:
    // - ADMIN sees hearings from all cases in their firm
    // - ADVOCATE sees hearings only from cases they're assigned to
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = isAdmin
      ? { firmId: user.firmId }
      : { firmId: user.firmId, assignments: { some: { userId: user.id } } };

    // Use IST explicitly so Vercel (UTC) and local (IST) produce the same boundaries
    const todayStart = dayjs().tz(IST).startOf('day').toDate();
    const todayEnd = dayjs().tz(IST).endOf('day').toDate();

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
            caseTitle: true,
            petitionerName: true,
            respondentName: true,
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
      };
    });

    return NextResponse.json({
      date: dayjs().format('YYYY-MM-DD'),
      hearings: processedHearings,
      totalCount: processedHearings.length,
    });
  } catch (error) {
    console.error('Error fetching today\'s hearings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
