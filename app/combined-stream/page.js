"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function CombinedStreamPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const audioContextRef = useRef(null);
  const audioQueue = useRef([]);
  const isPlaying = useRef(false);
  const webSocketRef = useRef(null);
  const currentChunkRef = useRef("");
  
  // Initialize audio context
  useEffect(() => {
    const handleInteraction = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.removeEventListener('click', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, []);

  // Function to play audio from base64
  const playAudio = async (base64Audio) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    try {
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
      
      // Play the audio
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
      
      return new Promise((resolve) => {
        source.onended = resolve;
      });
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  // Process audio queue
  const processAudioQueue = async () => {
    if (isPlaying.current || audioQueue.current.length === 0) return;
    
    isPlaying.current = true;
    const audio = audioQueue.current.shift();
    
    await playAudio(audio);
    
    isPlaying.current = false;
    processAudioQueue();
  };

  // Connect to ElevenLabs WebSocket and prepare for streaming
  const setupElevenLabsWebSocket = async () => {
    try {
      // First get the API key and voice ID
      const response = await fetch('/api/elevenlabs-config');
      if (!response.ok) throw new Error("Failed to get ElevenLabs configuration");
      
      const { apiKey, voiceId } = await response.json();
      
      // Close any existing WebSocket
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      
      // Connect to ElevenLabs WebSocket
      const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_multilingual_v2`;
      const ws = new WebSocket(wsUrl);
      webSocketRef.current = ws;
      
      ws.onopen = () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        
        // Send the initial configuration
        ws.send(JSON.stringify({
          text: " ", // Initial empty text
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          },
          xi_api_key: apiKey,
          generation_config: {
            chunk_length_schedule: [50, 100, 150, 200]
          }
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.audio) {
            audioQueue.current.push(message.audio);
            if (!isPlaying.current) {
              processAudioQueue();
            }
          }
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);
      };
      
      return ws;
    } catch (error) {
      console.error("Error setting up WebSocket:", error);
      setIsConnected(false);
      return null;
    }
  };
  
  // Send text chunk to ElevenLabs WebSocket
  const sendTextChunk = (text) => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }
    
    currentChunkRef.current += text;
    
    // Check if we have enough text to send
    // Sending after punctuation or accumulating ~50 characters
    if (
      text.includes('.') || 
      text.includes('!') || 
      text.includes('?') || 
      text.includes('\n') || 
      currentChunkRef.current.length > 50
    ) {
      console.log("Sending chunk:", currentChunkRef.current);
      
      webSocketRef.current.send(JSON.stringify({
        text: currentChunkRef.current,
        flush: false // Don't generate audio yet, wait for more if needed
      }));
      
      // Reset the current chunk
      currentChunkRef.current = "";
    }
  };
  
  // Flush any remaining text at the end
  const flushRemainingText = () => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    if (currentChunkRef.current.trim().length > 0) {
      console.log("Flushing remaining text:", currentChunkRef.current);
      
      webSocketRef.current.send(JSON.stringify({
        text: currentChunkRef.current,
        flush: true // Generate audio for this final piece
      }));
      
      currentChunkRef.current = "";
    } else {
      // Send an empty chunk with flush:true to signal the end
      webSocketRef.current.send(JSON.stringify({
        text: " ",
        flush: true
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    setResponse("");
    audioQueue.current = [];
    currentChunkRef.current = "";
    
    try {
      // Set up WebSocket first
      await setupElevenLabsWebSocket();
      
      // Start streaming from OpenAI
      const openAIUrl = `/api/chat/stream?message=${encodeURIComponent(message)}`;
      const eventSource = new EventSource(openAIUrl);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.text) {
            // Update the UI
            setResponse(prev => prev + data.text);
            
            // Send text to ElevenLabs
            sendTextChunk(data.text);
          }
        } catch (error) {
          console.error("Error parsing SSE message:", error);
        }
      };
      
      eventSource.onerror = () => {
        eventSource.close();
        
        // Flush any remaining text to ElevenLabs
        flushRemainingText();
        
        setIsLoading(false);
      };
      
    } catch (error) {
      console.error("Error:", error);
      setResponse("Sorry, there was an error processing your request.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Combined Streaming</h1>
        <p className="text-gray-600">OpenAI text streaming + ElevenLabs WebSocket audio streaming</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
          <Link href="/websocket" className="text-blue-600 hover:underline">
            WebSocket version
          </Link>
          <Link href="/realtime" className="text-blue-600 hover:underline">
            Real-time version
          </Link>
        </div>
      </header>

      <main className="flex-grow">
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex flex-col gap-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="p-3 border rounded-md min-h-[100px]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400"
            >
              {isLoading ? "Processing..." : "Send Message"}
            </button>
          </div>
        </form>

        {response && (
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h2 className="font-medium mb-2">
              Response: {isLoading && <span className="text-blue-500">(Streaming...)</span>}
            </h2>
            <p>{response}</p>
          </div>
        )}

        <div className="mb-6 p-4 border rounded-md bg-blue-50">
          <h2 className="font-medium mb-2">WebSocket Status:</h2>
          <p className="text-sm">
            WebSocket: {isConnected ? "Connected" : "Disconnected"} <br />
            Audio: {isPlaying.current ? "Playing" : audioQueue.current.length > 0 ? `Queued (${audioQueue.current.length})` : "Idle"}
          </p>
        </div>
      </main>

      <footer className="py-4 text-center text-gray-500 text-sm">
        <p>Powered by OpenAI and ElevenLabs</p>
      </footer>
    </div>
  );
}