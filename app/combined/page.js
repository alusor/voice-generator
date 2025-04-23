"use client";

import { useState, useRef } from "react";
import Link from "next/link";

export default function CombinedStreamPage() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  const audioRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    setResponse("");
    
    try {
      // Fetch the OpenAI response text
      const aiResponse = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      
      if (!aiResponse.ok) throw new Error("Failed to get AI response");
      const data = await aiResponse.json();
      setResponse(data.text);
      
      // Now request audio stream
      const audioUrl = `/api/tts-stream?message=${encodeURIComponent(message)}`;
      
      // Set the audio source and play
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play().catch(err => {
          console.error("Error playing audio:", err);
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setResponse("Sorry, there was an error processing your request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">AI Voice Chat with Combined Streaming</h1>
        <p className="text-gray-600">Chat with an AI and hear its voice response</p>
        <div className="mt-4 flex space-x-4">
          <Link href="/" className="text-blue-600 hover:underline">
            Standard version
          </Link>
          <Link href="/stream" className="text-blue-600 hover:underline">
            Streaming version
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
            <h2 className="font-medium mb-2">Response:</h2>
            <p>{response}</p>
          </div>
        )}

        <div className="mb-6">
          <h2 className="font-medium mb-2">Audio Response:</h2>
          <audio ref={audioRef} controls className="w-full" />
        </div>
      </main>

      <footer className="py-4 text-center text-gray-500 text-sm">
        Powered by OpenAI and ElevenLabs
      </footer>
    </div>
  );
}