"use client";

import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    setResponse("");
    setAudioUrl("");

    try {
      // Step 1: Get chat completion from OpenAI
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!chatResponse.ok) throw new Error("Failed to get chat response");
      const chatData = await chatResponse.json();
      setResponse(chatData.text);

      // Step 2: Convert response text to speech
      const speechResponse = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chatData.text }),
      });

      if (!speechResponse.ok) throw new Error("Failed to get speech");
      
      // Create audio URL
      const audioBlob = await speechResponse.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
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
        <h1 className="text-2xl font-bold">AI Voice Chat</h1>
        <p className="text-gray-600">Chat with an AI and hear its response</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link 
            href="/stream" 
            className="text-blue-600 hover:underline"
          >
            Try streaming version →
          </Link>
          <Link 
            href="/combined" 
            className="text-blue-600 hover:underline"
          >
            Try combined version →
          </Link>
          <Link 
            href="/realtime" 
            className="text-blue-600 hover:underline"
          >
            Try real-time version →
          </Link>
          <Link 
            href="/websocket" 
            className="text-blue-600 hover:underline"
          >
            Try WebSocket version →
          </Link>
          <Link 
            href="/combined-stream" 
            className="text-blue-600 hover:underline"
          >
            Try Combined WebSocket Streaming →
          </Link>
          <Link 
            href="/voice-chat" 
            className="text-blue-600 hover:underline font-bold bg-blue-50 px-3 py-1 rounded-md"
          >
            Try Voice Chat → 🎤
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

        {audioUrl && (
          <div className="mb-6">
            <h2 className="font-medium mb-2">Audio Response:</h2>
            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-gray-500 text-sm">
        <p>Powered by OpenAI and ElevenLabs</p>
        <p className="mt-2 text-xs">
          Demo Versions: 
          <span className="mx-1 px-2 py-0.5 bg-gray-100 rounded">Standard</span>
          <span className="mx-1 px-2 py-0.5 bg-gray-100 rounded">Streaming</span>
          <span className="mx-1 px-2 py-0.5 bg-gray-100 rounded">Combined</span>
          <span className="mx-1 px-2 py-0.5 bg-gray-100 rounded">Real-time</span>
          <span className="mx-1 px-2 py-0.5 bg-gray-100 rounded">WebSocket</span>
          <span className="mx-1 px-2 py-0.5 bg-blue-100 rounded">Combined-Stream</span>
          <span className="mx-1 px-2 py-0.5 bg-green-100 rounded font-bold">Voice Chat 🎤</span>
        </p>
      </footer>
    </div>
  );
}