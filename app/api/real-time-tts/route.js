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

  // Set up SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Initiate OpenAI stream
        const openaiStream = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant. Keep responses concise.' },
            { role: 'user', content: message }
          ],
          stream: true,
        });

        let completeResponse = '';
        let currentChunk = '';
        
        // Stream the text in chunks to the client
        for await (const chunk of openaiStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            completeResponse += content;
            currentChunk += content;
            
            // Send text chunk to client
            const textEvent = `event: text\ndata: ${JSON.stringify({ text: content })}\n\n`;
            controller.enqueue(encoder.encode(textEvent));
            
            // For every reasonable chunk (e.g., sentence or paragraph), generate audio
            if (content.includes('.') || content.includes('!') || content.includes('?') || 
                content.includes('\n') || currentChunk.length > 20) {
              
              try {
                // Only process if the chunk has meaningful content
                if (currentChunk.trim().length > 0) {
                  // Generate audio for the current text chunk
                  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
                  const audioResponse = await elevenlabs.textToSpeech.convert(voiceId, {
                    text: currentChunk,
                    model_id: 'eleven_multilingual_v2',
                    output_format: 'mp3_22050_32'
                  });
                  
                  // Convert audio data to base64 - audioResponse is a Buffer or Uint8Array directly
                  const base64Audio = Buffer.from(audioResponse).toString('base64');
                  
                  // Send audio chunk to client
                  const audioEvent = `event: audio\ndata: ${JSON.stringify({ audio: base64Audio })}\n\n`;
                  controller.enqueue(encoder.encode(audioEvent));
                  
                  // Reset the current chunk
                  currentChunk = '';
                }
              } catch (audioError) {
                console.error("Error generating audio:", audioError);
                // Continue even if audio generation fails for a chunk
              }
            }
          }
        }
        
        // Final audio generation for any remaining text
        if (currentChunk.trim().length > 0) {
          try {
            // Generate final audio for remaining text
            const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
            const finalAudioResponse = await elevenlabs.textToSpeech.convert(voiceId, {
              text: currentChunk,
              model_id: 'eleven_multilingual_v2',
              output_format: 'mp3_22050_32'
            });
            
            // Convert audio data to base64
            const finalBase64Audio = Buffer.from(finalAudioResponse).toString('base64');
            
            // Send final chunk audio to client
            const finalAudioEvent = `event: audio\ndata: ${JSON.stringify({ audio: finalBase64Audio })}\n\n`;
            controller.enqueue(encoder.encode(finalAudioEvent));
          } catch (finalChunkError) {
            console.error("Error generating final chunk audio:", finalChunkError);
          }
        }
        
        // Generate a complete audio as well (optional)
        if (completeResponse.trim().length > 0) {
          try {
            // Generate complete audio
            const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
            const completeAudioResponse = await elevenlabs.textToSpeech.convert(voiceId, {
              text: completeResponse,
              model_id: 'eleven_multilingual_v2',
              output_format: 'mp3_22050_32'
            });
            
            // Convert complete audio data to base64
            const completeBase64Audio = Buffer.from(completeAudioResponse).toString('base64');
            
            // Send complete audio to client
            const completeAudioEvent = `event: complete_audio\ndata: ${JSON.stringify({ audio: completeBase64Audio })}\n\n`;
            controller.enqueue(encoder.encode(completeAudioEvent));
          } catch (completeAudioError) {
            console.error("Error generating complete audio:", completeAudioError);
          }
        }
        
        // Signal end of stream
        const endEvent = `event: end\ndata: {}\n\n`;
        controller.enqueue(encoder.encode(endEvent));
        controller.close();
        
      } catch (error) {
        console.error('Error in stream processing:', error);
        const errorEvent = `event: error\ndata: ${JSON.stringify({ error: 'An error occurred' })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}