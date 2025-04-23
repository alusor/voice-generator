"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Componente wrapper para el react-media-recorder
const MediaRecorder = dynamic(
  () => import("../../components/MediaRecorder"),
  { ssr: false } // Esto evita que el componente se renderice en el servidor
);

export default function VoiceChat() {
  const [response, setResponse] = useState("");
  const [transcribedText, setTranscribedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [useInverso, setUseInverso] = useState(false);
  const audioContextRef = useRef(null);
  const audioQueue = useRef([]);
  const isPlaying = useRef(false);
  const webSocketRef = useRef(null);
  const currentChunkRef = useRef("");

  // Initialize audio context
  useEffect(() => {
    const handleInteraction = () => {
      if (!audioContextRef.current && typeof window !== 'undefined' && window.AudioContext) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.removeEventListener('click', handleInteraction);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleInteraction);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('click', handleInteraction);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, []);

  // Function to transcribe recorded audio
  const transcribeAudio = async (audioBlob) => {
    if (!audioBlob) return;
    
    setIsTranscribing(true);
    
    try {
      // Create FormData with the blob
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      
      // Send to our API
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to transcribe audio');
      }
      
      setTranscribedText(data.text);
      
      // Automatically process the transcribed text if we have it
      if (data.text && data.text.trim()) {
        processTranscribedText(data.text);
      } else {
        setIsTranscribing(false);
        console.warn('Received empty transcription');
      }
      
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setTranscribedText("Sorry, I couldn't transcribe your audio.");
      setIsTranscribing(false);
    }
  };

  // Function to play audio from base64
  const playAudio = async (base64Audio) => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
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

  // Process the transcribed text
  const processTranscribedText = async (text) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    setResponse("");
    audioQueue.current = [];
    currentChunkRef.current = "";
    
    // Add user message to conversation
    setConversationHistory(prev => [...prev, { role: 'user', content: text }]);
    
    try {
      // Check if Inverso API key is configured when using Inverso
      if (useInverso) {
        const configResponse = await fetch('/api/elevenlabs-config');
        const config = await configResponse.json();
        
        if (!config.inversoApiKey) {
          throw new Error('INVERSO_API_KEY is not defined in environment variables');
        }
      }
      
      // Set up WebSocket first
      await setupElevenLabsWebSocket();
      
      // Start streaming from selected API (OpenAI or Inverso)
      const streamUrl = `/api/chat/stream?message=${encodeURIComponent(text)}&useInverso=${useInverso}`;
      const eventSource = new EventSource(streamUrl);
      
      let fullResponse = '';
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.text) {
            // Update the UI
            fullResponse += data.text;
            setResponse(fullResponse);
            
            // Send text to ElevenLabs
            sendTextChunk(data.text);
          }
        } catch (error) {
          console.error("Error parsing SSE message:", error);
        }
      };
      
      eventSource.onerror = () => {
        eventSource.close();
        
        // Add assistant message to conversation
        setConversationHistory(prev => [...prev, { role: 'assistant', content: fullResponse }]);
        
        // Flush any remaining text to ElevenLabs
        flushRemainingText();
        
        setIsProcessing(false);
        setIsTranscribing(false);
      };
      
    } catch (error) {
      console.error("Error:", error);
      setResponse("Sorry, there was an error processing your request.");
      setIsProcessing(false);
      setIsTranscribing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Voice Chat</h1>
        <p className="text-gray-600">Speak to AI and hear its response</p>
        <div className="mt-4">
          <Link href="/" className="text-blue-600 hover:underline">
            Back to Home
          </Link>
        </div>
        <div className="mt-4 flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <span className="mr-3 text-sm font-medium text-gray-700">OpenAI</span>
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={useInverso}
                onChange={() => setUseInverso(prev => !prev)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700">Inverso</span>
          </label>
        </div>
      </header>

      <main className="flex-grow">
        <div className="mb-6 flex flex-col items-center">
          {/* Insertar el componente MediaRecorder */}
          <MediaRecorder onTranscribe={transcribeAudio} isProcessing={isProcessing || isTranscribing} />
          
          {isTranscribing && (
            <div className="w-full max-w-md mt-4 p-4 bg-blue-50 rounded-md mb-4">
              <p className="text-center text-blue-500">Transcribing your audio...</p>
            </div>
          )}
          
          {transcribedText && (
            <div className="w-full max-w-md mt-4 p-4 bg-white rounded-md border mb-4">
              <p className="font-medium mb-1">You said:</p>
              <p>{transcribedText}</p>
            </div>
          )}
          
          {isProcessing && (
            <div className="w-full max-w-md p-4 bg-blue-50 rounded-md mb-4">
              <p className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></span>
                {isConnected ? "Generating response..." : "Connecting..."}
              </p>
            </div>
          )}
        </div>
        
        <div className="w-full max-w-2xl mx-auto">
          {/* Conversation history */}
          <div className="space-y-4 mb-6">
            {conversationHistory.map((message, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-50 ml-auto' 
                    : 'bg-gray-50'
                } max-w-[80%] ${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
              >
                <p>{message.content}</p>
              </div>
            ))}
            
            {/* Current response */}
            {response && isProcessing && (
              <div className="p-4 rounded-lg bg-gray-50 max-w-[80%] mr-auto">
                <p>{response}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-gray-500 text-sm">
        <p>Powered by {useInverso ? "Inverso" : "OpenAI"} (OpenAI Whisper for STT) and ElevenLabs</p>
      </footer>
    </div>
  );
}