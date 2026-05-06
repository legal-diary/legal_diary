import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { readCaseFilter, writeCaseFilter } from '@/lib/access';
import { ActivityLogger } from '@/lib/activityLog';

// GET all cases — firm-wide read; opt into "my cases" via ?assignedToMe=true
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

    const url = new URL(request.url);
    const assignedToMe = url.searchParams.get('assignedToMe') === 'true';
    const minimal = url.searchParams.get('minimal') === 'true';

    // Read is firm-wide by default. ?assignedToMe=true narrows to assignments
    // (works for any role, so admins can also use the toggle).
    const caseFilter = assignedToMe
      ? writeCaseFilter({ id: user.id, firmId: user.firmId, role: 'ADVOCATE' })
      : readCaseFilter({ firmId: user.firmId });

    if (minimal) {
      const cases = await prisma.case.findMany({
        where: caseFilter,
        select: {
          id: true,
          caseNumber: true,
          caseTitle: true,
          petitionerName: true,
          respondentName: true,
          status: true,
          priority: true,
          courtName: true,
          courtTypeId: true,
          createdAt: true,
          // Just the userIds — enough for client-side "my cases" filtering
          // without sending full advocate records on every list fetch.
          assignments: {
            select: { userId: true },
          },
          _count: {
            select: { Hearing: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(cases, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Full data for detail views
    const cases = await prisma.case.findMany({
      where: caseFilter,
      include: {
        User: {
          select: { id: true, name: true, email: true },
        },
        Hearing: {
          orderBy: { hearingDate: 'desc' },
          take: 10,
        },
        FileDocument: true,
        AISummary: true,
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(cases, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new case
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
      caseNumber,
      petitionerName,
      petitionerPhone,
      respondentName,
      respondentPhone,
      clientParty,
      vakalat,
      description,
      tasks,
      courtTypeId,
      courtHall,
      judgeAssigned,
      priority,
    } = await request.json();

    if (!caseNumber || !petitionerName || !respondentName || !description || !tasks?.trim()) {
      return NextResponse.json(
        { error: 'caseNumber, petitionerName, respondentName, description, and tasks are required' },
        { status: 400 }
      );
    }

    const party = clientParty || 'PETITIONER';
    if (party === 'PETITIONER' && !petitionerPhone) {
      return NextResponse.json({ error: 'Petitioner phone is required when petitioner is the client' }, { status: 400 });
    }
    if (party === 'RESPONDENT' && !respondentPhone) {
      return NextResponse.json({ error: 'Respondent phone is required when respondent is the client' }, { status: 400 });
    }

    const caseTitle = `${petitionerName} vs. ${respondentName}`;

    // Resolve courtName from courtTypeId for display compatibility
    let courtName: string | null = null;
    if (courtTypeId) {
      const courtType = await prisma.courtType.findUnique({ where: { id: courtTypeId } });
      if (courtType) courtName = courtType.name;
    }

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        caseTitle,
        petitionerName,
        petitionerPhone,
        respondentName,
        respondentPhone,
        clientParty: clientParty || 'PETITIONER',
        vakalat,
        description,
        tasks: tasks.trim(),
        courtTypeId,
        courtName,
        courtHall,
        judgeAssigned,
        priority: priority || 'MEDIUM',
        createdById: user.id,
        firmId: user.firmId,
        assignments: {
          create: {
            userId: user.id,
          },
        },
      },
      include: {
        User: true,
        Hearing: true,
        FileDocument: true,
        CourtType: true,
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    ActivityLogger.caseCreated(user.id, user.firmId, newCase.id, caseNumber, request);

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
