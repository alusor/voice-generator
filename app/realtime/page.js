"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function RealTimeStreamPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const audioQueue = useRef([]);
  const isPlaying = useRef(false);
  
  // Create audio context when needed, not on component load
  const audioContextRef = useRef(null);

  const playNextInQueue = async () => {
    if (audioQueue.current.length === 0 || isPlaying.current) {
      return;
    }

    isPlaying.current = true;

    try {
      // Initialize audio context if not already created
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const base64Audio = audioQueue.current.shift();
      const binaryAudio = atob(base64Audio);
      const audioBytes = new Uint8Array(binaryAudio.length);
      
      for (let i = 0; i < binaryAudio.length; i++) {
        audioBytes[i] = binaryAudio.charCodeAt(i);
      }
      
      const audioContext = audioContextRef.current;
      const audioBuffer = await audioContext.decodeAudioData(audioBytes.buffer);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        isPlaying.current = false;
        playNextInQueue();
      };
      
      source.start(0);
    } catch (error) {
      console.error("Error playing audio:", error);
      isPlaying.current = false;
      playNextInQueue();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    setResponse("");
    audioQueue.current = [];
    
    // Set up event source for real-time streaming
    const eventSource = new EventSource(`/api/real-time-tts?message=${encodeURIComponent(message)}`);
    
    eventSource.addEventListener('text', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.text) {
          setResponse(prev => prev + data.text);
        }
      } catch (error) {
        console.error("Error parsing text event:", error);
      }
    });
    
    eventSource.addEventListener('audio', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.audio) {
          audioQueue.current.push(data.audio);
          if (!isPlaying.current) {
            playNextInQueue();
          }
        }
      } catch (error) {
        console.error("Error parsing audio event:", error);
      }
    });
    
    eventSource.addEventListener('complete_audio', (event) => {
      try {
        // We could play the complete audio here if needed
        console.log("Complete audio received");
      } catch (error) {
        console.error("Error parsing complete audio event:", error);
      }
    });
    
    eventSource.addEventListener('end', () => {
      eventSource.close();
      setIsLoading(false);
    });
    
    eventSource.addEventListener('error', (event) => {
      console.error("EventSource error:", event);
      eventSource.close();
      setIsLoading(false);
    });
  };

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Real-Time AI Voice Chat</h1>
        <p className="text-gray-600">Chat with an AI and hear its voice in real-time</p>
        <div className="mt-4 flex space-x-4">
          <Link href="/" className="text-blue-600 hover:underline">
            Standard version
          </Link>
          <Link href="/stream" className="text-blue-600 hover:underline">
            Streaming version
          </Link>
          <Link href="/combined" className="text-blue-600 hover:underline">
            Combined version
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
      </main>

      <footer className="py-4 text-center text-gray-500 text-sm">
        Powered by OpenAI and ElevenLabs
      </footer>
    </div>
  );
}