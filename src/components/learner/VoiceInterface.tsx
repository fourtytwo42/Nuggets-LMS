'use client';

import { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/Button';
import { useWebSocket } from '@/hooks/useWebSocket';

interface VoiceInterfaceProps {
  sessionId: string;
  onVoiceResponse?: (audioUrl: string) => void;
}

export default function VoiceInterface({ sessionId, onVoiceResponse }: VoiceInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);

  // WebSocket connection for real-time voice
  const { isConnected, sendMessage: wsSendMessage } = useWebSocket({
    sessionId,
    onMessage: (message) => {
      switch (message.event) {
        case 'session:voice:started':
          setIsListening(true);
          break;
        case 'session:voice:stopped':
          setIsListening(false);
          setIsRecording(false);
          break;
        case 'session:voice:response':
          handleVoiceResponse(message.data);
          break;
        case 'error':
          console.error('Voice error:', message.data);
          setIsProcessing(false);
          break;
      }
    },
    reconnect: true,
  });

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      audioQueueRef.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  /**
   * Handle voice response from server
   */
  const handleVoiceResponse = async (data: any) => {
    try {
      setIsProcessing(false);

      if (data.audio) {
        // Convert base64 to audio blob
        const audioBlob = await fetch(
          `data:audio/${data.format || 'mp3'};base64,${data.audio}`
        ).then((r) => r.blob());
        const audioUrl = URL.createObjectURL(audioBlob);

        // Play audio response
        const audio = new Audio(audioUrl);
        audioQueueRef.current.push(audio);

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          const index = audioQueueRef.current.indexOf(audio);
          if (index > -1) {
            audioQueueRef.current.splice(index, 1);
          }
        };

        audio.onerror = (error) => {
          console.error('Error playing audio:', error);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();

        if (onVoiceResponse) {
          onVoiceResponse(audioUrl);
        }
      }
    } catch (error) {
      console.error('Error handling voice response:', error);
    }
  };

  /**
   * Start voice recording and streaming
   */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          // Convert blob to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            const base64Data = base64Audio.split(',')[1]; // Remove data URL prefix

            // Send audio chunk via WebSocket
            if (isConnected) {
              wsSendMessage({
                event: 'session:voice:data',
                data: {
                  audio: base64Data,
                  format: 'webm',
                },
              });
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Start recording with timeslice for streaming
      mediaRecorder.start(1000); // Send chunks every 1 second
      setIsRecording(true);
      setIsProcessing(true);

      // Start voice session on server
      if (isConnected) {
        wsSendMessage({
          event: 'session:voice:start',
          data: {},
        });
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  /**
   * Stop voice recording
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }

      // Stop voice session on server
      if (isConnected) {
        wsSendMessage({
          event: 'session:voice:stop',
          data: {},
        });
      }
    }
  };

  /**
   * Toggle voice mode
   */
  const toggleVoiceMode = () => {
    if (isListening || isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Voice Conversation</h3>
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={toggleVoiceMode}
          disabled={!isConnected || isProcessing}
          className={`p-6 rounded-full transition-colors ${
            isListening || isRecording
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <MicrophoneIcon className="h-8 w-8" />
        </button>
        <p className="text-sm text-gray-600 text-center">
          {!isConnected
            ? 'Connecting...'
            : isProcessing
              ? 'Processing...'
              : isListening || isRecording
                ? 'Listening... Click to stop'
                : 'Click to start voice conversation'}
        </p>
        {(isRecording || isProcessing) && (
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
        Voice conversation uses real-time 2-way communication
      </p>
      {!isConnected && (
        <p className="text-xs text-yellow-600 mt-2 text-center">
          WebSocket not connected. Voice mode requires an active connection.
        </p>
      )}
    </div>
  );
}
