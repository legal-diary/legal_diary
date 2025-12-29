import OpenAI from 'openai';

let cachedOpenAI: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (cachedOpenAI) return cachedOpenAI;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Add it to your environment to enable AI features.'
    );
  }

  cachedOpenAI = new OpenAI({ apiKey });
  return cachedOpenAI;
}

interface CaseAnalysisRequest {
  caseTitle: string;
  caseDescription: string;
  documentContent?: string;
  hearingType?: string;
  documents?: Array<{ fileName: string; content: string }>;
}

interface CaseAnalysisResult {
  summary: string;
  keyPoints: string[];
  insights: string;
}

interface DocumentAnalysisResult {
  summary: string;
  keyFindings: string[];
  risks: string[];
  recommendations: string[];
}

interface CustomAnalysisResult {
  analysis: string;
  timestamp: string;
}

export async function analyzeCaseWithAI(
  request: CaseAnalysisRequest
): Promise<CaseAnalysisResult> {
  let documentsSection = '';

  // Build documents section if provided
  if (request.documents && request.documents.length > 0) {
    documentsSection = `\n\nUploaded Documents:\n${request.documents
      .map((doc) => `\n[${doc.fileName}]\n${doc.content}`)
      .join('\n---\n')}`;
  }

  const prompt = `
You are a legal expert assistant. Analyze the following case information and provided documents to provide:
1. A concise summary (2-3 sentences)
2. Key points (4-5 bullet points)
3. Insights and recommendations for the advocate

Case Title: ${request.caseTitle}
Case Description: ${request.caseDescription}
${request.hearingType ? `Hearing Type: ${request.hearingType}` : ''}
${documentsSection}

Please format your response as JSON with the following structure:
{
  "summary": "...",
  "keyPoints": ["...", "...", "..."],
  "insights": "..."
}
`;

  try {
    const openai = getOpenAIClient();
    console.log('[analyzeCaseWithAI] Calling OpenAI API with model: gpt-4o');
    const message = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    console.log('[analyzeCaseWithAI] OpenAI API call successful');
    const responseText = message.choices[0].message.content;

    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[analyzeCaseWithAI] Successfully parsed response');
    return {
      summary: parsed.summary,
      keyPoints: parsed.keyPoints || [],
      insights: parsed.insights,
    };
  } catch (error) {
    console.error('[analyzeCaseWithAI] OpenAI API error:', error);
    if (error instanceof Error) {
      console.error('[analyzeCaseWithAI] Error message:', error.message);
      console.error('[analyzeCaseWithAI] Error stack:', error.stack);
    }
    throw error;
  }
}

export async function generateHearingInsights(
  caseTitle: string,
  hearingType: string,
  previousHearings?: string[]
): Promise<string> {
  const prompt = `
You are a legal expert. Based on the following hearing information, provide specific insights and preparation tips for the advocate:

Case: ${caseTitle}
Hearing Type: ${hearingType}
${previousHearings && previousHearings.length > 0 ? `Previous Hearings: ${previousHearings.join(', ')}` : 'This is the first hearing'}

Provide practical, actionable insights for the advocate to effectively handle this hearing.
`;

  try {
    const openai = getOpenAIClient();
    const message = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    return content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Analyze uploaded documents - focuses solely on document content
 */
export async function analyzeDocumentsWithAI(
  documents: Array<{ fileName: string; content: string }>
): Promise<DocumentAnalysisResult> {
  const documentsSection = documents
    .map((doc) => `\n[Document: ${doc.fileName}]\n${doc.content}`)
    .join('\n\n---\n\n');

  const prompt = `You are a legal document analyst. Analyze ONLY the content of the following document(s).
Do NOT make assumptions beyond what is explicitly stated in the documents.

DOCUMENTS TO ANALYZE:
${documentsSection}

Based SOLELY on the document content above, provide:
1. Summary: A concise overview of what the document(s) contain
2. Key Findings: 4-6 important facts, clauses, or information extracted directly from the document(s)
3. Potential Issues/Risks: Any concerning clauses, ambiguities, missing information, or legal risks identified
4. Recommendations: Actionable suggestions based on the document analysis

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{"summary": "your summary here", "keyFindings": ["finding 1", "finding 2", "finding 3"], "risks": ["risk 1", "risk 2"], "recommendations": ["recommendation 1", "recommendation 2"]}`;

  try {
    const openai = getOpenAIClient();
    console.log('[analyzeDocumentsWithAI] Calling OpenAI API for document analysis');
    const message = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a legal document analyst. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.choices[0].message.content;
    console.log('[analyzeDocumentsWithAI] OpenAI response received, length:', responseText?.length);

    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response
    const parsed = JSON.parse(responseText);
    console.log('[analyzeDocumentsWithAI] Successfully parsed response');
    return {
      summary: parsed.summary || 'No summary available',
      keyFindings: parsed.keyFindings || [],
      risks: parsed.risks || [],
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    console.error('[analyzeDocumentsWithAI] OpenAI API error:', error);
    throw error;
  }
}

/**
 * Perform custom analysis based on user prompt
 */
export async function performCustomAnalysis(
  caseTitle: string,
  userPrompt: string,
  documents?: Array<{ fileName: string; content: string }>
): Promise<CustomAnalysisResult> {
  let documentsSection = '';

  if (documents && documents.length > 0) {
    documentsSection = `\n\nRelevant Documents:\n${documents
      .map((doc) => `\n[${doc.fileName}]\n${doc.content}`)
      .join('\n---\n')}`;
  }

  const prompt = `
You are a legal expert assistant. The advocate is working on case "${caseTitle}" and has the following question:

${userPrompt}
${documentsSection}

Provide a detailed, practical response to help the advocate with their analysis and case handling.
`;

  try {
    const openai = getOpenAIClient();
    const message = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.choices[0].message.content;
    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    return {
      analysis: responseText,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}
