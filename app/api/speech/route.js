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

    // For non-streaming response

    console.log(elevenlabs);
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Default voice
    const generatedAudio = await elevenlabs.textToSpeech.convert(voiceId, {
      text,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_192'
    });


    return new Response(generatedAudio, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return Response.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}