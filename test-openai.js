import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
console.log('API Key present:', !!apiKey);
console.log('API Key length:', apiKey?.length || 0);
console.log('API Key starts with:', apiKey?.substring(0, 10) || 'N/A');

try {
  const openai = new OpenAI({
    apiKey: apiKey,
  });
  console.log('✓ OpenAI client initialized successfully');

  // Test with a simple prompt
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: 'Say hello in one word',
      },
    ],
  });
  
  console.log('✓ API call successful');
  console.log('Response:', response.choices[0].message.content);
} catch (error) {
  console.error('✗ Error:', error.message);
  if (error.error) {
    console.error('API Error:', error.error);
  }
}
