import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { uploadFile } from '@/lib/supabase';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
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
  });

  if (!judgment) {
    return NextResponse.json({ error: 'Judgment not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  const uploadedAttachments = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File "${file.name}" exceeds the 10MB size limit` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File "${file.name}" has an unsupported MIME type. Allowed: PDF, JPEG, PNG` },
        { status: 400 }
      );
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `File "${file.name}" has an unsupported extension. Allowed: .pdf, .jpg, .jpeg, .png` },
        { status: 400 }
      );
    }

    const sanitizedFileName = file.name
      .replace(/[^a-zA-Z0-9._\s-]/g, '')
      .replace(/\s+/g, '_');

    const storagePath = `judgments/${judgmentId}/${Date.now()}-${sanitizedFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(storagePath, buffer, file.type);

    const attachment = await prisma.judgmentAttachment.create({
      data: {
        judgmentId,
        fileName: sanitizedFileName,
        fileUrl: storagePath,
        fileType: file.type,
        fileSize: file.size,
      },
    });

    uploadedAttachments.push(attachment);
  }

  return NextResponse.json(
    { message: 'Files uploaded successfully', files: uploadedAttachments },
    { status: 201 }
  );
}
