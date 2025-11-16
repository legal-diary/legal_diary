import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { analyzeCaseWithAI } from '@/lib/openai';

// GET all cases for a firm
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const cases = await prisma.case.findMany({
      where: { firmId: user.firmId },
      include: {
        createdBy: true,
        hearings: true,
        fileDocuments: true,
        aiSummary: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(cases);
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new case
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const {
      caseNumber,
      clientName,
      clientEmail,
      clientPhone,
      caseTitle,
      description,
      opponents,
      courtName,
      judgeAssigned,
      priority,
    } = await request.json();

    // Validation
    if (!caseNumber || !clientName || !caseTitle) {
      return NextResponse.json(
        { error: 'caseNumber, clientName, and caseTitle are required' },
        { status: 400 }
      );
    }

    // Create case
    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        clientName,
        clientEmail,
        clientPhone,
        caseTitle,
        description,
        opponents,
        courtName,
        judgeAssigned,
        priority: priority || 'MEDIUM',
        createdById: user.id,
        firmId: user.firmId,
      },
      include: {
        createdBy: true,
        hearings: true,
        fileDocuments: true,
      },
    });

    // Generate AI summary asynchronously
    try {
      const analysis = await analyzeCaseWithAI({
        caseTitle,
        caseDescription: description || '',
      });

      await prisma.aISummary.create({
        data: {
          caseId: newCase.id,
          summary: analysis.summary,
          keyPoints: JSON.stringify(analysis.keyPoints),
          insights: analysis.insights,
        },
      });
    } catch (aiError) {
      console.error('Error generating AI summary:', aiError);
      // Don't fail the case creation if AI fails
    }

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
