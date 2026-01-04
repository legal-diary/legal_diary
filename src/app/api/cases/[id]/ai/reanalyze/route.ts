import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';
import { resolveStoredPath } from '@/lib/uploads';
import { checkRateLimit } from '@/lib/rateLimit';
import { analyzeCaseWithAI } from '@/lib/openai';
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

    const rateLimit = checkRateLimit(`ai-reanalyze:${user.id}`, 6, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many AI requests. Please try again later.', retryAfter: rateLimit.retryAfter },
        { status: 429 }
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
        AISummary: true,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Extract document contents
    const documents = [];
    let totalChars = 0;
    for (const doc of caseRecord.FileDocument) {
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

    // Perform analysis with documents
    let analysis;
    try {
      analysis = await analyzeCaseWithAI({
        caseTitle: caseRecord.caseTitle,
        caseDescription: caseRecord.description || '',
        documents: documents.length > 0 ? documents : undefined,
      });
    } catch (analysisError) {
      console.error('[POST /api/cases/[id]/ai/reanalyze] OpenAI Analysis Error');
      throw analysisError;
    }

    // Update or create AI summary
    let aiSummary;
    if (caseRecord.AISummary) {
      aiSummary = await prisma.aISummary.update({
        where: { id: caseRecord.AISummary.id },
        data: {
          summary: analysis.summary,
          keyPoints: JSON.stringify(analysis.keyPoints),
          insights: analysis.insights,
          updatedAt: new Date(),
        },
      });
    } else {
      aiSummary = await prisma.aISummary.create({
        data: {
          caseId: caseRecord.id,
          summary: analysis.summary,
          keyPoints: JSON.stringify(analysis.keyPoints),
          insights: analysis.insights,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Case re-analyzed successfully',
      aiSummary,
      documentsAnalyzed: documents.length,
    });
  } catch (error) {
    console.error('Error re-analyzing case');
    return NextResponse.json(
      { error: 'Failed to re-analyze case', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
