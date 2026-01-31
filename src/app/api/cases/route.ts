import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { ActivityLogger } from '@/lib/activityLog';

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
    console.log('[POST /api/cases] Authorization header:', authHeader?.substring(0, 30));

    const token = authHeader?.replace('Bearer ', '');
    console.log('[POST /api/cases] Extracted token (first 20 chars):', token?.substring(0, 20));
    console.log('[POST /api/cases] Token length:', token?.length);

    if (!token) {
      console.log('[POST /api/cases] No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    console.log('[POST /api/cases] User after verification:', user?.email);

    if (!user || !user.firmId) {
      console.log('[POST /api/cases] User verification failed or no firmId');
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

    // Log the case creation activity
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
