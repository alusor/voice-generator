import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const message = searchParams.get('message');
  const useInverso = searchParams.get('useInverso') === 'true';

  if (!message) {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  if (useInverso) {
    return handleInversoRequest(message);
  } else {
    return handleOpenAIRequest(message);
  }
}

async function handleOpenAIRequest(message) {
  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: message }
      ],
      stream: true,
    });

    // Create a TextEncoder to convert strings to Uint8Arrays
    const encoder = new TextEncoder();
    
    // Create a ReadableStream from the OpenAI stream
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) {
            // Format as SSE
            const data = `data: ${JSON.stringify({ text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        }
        controller.close();
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return Response.json({ error: 'Failed to get response' }, { status: 500 });
  }
}

async function handleInversoRequest(message) {
  try {
    const inversoApiKey = process.env.INVERSO_API_KEY;
    
    if (!inversoApiKey) {
      throw new Error('INVERSO_API_KEY is not defined in environment variables');
    }

    // Generate a thread_id if needed (using a simple UUID)
    const threadId = 'onboarding-id=-1';

    const response = await fetch('https://inverso-bot-ai-production.up.railway.app/api/v1/chat/onboarding/', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'x-inverso-api-key': inversoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        thread_id: threadId,
        message: message
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Inverso API returned ${response.status}: ${errorText}`);
    }

    // Pass through the Inverso response stream directly
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Create a parser that transforms Inverso's stream format to our expected format
    (async () => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Process any remaining data in the buffer
            if (buffer.trim().length > 0) {
              processBuffer(buffer);
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          
          // Process complete events in the buffer
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // Keep the last incomplete chunk in the buffer

          for (const chunk of lines) {
            if (chunk.trim()) {
              // Process each event chunk
              const eventMatch = chunk.match(/^event: (.+)$/m);
              const dataMatch = chunk.match(/^data: (.+)$/m);
              
              if (eventMatch && eventMatch[1] === 'ai_message_chunk' && dataMatch) {
                try {
                  const data = JSON.parse(dataMatch[1]);
                  
                  // Transform to our expected format
                  if (data.content !== undefined) {
                    const ourFormat = JSON.stringify({ text: data.content });
                    const sseData = `data: ${ourFormat}\n\n`;
                    await writer.write(encoder.encode(sseData));
                  }
                } catch (e) {
                  console.error('Error parsing Inverso chunk:', e);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing Inverso stream:', error);
      } finally {
        await writer.close();
      }

      async function processBuffer(bufferChunk) {
        const eventMatch = bufferChunk.match(/^event: (.+)$/m);
        const dataMatch = bufferChunk.match(/^data: (.+)$/m);
        
        if (eventMatch && eventMatch[1] === 'ai_message_chunk' && dataMatch) {
          try {
            const data = JSON.parse(dataMatch[1]);
            
            if (data.content !== undefined) {
              const ourFormat = JSON.stringify({ text: data.content });
              const sseData = `data: ${ourFormat}\n\n`;
              await writer.write(encoder.encode(sseData));
            }
          } catch (e) {
            console.error('Error parsing final Inverso chunk:', e);
          }
        }
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error calling Inverso API:', error);
    return Response.json({ error: 'Failed to get response from Inverso: ' + error.message }, { status: 500 });
  }
}