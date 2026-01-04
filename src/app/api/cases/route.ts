import { NextRequest, NextResponse } from 'next/server';
import { CaseStatus, Prisma, Priority } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { analyzeCaseWithAI } from '@/lib/openai';

// GET all cases for a firm (role-based filtering)
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
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10), 1), 100);
    const skip = (page - 1) * limit;
    const search = url.searchParams.get('search');
    const statusParam = url.searchParams.get('status');
    const priorityParam = url.searchParams.get('priority');
    const status = statusParam && Object.values(CaseStatus).includes(statusParam as CaseStatus)
      ? (statusParam as CaseStatus)
      : undefined;
    const priority = priorityParam && Object.values(Priority).includes(priorityParam as Priority)
      ? (priorityParam as Priority)
      : undefined;

    const listFilter = {
      ...caseFilter,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(search
        ? {
            OR: [
              { caseNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { caseTitle: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { clientName: { contains: search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    if (minimal) {
      // Optimized query for list view - only essential fields
      const [cases, total] = await Promise.all([
        prisma.case.findMany({
          where: listFilter,
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
          skip,
          take: limit,
        }),
        prisma.case.count({ where: listFilter }),
      ]);

      return NextResponse.json({ data: cases, page, limit, total }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Full data for detail views
    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where: listFilter,
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
        skip,
        take: limit,
      }),
      prisma.case.count({ where: listFilter }),
    ]);

    return NextResponse.json({ data: cases, page, limit, total }, {
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
      clientName,
      clientEmail,
      clientPhone,
      caseTitle,
      description,
      opponents,
      courtName,
      judgeAssigned,
      priority,
    } = await request.json();

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
      console.error('Error generating AI summary:', aiError);
      // Don't fail the case creation if AI fails
    }

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
