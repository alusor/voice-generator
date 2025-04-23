"use client";

import { useState, useRef, useEffect } from "react";

export default function StreamPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamingText, setIsStreamingText] = useState(false);
  const [isStreamingAudio, setIsStreamingAudio] = useState(false);
  const [fullText, setFullText] = useState("");
  const audioRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    setResponse("");
    setFullText("");
    
    try {
      // Stream text from OpenAI
      setIsStreamingText(true);
      
      const eventSource = new EventSource(`/api/chat/stream?message=${encodeURIComponent(message)}`);
      
      let accumulatedText = "";
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.text) {
            accumulatedText += data.text;
            setResponse(accumulatedText);
          }
        } catch (error) {
          console.error("Error parsing SSE message:", error);
        }
      };
      
      eventSource.onerror = () => {
        eventSource.close();
        setIsStreamingText(false);
        setFullText(accumulatedText);
        
        // Now stream the audio
        streamAudio(accumulatedText);
      };
      
    } catch (error) {
      console.error("Error:", error);
      setResponse("Sorry, there was an error processing your request.");
      setIsLoading(false);
      setIsStreamingText(false);
    }
  };
  
  const streamAudio = async (text) => {
    try {
      setIsStreamingAudio(true);
      
      // Get the audio stream
      const speechResponse = await fetch("/api/speech/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      
      if (!speechResponse.ok) throw new Error("Failed to get speech stream");
      
      // Create a blob from the stream response
      const blob = await speechResponse.blob();
      const url = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(err => {
          console.error("Error playing audio:", err);
        });
      }
      
      setIsStreamingAudio(false);
      setIsLoading(false);
      
    } catch (error) {
      console.error("Error streaming audio:", error);
      setIsStreamingAudio(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">AI Voice Chat with Streaming</h1>
        <p className="text-gray-600">Chat with an AI and hear its streaming response</p>
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
              {isLoading ? 
                (isStreamingText ? "Generating text..." : "Generating audio...") : 
                "Send Message"}
            </button>
          </div>
        </form>

        {response && (
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h2 className="font-medium mb-2">
              Response: {isStreamingText && <span className="text-blue-500">(Streaming...)</span>}
            </h2>
            <p>{response}</p>
          </div>
        )}

        <div className="mb-6">
          <h2 className="font-medium mb-2">
            Audio Response: {isStreamingAudio && <span className="text-blue-500">(Generating...)</span>}
          </h2>
          <audio ref={audioRef} controls className="w-full" />
        </div>
      </main>

      <footer className="py-4 text-center text-gray-500 text-sm">
        Powered by OpenAI and ElevenLabs
      </footer>
    </div>
  );
}