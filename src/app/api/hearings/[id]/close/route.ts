import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { ActivityLogger } from '@/lib/activityLog';

/**
 * POST /api/hearings/[id]/close
 * Close a hearing with a closure note, optionally schedule the next hearing.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: hearingId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { closureNote, nextHearing } = body;

    if (!closureNote || closureNote.trim().length === 0) {
      return NextResponse.json(
        { error: 'Closure note is required' },
        { status: 400 }
      );
    }

    // Fetch the hearing with case and assignments
    const hearing = await prisma.hearing.findUnique({
      where: { id: hearingId },
      include: {
        Case: {
          include: {
            assignments: { select: { userId: true } },
          },
        },
      },
    });

    if (!hearing) {
      return NextResponse.json({ error: 'Hearing not found' }, { status: 404 });
    }

    // Verify case belongs to user's firm
    if (hearing.Case.firmId !== user.firmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Authorization: admin can always close; advocate must be assigned to the case
    const isAdmin = user.role === 'ADMIN';
    if (!isAdmin) {
      const isAssigned = hearing.Case.assignments.some(a => a.userId === user.id);
      if (!isAssigned) {
        return NextResponse.json(
          { error: 'You are not assigned to this case' },
          { status: 403 }
        );
      }
    }

    // Validate hearing status - can only close UPCOMING or PENDING hearings
    if (hearing.status !== 'UPCOMING' && hearing.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot close a hearing with status "${hearing.status}". Only UPCOMING or PENDING hearings can be closed.` },
        { status: 400 }
      );
    }

    // Validate next hearing data if provided
    if (nextHearing) {
      if (!nextHearing.hearingDate || !nextHearing.courtHall) {
        return NextResponse.json(
          { error: 'Next hearing requires hearingDate and courtHall' },
          { status: 400 }
        );
      }

      // Prevent scheduling hearings for closed cases
      if (hearing.Case.status === 'CLOSED') {
        return NextResponse.json(
          { error: 'Cannot schedule hearings for a closed case' },
          { status: 403 }
        );
      }
    }

    // Execute closure in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Close the hearing
      const closedHearing = await tx.hearing.update({
        where: { id: hearingId },
        data: {
          status: 'CLOSED',
          closureNote: closureNote.trim(),
          closedById: user.id,
          closedAt: new Date(),
        },
        include: {
          Case: {
            select: {
              caseNumber: true,
              caseTitle: true,
            },
          },
          closedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      let newHearing = null;

      // 2. Optionally create the next hearing
      if (nextHearing) {
        newHearing = await tx.hearing.create({
          data: {
            caseId: hearing.caseId,
            hearingDate: new Date(nextHearing.hearingDate),
            hearingType: nextHearing.hearingType || 'ARGUMENTS',
            courtHall: nextHearing.courtHall,
            notes: nextHearing.notes || null,
          },
          include: {
            Case: {
              select: {
                caseNumber: true,
                caseTitle: true,
              },
            },
          },
        });

        // Create default reminder for next hearing (1 day before)
        const reminderDate = new Date(nextHearing.hearingDate);
        reminderDate.setDate(reminderDate.getDate() - 1);
        await tx.reminder.create({
          data: {
            hearingId: newHearing.id,
            reminderType: 'ONE_DAY_BEFORE',
            reminderTime: reminderDate,
          },
        });
      }

      return { closedHearing, newHearing };
    });

    // Log activity (non-blocking)
    const hearingDateStr = new Date(hearing.hearingDate).toLocaleDateString();
    ActivityLogger.hearingClosed(
      user.id,
      user.firmId,
      hearingId,
      result.closedHearing.Case.caseNumber,
      hearingDateStr,
      request
    );

    return NextResponse.json({
      message: 'Hearing closed successfully',
      closedHearing: result.closedHearing,
      newHearing: result.newHearing,
    });
  } catch (error) {
    console.error('Error closing hearing:', error);
    return NextResponse.json(
      { error: 'Failed to close hearing' },
      { status: 500 }
    );
  }
}
