import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { readCaseFilter } from '@/lib/access';
import { getSignedUrl } from '@/lib/supabase';

/**
 * GET /api/documents/[id]/url
 * Generate a signed URL for secure document access
 */
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

    // Document download follows the firm-wide read scope.
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

    // Generate signed URL (valid for 1 hour)
    const signedUrl = await getSignedUrl(document.fileUrl, 3600);

    if (!signedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate document URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedUrl,
      fileName: document.fileName,
      fileType: document.fileType,
      expiresIn: 3600, // 1 hour in seconds
    });
  } catch (error) {
    console.error('Error generating document URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
