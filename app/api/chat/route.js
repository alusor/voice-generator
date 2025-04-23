import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  const body = await request.json();
  const { message } = body;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: message }
      ],
      stream: false,
    });

    return Response.json({ text: response.choices[0].message.content });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return Response.json({ error: 'Failed to get response' }, { status: 500 });
  }
}