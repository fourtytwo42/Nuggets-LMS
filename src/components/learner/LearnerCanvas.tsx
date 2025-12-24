'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { useWebSocket } from '@/hooks/useWebSocket';
import ChatInterface from './ChatInterface';
import VoiceInterface from './VoiceInterface';
import MediaWidget from './MediaWidget';
import { Button } from '@/components/ui/Button';

interface LearnerCanvasProps {
  sessionId: string;
}

export default function LearnerCanvas({ sessionId }: LearnerCanvasProps) {
  const { session, isLoading, error, getSession, updateCurrentNode } = useSession();
  const [showChat, setShowChat] = useState(true);
  const [currentMedia, setCurrentMedia] = useState<{ type: 'image' | 'audio'; url: string } | null>(
    null
  );
  const [messages, setMessages] = useState<any[]>([]);

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // WebSocket connection for real-time updates
  const wsHook = useWebSocket({
    sessionId,
    onMessage: (message) => {
      switch (message.event) {
        case 'session:joined':
          // Session joined, refresh session data
          if (sessionId) {
            getSession(sessionId);
          }
          break;
        case 'session:message':
          // New message received
          setMessages((prev) => [...prev, message.data]);
          break;
        case 'session:node:updated':
          // Node updated, refresh session
          if (sessionId) {
            getSession(sessionId);
          }
          break;
        case 'session:progress:updated':
          // Progress updated (can be used for progress panel)
          break;
        case 'session:media:show':
          // Media to show
          if (message.data?.type && message.data?.url) {
            setCurrentMedia({
              type: message.data.type,
              url: message.data.url,
            });
          }
          break;
        case 'error':
          console.error('WebSocket error:', message.data);
          break;
      }
    },
    onError: (error) => {
      console.error('WebSocket connection error:', error);
    },
    onOpen: () => {
      console.log('WebSocket connected');
    },
    onClose: () => {
      console.log('WebSocket disconnected');
    },
    reconnect: true,
  });

  useEffect(() => {
    // Fetch session details
    if (sessionId) {
      getSession(sessionId);
    }
  }, [sessionId, getSession]);

  // Remove periodic refresh when WebSocket is connected (real-time updates)
  useEffect(() => {
    if (!wsHook.isConnected) {
      // Refresh session periodically to get updates when WebSocket is not connected
      const interval = setInterval(() => {
        if (sessionId && session) {
          getSession(sessionId);
        }
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [sessionId, session, getSession, wsHook.isConnected]);

  const handleChoiceSelect = async (choiceId: string, nextNodeId: string) => {
    try {
      if (!session) return;

      // If WebSocket is connected, use it for real-time navigation
      if (wsHook.isConnected) {
        wsHook.sendMessage({
          event: 'session:choice',
          data: { choiceId },
        });
      } else {
        // Fallback to HTTP API
        await updateCurrentNode(session.id, nextNodeId, choiceId);
        // Refresh session
        await getSession(session.id);
      }
    } catch (err) {
      console.error('Error selecting choice:', err);
    }
  };

  const handleSendMessage = async (message: string) => {
    try {
      if (!session) return;

      // If WebSocket is connected, use it for real-time messaging
      if (wsHook.isConnected) {
        wsHook.sendMessage({
          event: 'session:message',
          data: { content: message },
        });
      } else {
        // Fallback to HTTP API
        const token = getToken();
        if (!token) return;

        const response = await fetch(`/api/learning/sessions/${session.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: message }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to send message');
        }

        const data = await response.json();

        // Check if response includes media
        if (data.message?.toolResults) {
          const toolResults = JSON.parse(data.message.toolResults || '[]');
          for (const result of toolResults) {
            if (result.name === 'show_media' && result.result?.data) {
              const { type, url } = result.result.data;
              if (type === 'image' || type === 'audio') {
                setCurrentMedia({ type, url });
              }
            }
          }
        }

        // Refresh session to get updated messages
        await getSession(session.id);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Session not found'}</p>
        </div>
      </div>
    );
  }

  const currentNode = session.currentNode;
  const nugget = currentNode?.nugget;
  const choices = currentNode?.choices || [];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Canvas Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Learning Session</h2>
          <p className="text-sm text-gray-500">
            Started {new Date(session.startedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => {
              // Toggle between text and voice mode
              const newMode = session.mode === 'text' ? 'voice' : 'text';
              // Update session mode via API
              fetch(`/api/learning/sessions/${session.id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ mode: newMode }),
              }).catch(console.error);
            }}
            className={`px-4 py-2 ${session.mode === 'voice' ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {session.mode === 'voice' ? 'Voice Mode' : 'Text Mode'}
          </Button>
          <Button onClick={() => setShowChat(!showChat)} className="px-4 py-2">
            {showChat ? 'Hide Chat' : 'Show Chat'}
          </Button>
        </div>
      </div>

      {/* Canvas Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Current Nugget Content */}
            {nugget ? (
              <>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="prose max-w-none">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Current Learning Content
                    </h3>
                    <div className="text-gray-700 whitespace-pre-wrap">{nugget.content}</div>
                  </div>
                </div>

                {/* Media Widget */}
                {currentMedia && (
                  <MediaWidget
                    type={currentMedia.type}
                    url={currentMedia.url}
                    title={currentMedia.type === 'image' ? 'Learning Image' : 'Audio Narration'}
                  />
                )}

                {/* Nugget Image */}
                {nugget.imageUrl && (
                  <MediaWidget type="image" url={nugget.imageUrl} title="Learning Image" />
                )}

                {/* Nugget Audio */}
                {nugget.audioUrl && (
                  <MediaWidget type="audio" url={nugget.audioUrl} title="Audio Narration" />
                )}

                {/* Narrative Choices */}
                {choices.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      What would you like to do next?
                    </h3>
                    <div className="space-y-3">
                      {choices.map((choice: any) => (
                        <button
                          key={choice.id}
                          onClick={() => handleChoiceSelect(choice.id, choice.nextNodeId)}
                          className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                        >
                          <p className="text-gray-900 font-medium">{choice.text}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-gray-600">
                  No learning content available. Start a conversation with your AI tutor!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Interface Sidebar */}
        {showChat && (
          <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
            {/* Voice Interface */}
            {session.mode === 'voice' && (
              <div className="border-b border-gray-200 p-4">
                <VoiceInterface sessionId={session.id} />
              </div>
            )}

            {/* Text Chat Interface */}
            <div className="flex-1 overflow-hidden">
              <ChatInterface sessionId={session.id} onSendMessage={handleSendMessage} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
