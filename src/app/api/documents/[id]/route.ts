import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { deleteFile } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activityLog';

/**
 * DELETE /api/documents/[id]
 * Delete a document from both Supabase storage and database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Role-based document access verification
    const isAdmin = user.role === 'ADMIN';
    const document = await prisma.fileDocument.findFirst({
      where: {
        id: documentId,
        Case: {
          firmId: user.firmId,
          ...(isAdmin ? {} : { assignments: { some: { userId: user.id } } }),
        },
      },
      include: {
        Case: {
          select: { firmId: true, status: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Guard: Final Order documents cannot be deleted
    if (document.isFinalOrder) {
      return NextResponse.json(
        { error: 'Cannot delete a Final Order document' },
        { status: 403 }
      );
    }

    // Guard: Only admins can delete documents from closed cases
    if (document.Case.status === 'CLOSED' && !isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can delete documents from closed cases' },
        { status: 403 }
      );
    }

    // 1. Delete from Supabase storage first (frees up space)
    const storageDeleted = await deleteFile(document.fileUrl);
    if (!storageDeleted) {
      return NextResponse.json(
        { error: 'Failed to delete file from storage' },
        { status: 500 }
      );
    }

    // 2. Delete database record
    await prisma.fileDocument.delete({
      where: { id: documentId },
    });

    // 3. Log the deletion activity
    ActivityLogger.documentDeleted(user.id, user.firmId, documentId, document.fileName, request);

    return NextResponse.json({ message: 'Document deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
