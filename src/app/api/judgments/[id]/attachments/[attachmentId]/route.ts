import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { deleteFile } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await verifyToken(token);
  if (!user || !user.firmId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: judgmentId, attachmentId } = await params;

  const attachment = await prisma.judgmentAttachment.findFirst({
    where: {
      id: attachmentId,
      judgmentId,
      judgment: { firmId: user.firmId },
    },
  });

  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  }

  await deleteFile(attachment.fileUrl);

  await prisma.judgmentAttachment.delete({ where: { id: attachmentId } });

  return NextResponse.json({ message: 'Attachment deleted' });
}
