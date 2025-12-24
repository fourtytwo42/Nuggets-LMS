'use client';

import { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/Button';

interface VoiceInterfaceProps {
  sessionId: string;
  onVoiceMessage?: (audioBlob: Blob) => Promise<void>;
  onVoiceResponse?: (audioUrl: string) => void;
}

export default function VoiceInterface({
  sessionId,
  onVoiceMessage,
  onVoiceResponse,
}: VoiceInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (onVoiceMessage) {
          try {
            await onVoiceMessage(audioBlob);
          } catch (error) {
            console.error('Error sending voice message:', error);
          }
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleVoiceMode = () => {
    if (isListening) {
      setIsListening(false);
      if (isRecording) {
        stopRecording();
      }
    } else {
      setIsListening(true);
      startRecording();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Voice Conversation</h3>
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={toggleVoiceMode}
          className={`p-6 rounded-full transition-colors ${
            isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          <MicrophoneIcon className="h-8 w-8" />
        </button>
        <p className="text-sm text-gray-600">
          {isListening ? 'Listening... Click to stop' : 'Click to start voice conversation'}
        </p>
        {isRecording && (
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            <div
              className="w-2 h-2 bg-red-600 rounded-full animate-pulse"
              style={{ animationDelay: '0.1s' }}
            ></div>
            <div
              className="w-2 h-2 bg-red-600 rounded-full animate-pulse"
              style={{ animationDelay: '0.2s' }}
            ></div>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-4 text-center">
        Voice conversation uses Gemini Live API for 2-way communication
      </p>
    </div>
  );
}
