import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || !user.firmId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const sort = searchParams.get('sort') || 'newest';

  const judgments = await prisma.judgment.findMany({
    where: {
      firmId: user.firmId,
      ...(type ? { type: type as 'RESEARCH' | 'OFFICE_JUDGMENT' } : {}),
    },
    select: {
      id: true,
      type: true,
      category: true,
      headnote: true,
      citation: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
  });

  const filtered = search
    ? judgments.filter(j =>
        j.citation.toLowerCase().includes(search.toLowerCase()) ||
        j.category.toLowerCase().includes(search.toLowerCase()) ||
        stripHtml(j.headnote).toLowerCase().includes(search.toLowerCase())
      )
    : judgments;

  const result = filtered.map(j => ({
    ...j,
    headnotePreview: stripHtml(j.headnote).substring(0, 200),
  }));

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || !user.firmId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type, category, headnote, citation } = await request.json();

  if (!type || !category?.trim() || !headnote?.trim() || !citation?.trim()) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  if (!['RESEARCH', 'OFFICE_JUDGMENT'].includes(type)) {
    return NextResponse.json({ error: 'Invalid judgment type' }, { status: 400 });
  }

  const judgment = await prisma.judgment.create({
    data: {
      firmId: user.firmId,
      createdById: user.id,
      type,
      category: category.trim(),
      headnote,
      citation: citation.trim(),
    },
    select: {
      id: true,
      type: true,
      category: true,
      citation: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });

  return NextResponse.json(judgment, { status: 201 });
}
