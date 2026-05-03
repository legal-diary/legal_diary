import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { readCaseFilter } from '@/lib/access';
import { downloadFile } from '@/lib/supabase';

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

    // Reading documents follows the firm-wide read scope.
    const document = await prisma.fileDocument.findFirst({
      where: {
        id: documentId,
        Case: readCaseFilter({ firmId: user.firmId }),
      },
      include: {
        Case: {
          select: { firmId: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Only allow text files to be read via this endpoint
    if (document.fileType !== 'text/plain') {
      return NextResponse.json(
        { error: 'Only text files can be read via this endpoint' },
        { status: 400 }
      );
    }

    // Download file from Supabase Storage
    const fileBuffer = await downloadFile(document.fileUrl);

    if (!fileBuffer) {
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    // Convert buffer to text content
    const content = fileBuffer.toString('utf-8');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading document content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
