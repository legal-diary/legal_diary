import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
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

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return fileName.substring(lastDotIndex).toLowerCase();
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

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

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

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
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

      // Create upload directory
      const uploadDir = join(process.cwd(), 'public', 'uploads', caseId);
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Save file with sanitized name
      const timestamp = Date.now();
      const sanitizedFileName = sanitizeFileName(file.name);
      const fileName = `${timestamp}-${sanitizedFileName}`;
      const filePath = join(uploadDir, fileName);
      const fileUrl = `/uploads/${caseId}/${fileName}`;

      await writeFile(filePath, buffer);

      // Save to database
      const fileDoc = await prisma.fileDocument.create({
        data: {
          caseId,
          fileName: sanitizedFileName,
          fileUrl,
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
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
