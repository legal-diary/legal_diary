import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || !user.firmId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: judgmentId } = await params;

  const judgment = await prisma.judgment.findFirst({
    where: { id: judgmentId, firmId: user.firmId },
    select: { id: true },
  });
  if (!judgment) return NextResponse.json({ error: 'Judgment not found' }, { status: 404 });

  const threads = await prisma.judgmentThread.findMany({
    where: { judgmentId },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(threads, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || !user.firmId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can post threads' }, { status: 403 });
  }

  const { id: judgmentId } = await params;

  const judgment = await prisma.judgment.findFirst({
    where: { id: judgmentId, firmId: user.firmId },
    select: { id: true },
  });
  if (!judgment) return NextResponse.json({ error: 'Judgment not found' }, { status: 404 });

  const { content } = await request.json();
  const stripped = content?.replace(/<[^>]*>/g, '').trim();
  if (!content || !stripped) {
    return NextResponse.json({ error: 'Thread content is required' }, { status: 400 });
  }

  const thread = await prisma.judgmentThread.create({
    data: { judgmentId, content, createdById: user.id },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(thread, { status: 201 });
}
