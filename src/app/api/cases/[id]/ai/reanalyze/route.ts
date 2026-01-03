import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { analyzeCaseWithAI } from '@/lib/openai';
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

    console.log('[POST /api/cases/[id]/ai/reanalyze] Authorization header:', authHeader?.substring(0, 30));
    console.log('[POST /api/cases/[id]/ai/reanalyze] Token:', token?.substring(0, 20));
    console.log('[POST /api/cases/[id]/ai/reanalyze] Case ID:', caseId);

    if (!token) {
      console.log('[POST /api/cases/[id]/ai/reanalyze] No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    console.log('[POST /api/cases/[id]/ai/reanalyze] User verified:', user?.email);

    if (!user || !user.firmId) {
      console.log('[POST /api/cases/[id]/ai/reanalyze] Invalid user or no firmId');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get case
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        FileDocument: true,
        AISummary: true,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Verify case belongs to user's firm
    if (caseRecord.firmId !== user.firmId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract document contents
    const documents = [];
    for (const doc of caseRecord.FileDocument) {
      const filePath = path.join(process.cwd(), 'public', doc.fileUrl.replace(/^\//, ''));
      const extraction = await safeExtractFileContent(filePath, doc.fileType);

      if (extraction.success && extraction.content) {
        documents.push({
          fileName: doc.fileName,
          content: extraction.content,
        });
      }
    }

    // Perform analysis with documents
    console.log('[POST /api/cases/[id]/ai/reanalyze] Starting AI analysis with', documents.length, 'documents');
    console.log('[POST /api/cases/[id]/ai/reanalyze] Case title:', caseRecord.caseTitle);

    let analysis;
    try {
      analysis = await analyzeCaseWithAI({
        caseTitle: caseRecord.caseTitle,
        caseDescription: caseRecord.description || '',
        documents: documents.length > 0 ? documents : undefined,
      });
      console.log('[POST /api/cases/[id]/ai/reanalyze] Analysis successful');
      console.log('[POST /api/cases/[id]/ai/reanalyze] Summary:', analysis.summary.substring(0, 100));
    } catch (analysisError) {
      console.error('[POST /api/cases/[id]/ai/reanalyze] OpenAI Analysis Error:', analysisError);
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
    console.error('Error re-analyzing case:', error);
    return NextResponse.json(
      { error: 'Failed to re-analyze case', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
