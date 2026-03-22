import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { deleteFile, deleteFiles } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activityLog';

const ALLOWED_UPDATE_FIELDS = [
  'petitionerName',
  'petitionerPhone',
  'respondentName',
  'respondentPhone',
  'clientParty',
  'vakalat',
  'description',
  'status',
  'priority',
  'courtTypeId',
  'courtHall',
  'courtName',
  'judgeAssigned',
] as const;

// GET a single case (role-based access)
export async function GET(
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

    // Role-based access:
    // - ADMIN can access any case in their firm
    // - ADVOCATE can only access cases they're assigned to
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = {
      id: caseId,
      firmId: user.firmId,
      ...(isAdmin ? {} : { assignments: { some: { userId: user.id } } }),
    };

    const caseRecord = await prisma.case.findFirst({
      where: caseFilter,
      include: {
        User: true,
        Hearing: true,
        FileDocument: true,
        AISummary: true,
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

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json(caseRecord);
  } catch (error) {
    console.error('Error fetching case:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// UPDATE a case (role-based access)
export async function PUT(
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

    // Role-based access:
    // - ADMIN can update any case in their firm
    // - ADVOCATE can only update cases they're assigned to
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = {
      id: caseId,
      firmId: user.firmId,
      ...(isAdmin ? {} : { assignments: { some: { userId: user.id } } }),
    };

    const caseRecord = await prisma.case.findFirst({
      where: caseFilter,
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Prevent editing closed cases
    if (caseRecord.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Cannot edit a closed case. Re-open it first.' },
        { status: 403 }
      );
    }

    const updates = await request.json();

    // Extract document IDs to delete (not part of case update)
    const documentsToDelete = updates.documentsToDelete || [];
    delete updates.documentsToDelete;

    // Validate and filter updates (whitelist approach)
    const validatedUpdates: Record<string, any> = {};

    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (field in updates) {
        validatedUpdates[field] = updates[field];
      }
    }

    // Delete specified documents
    if (documentsToDelete.length > 0) {
      const docsToDelete = await prisma.fileDocument.findMany({
        where: {
          id: { in: documentsToDelete },
          caseId: caseId,
        },
      });

      // Delete files from Supabase Storage
      const storagePaths = docsToDelete.map((doc) => doc.fileUrl);
      if (storagePaths.length > 0) {
        const deletedCount = await deleteFiles(storagePaths);
        console.log(`Deleted ${deletedCount} files from Supabase Storage`);
      }

      await prisma.fileDocument.deleteMany({
        where: {
          id: { in: documentsToDelete },
          caseId: caseId,
        },
      });
    }

    // Additional validation for specific fields
    if ('status' in validatedUpdates) {
      // CLOSED status must go through the dedicated /close endpoint
      if (validatedUpdates.status === 'CLOSED') {
        return NextResponse.json(
          { error: 'Use the Close Case feature to close a case (requires final order document)' },
          { status: 400 }
        );
      }
      const validStatuses = ['ACTIVE', 'PENDING_JUDGMENT', 'CONCLUDED', 'APPEAL', 'DISMISSED'];
      if (!validStatuses.includes(validatedUpdates.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if ('priority' in validatedUpdates) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (!validPriorities.includes(validatedUpdates.priority)) {
        return NextResponse.json(
          { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (Object.keys(validatedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    // Re-compute caseTitle if party names changed
    if ('petitionerName' in validatedUpdates || 'respondentName' in validatedUpdates) {
      const pet = validatedUpdates.petitionerName || caseRecord.petitionerName;
      const res = validatedUpdates.respondentName || caseRecord.respondentName;
      validatedUpdates.caseTitle = `${pet} vs. ${res}`;
    }

    // Resolve courtName from courtTypeId
    if ('courtTypeId' in validatedUpdates && validatedUpdates.courtTypeId) {
      const courtType = await prisma.courtType.findUnique({ where: { id: validatedUpdates.courtTypeId } });
      if (courtType) validatedUpdates.courtName = courtType.name;
    }

    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: validatedUpdates,
      include: {
        User: true,
        Hearing: true,
        FileDocument: true,
        AISummary: true,
        CourtType: true,
      },
    });

    // Log the case update activity
    ActivityLogger.caseUpdated(user.id, user.firmId, caseId, caseRecord.caseNumber, validatedUpdates, request);

    return NextResponse.json(updatedCase);
  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE a case (ADMIN only)
export async function DELETE(
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

    // Only ADMIN can delete cases
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete cases' },
        { status: 403 }
      );
    }

    // Verify case belongs to firm and get associated documents
    const caseRecord = await prisma.case.findFirst({
      where: {
        id: caseId,
        firmId: user.firmId,
      },
      include: {
        FileDocument: true,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Delete files from Supabase Storage before deleting the case
    if (caseRecord.FileDocument.length > 0) {
      const storagePaths = caseRecord.FileDocument.map((doc) => doc.fileUrl);
      const deletedCount = await deleteFiles(storagePaths);
      console.log(`Deleted ${deletedCount} files from Supabase Storage for case ${caseId}`);
    }

    // Delete the case (cascading deletes will be handled by Prisma)
    await prisma.case.delete({
      where: { id: caseId },
    });

    // Log the case deletion activity
    ActivityLogger.caseDeleted(user.id, user.firmId, caseId, caseRecord.caseNumber, request);

    return NextResponse.json({ message: 'Case deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting case:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
