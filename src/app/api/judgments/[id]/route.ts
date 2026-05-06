import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { deleteFiles } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await verifyToken(token);
  if (!user || !user.firmId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const judgment = await prisma.judgment.findFirst({
    where: { id, firmId: user.firmId },
    select: {
      id: true,
      type: true,
      category: true,
      headnote: true,
      citation: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
      attachments: true,
    },
  });

  if (!judgment) {
    return NextResponse.json({ error: 'Judgment not found' }, { status: 404 });
  }

  return NextResponse.json(judgment);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await verifyToken(token);
  if (!user || !user.firmId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.judgment.findFirst({
    where: { id, firmId: user.firmId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Judgment not found' }, { status: 404 });
  }

  const body = await request.json();
  const { type, category, headnote, citation } = body;

  const updateData: Record<string, unknown> = {};
  if (type !== undefined) updateData.type = type;
  if (category !== undefined) updateData.category = category;
  if (headnote !== undefined) updateData.headnote = headnote;
  if (citation !== undefined) updateData.citation = citation;

  const updated = await prisma.judgment.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      type: true,
      category: true,
      headnote: true,
      citation: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
      attachments: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await verifyToken(token);
  if (!user || !user.firmId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const judgment = await prisma.judgment.findFirst({
    where: { id, firmId: user.firmId },
    include: { attachments: true },
  });

  if (!judgment) {
    return NextResponse.json({ error: 'Judgment not found' }, { status: 404 });
  }

  if (judgment.attachments.length > 0) {
    await deleteFiles(judgment.attachments.map((a) => a.fileUrl));
  }

  await prisma.judgment.delete({ where: { id } });

  return NextResponse.json({ message: 'Judgment deleted successfully' });
}
