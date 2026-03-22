import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { uploadFile, getStoragePath } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activityLog';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return fileName.substring(lastDotIndex).toLowerCase();
}

function sanitizeFileName(fileName: string): string {
  const baseName = fileName.split(/[/\\]/).pop() || 'file';
  return baseName.replace(/[^a-zA-Z0-9._\s-]/g, '');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMIN can close cases
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can close cases' },
        { status: 403 }
      );
    }

    // Fetch case and verify firm ownership
    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, firmId: user.firmId },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (caseRecord.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Case is already closed' },
        { status: 400 }
      );
    }

    // Parse FormData and get the final order file
    const formData = await request.formData();
    const file = formData.get('finalOrder') as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'Final order document is required to close a case' },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760');
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File exceeds maximum size of ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed. Allowed: PDF, Word, JPEG, PNG` },
        { status: 400 }
      );
    }

    // Validate file extension
    const fileExtension = getFileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: `File extension ${fileExtension} is not allowed` },
        { status: 400 }
      );
    }

    // Upload file to Supabase
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sanitizedFileName = sanitizeFileName(file.name);
    const storagePath = getStoragePath(caseId, `final-order_${sanitizedFileName}`);

    const uploadResult = await uploadFile(storagePath, buffer, file.type);
    if (!uploadResult.success) {
      return NextResponse.json(
        { error: `Failed to upload final order: ${uploadResult.error}` },
        { status: 500 }
      );
    }

    // Transaction: create document + close case
    const [fileDoc, updatedCase] = await prisma.$transaction([
      prisma.fileDocument.create({
        data: {
          caseId,
          fileName: `Final Order - ${sanitizedFileName}`,
          fileUrl: storagePath,
          fileType: file.type,
          fileSize: file.size,
          isFinalOrder: true,
        },
      }),
      prisma.case.update({
        where: { id: caseId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closedById: user.id,
        },
        include: {
          FileDocument: true,
          Hearing: true,
          AISummary: true,
          assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      }),
    ]);

    // Log activity (non-blocking)
    ActivityLogger.caseClosed(user.id, user.firmId, caseId, caseRecord.caseNumber, request);

    return NextResponse.json({
      message: 'Case closed successfully',
      case: updatedCase,
      finalOrderDocument: fileDoc,
    });
  } catch (error) {
    console.error('Error closing case:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
