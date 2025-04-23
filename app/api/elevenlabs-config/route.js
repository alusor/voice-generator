import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return the API key and voice ID
    return NextResponse.json({
      apiKey: process.env.ELEVENLABS_API_KEY,
      voiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'
    });
  } catch (error) {
    console.error('Error getting ElevenLabs config:', error);
    return NextResponse.json({ error: 'Failed to get configuration' }, { status: 500 });
  }
}