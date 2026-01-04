import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';
import { resolveStoredPath } from '@/lib/uploads';
import fs from 'fs';
import { Readable } from 'stream';

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
    let fileStat: fs.Stats;
    try {
      fileStat = await fs.promises.stat(filePath);
      if (!fileStat.isFile()) {
        return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const fileStream = fs.createReadStream(filePath);
    const body = Readable.toWeb(fileStream);

    return new NextResponse(body, {
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(document.fileName)}"`,
        'Cache-Control': 'no-store',
        'Content-Length': fileStat.size.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading document');
    return NextResponse.json({ error: 'Failed to download document' }, { status: 500 });
  }
}
