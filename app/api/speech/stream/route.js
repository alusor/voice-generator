import { ElevenLabsClient } from 'elevenlabs';

export async function POST(request) {
  const body = await request.json();
  const { text } = body;

  if (!text) {
    return Response.json({ error: 'Text is required' }, { status: 400 });
  }

  try {
    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
    
    // Get streaming audio
    const audioStream = await elevenlabs.textToSpeech.convertAsStream(voiceId, {
      text,
      model_id: 'eleven_multilingual_v2',
      output_format: 'mp3_22050_32'
    });

    // Return the stream as a response
    return new Response(audioStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Error streaming speech:', error);
    return Response.json({ error: 'Failed to generate speech stream' }, { status: 500 });
  }
}