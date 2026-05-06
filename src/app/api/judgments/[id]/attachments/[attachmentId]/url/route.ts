import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getSignedUrl } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await verifyToken(token);
  if (!user || !user.firmId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const expiresIn = 3600;
  const url = await getSignedUrl(attachment.fileUrl, expiresIn);

  if (!url) {
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }

  return NextResponse.json({
    url,
    fileName: attachment.fileName,
    fileType: attachment.fileType,
    expiresIn,
  });
}
