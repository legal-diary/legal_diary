import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { ActivityLogger } from '@/lib/activityLog';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMIN can re-open cases
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can re-open cases' },
        { status: 403 }
      );
    }

    // Fetch case and verify firm ownership
    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, firmId: user.firmId },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (caseRecord.status !== 'CLOSED') {
      return NextResponse.json(
        { error: 'Only closed cases can be re-opened' },
        { status: 400 }
      );
    }

    // Re-open the case
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        status: 'ACTIVE',
        closedAt: null,
        closedById: null,
        closureReason: null,
      },
      include: {
        FileDocument: true,
        Hearing: true,
        AISummary: true,
        assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    // Log activity (non-blocking)
    ActivityLogger.caseReopened(user.id, user.firmId, caseId, caseRecord.caseNumber, request);

    return NextResponse.json({
      message: 'Case re-opened successfully',
      case: updatedCase,
    });
  } catch (error) {
    console.error('Error re-opening case:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
