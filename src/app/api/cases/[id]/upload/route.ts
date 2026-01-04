import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';
import { buildStoredPath, getUploadsRoot } from '@/lib/uploads';
import { checkRateLimit } from '@/lib/rateLimit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Allowed MIME types for file uploads
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.gif'];
const MAX_FILES_PER_UPLOAD = parseInt(process.env.MAX_FILES_PER_UPLOAD || '10');

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return fileName.substring(lastDotIndex).toLowerCase();
}

function isMagicBytesValid(buffer: Buffer, mimeType: string): boolean {
  const bytes = buffer.subarray(0, 12);
  const hex = bytes.toString('hex');

  if (mimeType === 'application/pdf' && hex.startsWith('25504446')) {
    return true;
  }

  if (mimeType.startsWith('image/')) {
    if (mimeType === 'image/png' && hex.startsWith('89504e470d0a1a0a')) {
      return true;
    }
    if (mimeType === 'image/jpeg' && hex.startsWith('ffd8ff')) {
      return true;
    }
    if (mimeType === 'image/gif' && (hex.startsWith('474946383761') || hex.startsWith('474946383961'))) {
      return true;
    }
  }

  if (mimeType === 'application/msword' && hex.startsWith('d0cf11e0a1b11ae1')) {
    return true;
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return hex.startsWith('504b0304');
  }

  if (mimeType === 'text/plain') {
    return !buffer.includes(0);
  }

  if (mimeType === 'application/vnd.ms-excel') {
    return hex.startsWith('d0cf11e0a1b11ae1');
  }

  return false;
}

function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  const baseName = fileName.split(/[/\\]/).pop() || 'file';
  // Remove special characters but keep spaces and dots
  return baseName.replace(/[^a-zA-Z0-9._\s-]/g, '');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    const token = getAuthToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Role-based case access verification
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = {
      id: caseId,
      firmId: user.firmId,
      ...(isAdmin ? {} : { assignments: { some: { userId: user.id } } }),
    };

    const caseRecord = await prisma.case.findFirst({
      where: caseFilter,
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const rateLimit = checkRateLimit(`upload:${user.id}`, 20, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again later.', retryAfter: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { error: `Too many files. Maximum allowed is ${MAX_FILES_PER_UPLOAD}` },
        { status: 400 }
      );
    }

    const uploadedFiles = [];
    const maxSize = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760');

    for (const file of files) {
      // Validate file size
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of ${maxSize / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
          { status: 400 }
        );
      }

      // Validate file extension
      const fileExtension = getFileExtension(file.name);
      if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
        return NextResponse.json(
          { error: `File extension ${fileExtension} is not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (!isMagicBytesValid(buffer, file.type)) {
        return NextResponse.json(
          { error: `File content does not match declared type for ${file.name}` },
          { status: 400 }
        );
      }

      // Create upload directory
      const uploadDir = join(getUploadsRoot(), caseId);
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Save file with sanitized name
      const timestamp = Date.now();
      const sanitizedFileName = sanitizeFileName(file.name);
      const fileName = `${timestamp}-${sanitizedFileName}`;
      const filePath = join(uploadDir, fileName);
      const storedPath = buildStoredPath(caseId, fileName);

      await writeFile(filePath, buffer);

      // Save to database
      const fileDoc = await prisma.fileDocument.create({
        data: {
          caseId,
          fileName: sanitizedFileName,
          fileUrl: storedPath,
          fileType: file.type,
          fileSize: file.size,
        },
      });

      uploadedFiles.push(fileDoc);
    }

    return NextResponse.json(
      {
        message: 'Files uploaded successfully',
        files: uploadedFiles,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading files');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
