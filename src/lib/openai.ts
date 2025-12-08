import OpenAI from 'openai';

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY || '';

if (!apiKey) {
  console.error('[OpenAI Init] ERROR: OPENAI_API_KEY is not set in environment variables!');
  console.error('[OpenAI Init] Check your .env file has OPENAI_API_KEY=sk-...');
} else {
  console.log('[OpenAI Init] API Key present: true');
  console.log('[OpenAI Init] API Key length:', apiKey.length);
  console.log('[OpenAI Init] API Key prefix:', apiKey.substring(0, 15) + '...');
}

const openai = new OpenAI({
  apiKey: apiKey || undefined,
});

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
 * Analyze uploaded documents for a case
 */
export async function analyzeDocumentsWithAI(
  caseTitle: string,
  documents: Array<{ fileName: string; content: string }>
): Promise<DocumentAnalysisResult> {
  const documentsSection = documents
    .map((doc) => `\n[${doc.fileName}]\n${doc.content}`)
    .join('\n---\n');

  const prompt = `
You are a legal expert. Analyze the following documents from the case "${caseTitle}" and provide:
1. A summary of the documents (key points)
2. Key findings (4-5 major points from the documents)
3. Potential risks or issues identified
4. Recommendations for the advocate

Documents:
${documentsSection}

Please format your response as JSON with the following structure:
{
  "summary": "...",
  "keyFindings": ["...", "...", "..."],
  "risks": ["...", "...", "..."],
  "recommendations": ["...", "...", "..."]
}
`;

  try {
    const message = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
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

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary,
      keyFindings: parsed.keyFindings || [],
      risks: parsed.risks || [],
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
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
