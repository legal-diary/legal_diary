import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { analyzeDocumentsWithAI } from '@/lib/openai';
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

    const { documentIds } = await request.json();

    // Role-based case access verification
    const isAdmin = user.role === 'ADMIN';
    const caseFilter = {
      id: caseId,
      firmId: user.firmId,
      ...(isAdmin ? {} : { assignments: { some: { userId: user.id } } }),
    };

    const caseRecord = await prisma.case.findFirst({
      where: caseFilter,
      include: {
        FileDocument: true,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Get specified documents or all if none specified
    let docsToAnalyze = caseRecord.FileDocument;
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      docsToAnalyze = caseRecord.FileDocument.filter((doc) => documentIds.includes(doc.id));
    }

    if (docsToAnalyze.length === 0) {
      return NextResponse.json({ error: 'No documents found to analyze' }, { status: 400 });
    }

    const startTime = Date.now();

    // Extract document contents
    const documents = [];
    for (const doc of docsToAnalyze) {
      const filePath = path.join(process.cwd(), 'public', doc.fileUrl.replace(/^\//, ''));

      const extraction = await safeExtractFileContent(filePath, doc.fileType);

      if (extraction.success && extraction.content) {
        documents.push({
          fileName: doc.fileName,
          content: extraction.content,
        });
      } else {
        console.warn('[analyze-documents] Failed to extract document content');
      }
    }

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract content from any documents' },
        { status: 400 }
      );
    }

    // Analyze documents (document-focused analysis only)
    const analysis = await analyzeDocumentsWithAI(documents);
    const durationMs = Date.now() - startTime;
    console.info(`[analyze-documents] Completed in ${durationMs}ms`);

    return NextResponse.json({
      success: true,
      message: 'Documents analyzed successfully',
      analysis,
      documentsAnalyzed: documents.length,
    });
  } catch (error) {
    console.error('Error analyzing documents:', error);
    return NextResponse.json(
      { error: 'Failed to analyze documents', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
