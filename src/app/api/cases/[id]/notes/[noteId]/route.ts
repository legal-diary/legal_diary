import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { writeCaseFilter } from '@/lib/access';

/**
 * Edit / delete a single case note.
 *
 *   PUT    — author only (createdById === user.id). Prisma's @updatedAt
 *            auto-bumps on every write, so the client can detect "edited"
 *            via updatedAt !== createdAt.
 *   DELETE — author OR ADMIN in the same firm. Hard delete.
 *
 * Both are writes, so the underlying case access is the write filter:
 * ADMIN firm-scoped, advocate assignment-scoped.
 */

async function resolveNoteAccess(
  request: NextRequest,
  caseId: string,
  noteId: string
): Promise<
  | {
      ok: true;
      user: { id: string; firmId: string; role: string };
      note: { id: string; createdById: string };
    }
  | { ok: false; response: NextResponse }
> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await verifyToken(token);
  if (!user || !user.firmId) {
    return { ok: false, response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) };
  }

  const caseRecord = await prisma.case.findFirst({
    where: {
      id: caseId,
      ...writeCaseFilter({ id: user.id, firmId: user.firmId, role: user.role }),
    },
    select: { id: true },
  });
  if (!caseRecord) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'You are not assigned to this case' },
        { status: 403 }
      ),
    };
  }

  const note = await prisma.caseNote.findFirst({
    where: { id: noteId, caseId },
    select: { id: true, createdById: true },
  });
  if (!note) {
    return { ok: false, response: NextResponse.json({ error: 'Note not found' }, { status: 404 }) };
  }

  return {
    ok: true,
    user: { id: user.id, firmId: user.firmId, role: user.role },
    note,
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: caseId, noteId } = await params;
    const access = await resolveNoteAccess(request, caseId, noteId);
    if (!access.ok) return access.response;

    // Only the author can edit their own note
    if (access.note.createdById !== access.user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own notes' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    const updated = await prisma.caseNote.update({
      where: { id: noteId },
      data: { content },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating case note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: caseId, noteId } = await params;
    const access = await resolveNoteAccess(request, caseId, noteId);
    if (!access.ok) return access.response;

    // Note deletion is destructive and admin-only — even authors cannot
    // retract their own notes. Advocates can edit a note to clarify or
    // correct it, but the row stays in the database for audit trail.
    if (access.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete notes' },
        { status: 403 }
      );
    }

    await prisma.caseNote.delete({ where: { id: noteId } });

    return NextResponse.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Error deleting case note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
