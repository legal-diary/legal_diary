import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';
import { resolveStoredPath } from '@/lib/uploads';
import { checkRateLimit } from '@/lib/rateLimit';
import { performCustomAnalysis } from '@/lib/openai';
import { safeExtractFileContent } from '@/lib/fileProcessor';

const MAX_PROMPT_LENGTH = 4000;
const MAX_AI_DOCUMENT_CHARS = 80000;

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

    const rateLimit = checkRateLimit(`ai-custom:${user.id}`, 8, 10 * 60 * 1000);
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

    const { prompt, documentIds } = body;

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` },
        { status: 400 }
      );
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
      include: {
        FileDocument: true,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Extract document contents if documentIds provided
    let documents;
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      const docsToAnalyze = caseRecord.FileDocument.filter((doc) =>
        documentIds.includes(doc.id)
      );

      documents = [];
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
    console.error('Error performing custom analysis');
    return NextResponse.json(
      { error: 'Failed to perform analysis', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
