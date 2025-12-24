'use client';

import { useState, useEffect } from 'react';
import { useSessionStore } from '@/stores/session-store';

export interface Session {
  id: string;
  learnerId: string;
  currentNodeId: string | null;
  mode: 'text' | 'voice';
  startedAt: Date;
  lastActivity: Date;
  completedAt: Date | null;
  currentNode?: {
    id: string;
    nugget: {
      id: string;
      content: string;
      metadata: any;
      imageUrl: string | null;
      audioUrl: string | null;
    };
    choices: any[];
  };
}

/**
 * Hook to manage learning session
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  /**
   * Create a new session
   */
  const createSession = async (mode: 'text' | 'voice' = 'text') => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/learning/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const data = await response.json();
      setSession(data.session);
      return data.session;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get session by ID
   */
  const getSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`/api/learning/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get session');
      }

      const data = await response.json();
      setSession(data.session);
      return data.session;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get session';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get or create active session
   */
  const getOrCreateSession = async (mode: 'text' | 'voice' = 'text') => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Try to get active sessions first
      const response = await fetch('/api/learning/sessions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sessions && data.sessions.length > 0) {
          // Use the most recent active session
          const activeSession = data.sessions[0];
          const fetchedSession = await getSession(activeSession.id);
          return fetchedSession;
        }
      }

      // No active session, create a new one
      return await createSession(mode);
    } catch (err) {
      // If getting sessions fails, try creating a new one
      return await createSession(mode);
    }
  };

  /**
   * Update current node
   */
  const updateCurrentNode = async (sessionId: string, nodeId: string, choiceId?: string) => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`/api/learning/sessions/${sessionId}/current-node`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nodeId, choiceId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update current node');
      }

      const data = await response.json();
      setSession(data.session);
      return data.session;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update current node';
      setError(errorMessage);
      throw err;
    }
  };

  /**
   * Complete session
   */
  const completeSession = async (sessionId: string) => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`/api/learning/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete session');
      }

      // Refresh session to get updated status
      if (session) {
        await getSession(session.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete session';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    session,
    isLoading,
    error,
    createSession,
    getSession,
    getOrCreateSession,
    updateCurrentNode,
    completeSession,
  };
}
