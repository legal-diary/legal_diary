import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { readCaseFilter, writeCaseFilter } from '@/lib/access';

/**
 * Case-level notes feed.
 *
 * Read (GET) is firm-wide for everyone — anyone in the firm can see notes on
 * any case. Write (POST) is assignment-gated for advocates; admins can post on
 * any case in the firm. CLOSED cases stay writable here (notes are the one
 * post-closure surface for appeals, execution, etc.).
 */

type AccessUser = { id: string; firmId: string; role: string };
type AccessOk = { ok: true; user: AccessUser };
type AccessFail = { ok: false; response: NextResponse };

async function resolveCaseAccess(
  request: NextRequest,
  caseId: string,
  mode: 'read' | 'write'
): Promise<AccessOk | AccessFail> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await verifyToken(token);
  if (!user || !user.firmId) {
    return { ok: false, response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) };
  }

  const filter =
    mode === 'read'
      ? readCaseFilter({ firmId: user.firmId })
      : writeCaseFilter({ id: user.id, firmId: user.firmId, role: user.role });

  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...filter },
    select: { id: true },
  });
  if (!caseRecord) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: mode === 'write' ? 'You are not assigned to this case' : 'Case not found' },
        { status: mode === 'write' ? 403 : 404 }
      ),
    };
  }

  return { ok: true, user: { id: user.id, firmId: user.firmId, role: user.role } };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const access = await resolveCaseAccess(request, caseId, 'read');
    if (!access.ok) return access.response;

    const notes = await prisma.caseNote.findMany({
      where: { caseId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching case notes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const access = await resolveCaseAccess(request, caseId, 'write');
    if (!access.ok) return access.response;

    const body = await request.json();
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    const note = await prisma.caseNote.create({
      data: {
        caseId,
        content,
        createdById: access.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Error creating case note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { resolveCaseAccess };
