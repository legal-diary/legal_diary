import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';
import { resolveStoredPath } from '@/lib/uploads';
import { checkRateLimit } from '@/lib/rateLimit';
import { analyzeDocumentsWithAI } from '@/lib/openai';
import { safeExtractFileContent } from '@/lib/fileProcessor';

const MAX_AI_DOCUMENT_CHARS = 120000;

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

    const rateLimit = checkRateLimit(`ai-docs:${user.id}`, 10, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many AI requests. Please try again later.', retryAfter: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { documentIds } = body;

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

    // Extract document contents
    const documents = [];
    let totalChars = 0;
    for (const doc of docsToAnalyze) {
      const filePath = resolveStoredPath(doc.fileUrl);

      const extraction = await safeExtractFileContent(filePath, doc.fileType);

      if (extraction.success && extraction.content) {
        totalChars += extraction.content.length;
        if (totalChars > MAX_AI_DOCUMENT_CHARS) {
          return NextResponse.json(
            { error: 'Document content exceeds analysis limits. Please analyze fewer documents.' },
            { status: 400 }
          );
        }
        documents.push({
          fileName: doc.fileName,
          content: extraction.content,
        });
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

    return NextResponse.json({
      success: true,
      message: 'Documents analyzed successfully',
      analysis,
      documentsAnalyzed: documents.length,
    });
  } catch (error) {
    console.error('Error analyzing documents');
    return NextResponse.json(
      { error: 'Failed to analyze documents', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
