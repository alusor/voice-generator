import { OpenAI } from 'openai';
import { ElevenLabsClient } from 'elevenlabs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const message = searchParams.get('message');

  if (!message) {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    // First, get the complete text from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Keep responses concise and clear.' },
        { role: 'user', content: message }
      ],
      stream: false, // We need the complete text first for ElevenLabs
    });

    const responseText = completion.choices[0].message.content;

    // Now stream the audio response
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
    const audioStream = await elevenlabs.textToSpeech.convertAsStream(voiceId, {
      text: responseText,
      model_id: 'eleven_multilingual_v2',
      output_format: 'mp3_22050_32'
    });

    // Return the text and a streaming URL for the audio
    return new Response(audioStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  }
}