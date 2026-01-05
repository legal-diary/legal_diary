import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { analyzeDocumentsWithAI } from '@/lib/openai';
import { safeExtractFileContent } from '@/lib/fileProcessor';

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

    // Extract document contents from Supabase Storage
    console.log(`[analyze-documents] Starting document extraction for ${docsToAnalyze.length} documents`);
    const documents = [];
    for (const doc of docsToAnalyze) {
      console.log(`[analyze-documents] Processing document: ${doc.fileName} (${doc.fileType})`);
      console.log(`[analyze-documents] Storage path: ${doc.fileUrl}`);

      // fileUrl now contains the Supabase storage path
      const extraction = await safeExtractFileContent(doc.fileUrl, doc.fileType);
      console.log(`[analyze-documents] Extraction result for ${doc.fileName}: success=${extraction.success}, content length=${extraction.content?.length || 0}`);

      if (extraction.success && extraction.content) {
        documents.push({
          fileName: doc.fileName,
          content: extraction.content,
        });
        console.log(`[analyze-documents] Added document ${doc.fileName} with ${extraction.content.length} chars`);
      } else {
        console.log(`[analyze-documents] Failed to extract ${doc.fileName}: ${extraction.error}`);
      }
    }

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract content from any documents' },
        { status: 400 }
      );
    }

    // Analyze documents (document-focused analysis only)
    console.log(`[analyze-documents] Sending ${documents.length} documents to OpenAI for analysis`);
    console.log(`[analyze-documents] Total content size: ${documents.reduce((sum, d) => sum + d.content.length, 0)} chars`);

    const analysis = await analyzeDocumentsWithAI(documents);
    console.log(`[analyze-documents] Analysis complete. Summary length: ${analysis.summary?.length || 0}`);

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
