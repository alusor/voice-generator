import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if we have the environment variables we need
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
    const inversoApiKey = process.env.INVERSO_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY is not defined in environment variables' },
        { status: 500 }
      );
    }

    return NextResponse.json({ apiKey, voiceId, inversoApiKey });
  } catch (error) {
    console.error('Error getting ElevenLabs config:', error);
    return NextResponse.json({ error: 'Failed to get configuration' }, { status: 500 });
  }
}