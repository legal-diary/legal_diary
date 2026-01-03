import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { performCustomAnalysis } from '@/lib/openai';
import { safeExtractFileContent } from '@/lib/fileProcessor';
import path from 'path';

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

    const { prompt, documentIds } = await request.json();

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Get case
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        FileDocument: true,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Verify case belongs to user's firm
    if (caseRecord.firmId !== user.firmId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract document contents if documentIds provided
    let documents;
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      const docsToAnalyze = caseRecord.FileDocument.filter((doc) =>
        documentIds.includes(doc.id)
      );

      documents = [];
      for (const doc of docsToAnalyze) {
        const filePath = path.join(process.cwd(), 'public', doc.fileUrl.replace(/^\//, ''));
        const extraction = await safeExtractFileContent(filePath, doc.fileType);

        if (extraction.success && extraction.content) {
          documents.push({
            fileName: doc.fileName,
            content: extraction.content,
          });
        }
      }
    }

    // Perform custom analysis
    const analysis = await performCustomAnalysis(caseRecord.caseTitle, prompt, documents);

    return NextResponse.json({
      success: true,
      message: 'Analysis completed successfully',
      analysis,
      documentsIncluded: documents ? documents.length : 0,
    });
  } catch (error) {
    console.error('Error performing custom analysis:', error);
    return NextResponse.json(
      { error: 'Failed to perform analysis', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
