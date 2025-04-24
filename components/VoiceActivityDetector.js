"use client";

import { useState, useEffect, useRef } from 'react';
import { useMicVAD } from "@ricky0123/vad-react";
import audioBufferToWav from 'audiobuffer-to-wav';

export default function VoiceActivityDetector({ onSpeechEnd, disabled }) {
  const [status, setStatus] = useState("inactive");
  const audioContextRef = useRef(null);
  
  // Initialize audio context for conversion
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000 // Match the sample rate from VAD
      });
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Function to convert Float32Array to WAV
  const convertToWav = async (audioData) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
    }
    
    // Create an AudioBuffer (mono, at 16kHz)
    const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 16000);
    const channelData = audioBuffer.getChannelData(0);
    
    // Copy the audio data to the buffer
    channelData.set(audioData);
    
    // Convert AudioBuffer to WAV format
    const wavBuffer = audioBufferToWav(audioBuffer);
    
    // Create a Blob with the correct MIME type
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };
  
  const vad = useMicVAD({
    onSpeechStart: () => {
      setStatus("speaking");
    },
    onSpeechEnd: async (audioData) => {
      setStatus("processing");
      try {
        // Log the format of audioData for debugging
        console.log("Audio data received:", typeof audioData, audioData instanceof Float32Array, audioData.length);
        
        // Convert the Float32Array to a WAV Blob
        const wavBlob = await convertToWav(audioData);
        onSpeechEnd(wavBlob);
      } catch (error) {
        console.error("Error converting audio:", error);
        setStatus("inactive");
      }
    },
    onVADMisfire: () => {
      setStatus("inactive");
    },
    // Automatically start listening when component mounts
    startOnLoad: !disabled,
    // Tune these parameters based on desired sensitivity
    minSpeechFrames: 5, // Minimum number of consecutive speech frames to trigger onSpeechStart
    positiveSpeechThreshold: 0.80, // Confidence threshold (0-1)
    negativeSpeechThreshold: 0.75, // Threshold to determine end of speech (0-1)
    preSpeechPadFrames: 5, // Frames to include before speech starts
    redemptionFrames: 3, // Frames to wait after speech seems to have ended
  });

  // Manage state when disabled prop changes
  useEffect(() => {
    if (disabled && vad.listening) {
      vad.pause();
      setStatus("inactive");
    } else if (!disabled && !vad.listening && !vad.loading) {
      vad.start();
    }
  }, [disabled, vad]);

  return (
    <div className={`w-full max-w-md p-6 rounded-lg shadow-sm mb-4 ${disabled ? 'bg-gray-200' : 'bg-gray-50'}`}>
      <div className="flex justify-between mb-4">
        <div className="text-lg font-medium">Voice Detection {disabled ? "Paused" : vad.listening ? "Active" : "Inactive"}</div>
        <div>
          {!disabled && vad.listening ? (
            <button
              onClick={() => vad.pause()}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
              disabled={disabled}
            >
              Pause Listening
            </button>
          ) : (
            <button
              onClick={() => vad.start()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              disabled={disabled || vad.loading}
            >
              {disabled ? "Waiting..." : "Start Listening"}
            </button>
          )}
        </div>
      </div>
      
      <div className="text-center">
        {vad.loading && (
          <div className="flex items-center justify-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse mr-2"></div>
            <p>Loading voice detection model...</p>
          </div>
        )}
        
        {vad.listening && status === "speaking" && (
          <div className="flex items-center justify-center">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
            <p>Listening to your voice...</p>
          </div>
        )}
        
        {status === "processing" && (
          <div className="flex items-center justify-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
            <p>Processing your speech...</p>
          </div>
        )}
        
        {disabled && (
          <div className="flex items-center justify-center">
            <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
            <p>Voice detection temporarily disabled while AI is responding</p>
          </div>
        )}
        
        {vad.error && (
          <div className="text-red-500 mt-2">
            Error: {vad.error}
          </div>
        )}
      </div>
    </div>
  );
}