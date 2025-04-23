"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function WebSocketStreamPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const audioContextRef = useRef(null);
  const audioQueue = useRef([]);
  const isPlaying = useRef(false);
  const webSocketRef = useRef(null);

  // Initialize audio context
  useEffect(() => {
    // Create audio context when needed
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
    };

    // Handle user interaction to create audio context (required by browsers)
    const handleInteraction = () => {
      initAudioContext();
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

  // Function to connect to ElevenLabs WebSocket
  const connectToElevenLabs = (text, apiKey, voiceId) => {
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }

    setIsConnecting(true);

    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_multilingual_v2`;
    const ws = new WebSocket(wsUrl);
    webSocketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connection established");
      
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

      // Wait a moment for connection setup and then send the text
      setTimeout(() => {
        ws.send(JSON.stringify({
          text: text,
          flush: true
        }));
      }, 500);
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
        
        if (message.isFinal) {
          setIsConnecting(false);
          ws.close();
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnecting(false);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnecting(false);
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    setResponse("");
    audioQueue.current = [];
    
    try {
      // First get the OpenAI response and ElevenLabs credentials
      const response = await fetch(`/api/websocket-tts?message=${encodeURIComponent(message)}`);
      
      if (!response.ok) throw new Error("Failed to get response");
      
      const data = await response.json();
      setResponse(data.text);
      
      // Connect to ElevenLabs WebSocket with the text
      connectToElevenLabs(data.text, data.apiKey, data.voiceId);
      
    } catch (error) {
      console.error("Error:", error);
      setResponse("Sorry, there was an error processing your request.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">WebSocket AI Voice Chat</h1>
        <p className="text-gray-600">Chat with an AI using ElevenLabs WebSocket API</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link href="/" className="text-blue-600 hover:underline">
            Standard version
          </Link>
          <Link href="/stream" className="text-blue-600 hover:underline">
            Streaming version
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
              disabled={isLoading || isConnecting}
            />
            <button
              type="submit"
              disabled={isLoading || isConnecting}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400"
            >
              {isLoading ? "Getting response..." : isConnecting ? "Connecting to voice API..." : "Send Message"}
            </button>
          </div>
        </form>

        {response && (
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h2 className="font-medium mb-2">Response:</h2>
            <p>{response}</p>
          </div>
        )}

        <div className="mb-6 p-4 border rounded-md bg-blue-50">
          <h2 className="font-medium mb-2">WebSocket Audio:</h2>
          <p className="text-sm">
            {isConnecting 
              ? "Connecting to ElevenLabs and streaming audio..." 
              : audioQueue.current.length > 0 || isPlaying.current 
                ? "Playing audio chunks..." 
                : isLoading 
                  ? "Waiting for response..." 
                  : "Send a message to hear the response"}
          </p>
        </div>
      </main>

      <footer className="py-4 text-center text-gray-500 text-sm">
        <p>Powered by OpenAI and ElevenLabs WebSocket API</p>
      </footer>
    </div>
  );
}