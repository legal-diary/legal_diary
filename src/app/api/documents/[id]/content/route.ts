import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Find document and verify ownership through case
    const document = await prisma.fileDocument.findFirst({
      where: { id: documentId },
      include: {
        Case: {
          select: { firmId: true },
        },
      },
    });

    if (!document || document.Case.firmId !== user.firmId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Only allow text files to be read via this endpoint
    if (document.fileType !== 'text/plain') {
      return NextResponse.json(
        { error: 'Only text files can be read via this endpoint' },
        { status: 400 }
      );
    }

    // Construct file path and verify it exists
    const filePath = path.join(
      process.cwd(),
      'public',
      document.fileUrl.replace(/^\//, '')
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }

    // Read and return full file content (no truncation)
    const content = fs.readFileSync(filePath, 'utf-8');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading document content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
