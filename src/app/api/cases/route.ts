import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';
import { checkRateLimit } from '@/lib/rateLimit';
import { analyzeCaseWithAI } from '@/lib/openai';

// GET all cases for a firm (role-based filtering)
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

    // Role-based case filtering:
    // - ADMIN sees all cases in their firm
    // - ADVOCATE sees only cases they're assigned to
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = isAdmin
      ? { firmId: user.firmId }
      : { firmId: user.firmId, assignments: { some: { userId: user.id } } };

    // Check if minimal data is requested (for list views)
    const url = new URL(request.url);
    const minimal = url.searchParams.get('minimal') === 'true';

    if (minimal) {
      // Optimized query for list view - only essential fields
      const cases = await prisma.case.findMany({
        where: caseFilter,
        select: {
          id: true,
          caseNumber: true,
          caseTitle: true,
          clientName: true,
          status: true,
          priority: true,
          courtName: true,
          createdAt: true,
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
    console.error('Error fetching cases');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new case
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

    const rateLimit = checkRateLimit(`cases-create:${user.id}`, 20, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many case creation requests. Please try again later.', retryAfter: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const {
      caseNumber,
      clientName,
      clientEmail,
      clientPhone,
      caseTitle,
      description,
      opponents,
      courtName,
      judgeAssigned,
      priority,
    } = body;

    // Validation
    if (!caseNumber || !clientName || !caseTitle) {
      return NextResponse.json(
        { error: 'caseNumber, clientName, and caseTitle are required' },
        { status: 400 }
      );
    }

    // Create case with auto-assignment to creator
    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        clientName,
        clientEmail,
        clientPhone,
        caseTitle,
        description,
        opponents,
        courtName,
        judgeAssigned,
        priority: priority || 'MEDIUM',
        createdById: user.id,
        firmId: user.firmId,
        // Auto-assign the creator to the case
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
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    // Generate AI summary asynchronously
    try {
      const analysis = await analyzeCaseWithAI({
        caseTitle,
        caseDescription: description || '',
      });

      await prisma.aISummary.create({
        data: {
          caseId: newCase.id,
          summary: analysis.summary,
          keyPoints: JSON.stringify(analysis.keyPoints),
          insights: analysis.insights,
        },
      });
    } catch (aiError) {
      console.error('Error generating AI summary');
      // Don't fail the case creation if AI fails
    }

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error('Error creating case');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
