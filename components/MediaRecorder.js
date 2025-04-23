"use client";

import { useState, useRef } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';

export default function MediaRecorder({ onTranscribe, isProcessing }) {
  const [audioData, setAudioData] = useState(null);
  const audioRef = useRef(null);

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    clearBlobUrl,
  } = useReactMediaRecorder({
    audio: true,
    video: false,
    // Specify audio MIME type for better compatibility
    mediaRecorderOptions: {
      mimeType: 'audio/webm',
    },
    onStop: async (blobUrl, blob) => {
      // Set the audio source for preview
      if (audioRef.current) {
        audioRef.current.src = blobUrl;
      }
      
      setAudioData(blob);
    }
  });

  // Handle start recording button
  const handleStartRecording = () => {
    clearBlobUrl();
    setAudioData(null);
    startRecording();
  };

  // Handle the transcribe button
  const handleTranscribe = () => {
    if (audioData) {
      onTranscribe(audioData);
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-gray-50 rounded-lg shadow-sm mb-4">
      <div className="flex justify-between mb-4">
        <button
          onClick={handleStartRecording}
          disabled={status === "recording" || isProcessing}
          className={`px-4 py-2 rounded-md ${
            status === "recording"
              ? "bg-red-500 text-white"
              : "bg-blue-500 text-white hover:bg-blue-600"
          } disabled:opacity-50`}
        >
          {status === "recording" ? "Recording..." : "Start Recording"}
        </button>
        
        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
          >
            Stop Recording
          </button>
        )}
      </div>
      
      <div className="text-center">
        {status === "recording" && (
          <div className="flex items-center justify-center">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
            <p>Recording in progress...</p>
          </div>
        )}
      </div>
      
      {mediaBlobUrl && (
        <div className="mt-4">
          <audio ref={audioRef} controls className="w-full mb-4" src={mediaBlobUrl} />
          
          <button
            onClick={handleTranscribe}
            disabled={isProcessing || !audioData}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Transcribe Audio
          </button>
        </div>
      )}
    </div>
  );
}