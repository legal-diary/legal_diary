import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || !user.firmId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: judgmentId, threadId } = await params;

  const thread = await prisma.judgmentThread.findFirst({
    where: { id: threadId, judgmentId },
    include: { judgment: { select: { firmId: true } } },
  });

  if (!thread || thread.judgment.firmId !== user.firmId) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  if (thread.createdById !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized to edit this thread' }, { status: 403 });
  }

  const { content } = await request.json();
  const stripped = content?.replace(/<[^>]*>/g, '').trim();
  if (!content || !stripped) {
    return NextResponse.json({ error: 'Thread content is required' }, { status: 400 });
  }

  const updated = await prisma.judgmentThread.update({
    where: { id: threadId },
    data: { content },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || !user.firmId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can delete threads' }, { status: 403 });
  }

  const { id: judgmentId, threadId } = await params;

  const thread = await prisma.judgmentThread.findFirst({
    where: { id: threadId, judgmentId },
    include: { judgment: { select: { firmId: true } } },
  });

  if (!thread || thread.judgment.firmId !== user.firmId) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  await prisma.judgmentThread.delete({ where: { id: threadId } });

  return NextResponse.json({ message: 'Thread deleted' });
}
