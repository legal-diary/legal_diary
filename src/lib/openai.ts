import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CaseAnalysisRequest {
  caseTitle: string;
  caseDescription: string;
  documentContent?: string;
  hearingType?: string;
}

interface CaseAnalysisResult {
  summary: string;
  keyPoints: string[];
  insights: string;
}

export async function analyzeCaseWithAI(
  request: CaseAnalysisRequest
): Promise<CaseAnalysisResult> {
  const prompt = `
You are a legal expert assistant. Analyze the following case information and provide:
1. A concise summary (2-3 sentences)
2. Key points (4-5 bullet points)
3. Insights and recommendations for the advocate

Case Title: ${request.caseTitle}
Case Description: ${request.caseDescription}
${request.documentContent ? `Document Content: ${request.documentContent.substring(0, 1000)}...` : ''}
${request.hearingType ? `Hearing Type: ${request.hearingType}` : ''}

Please format your response as JSON with the following structure:
{
  "summary": "...",
  "keyPoints": ["...", "...", "..."],
  "insights": "..."
}
`;

  try {
    // @ts-expect-error - OpenAI SDK types
    const message = await openai.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary,
      keyPoints: parsed.keyPoints || [],
      insights: parsed.insights,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
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
    // @ts-expect-error - OpenAI SDK types
    const message = await openai.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return message.content[0].type === 'text' ? message.content[0].text : '';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}
