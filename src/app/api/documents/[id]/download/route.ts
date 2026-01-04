import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';
import { resolveStoredPath } from '@/lib/uploads';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;

    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const isAdmin = user.role === 'ADMIN';
    const document = await prisma.fileDocument.findFirst({
      where: {
        id: documentId,
        Case: {
          firmId: user.firmId,
          ...(isAdmin ? {} : { assignments: { some: { userId: user.id } } }),
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const filePath = resolveStoredPath(document.fileUrl);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(document.fileName)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error downloading document');
    return NextResponse.json({ error: 'Failed to download document' }, { status: 500 });
  }
}
