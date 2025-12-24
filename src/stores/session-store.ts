import { create } from 'zustand';
import type { SessionMode } from '@/types';

interface SessionState {
  sessionId: string | null;
  mode: SessionMode;
  isConnected: boolean;
  setSessionId: (id: string | null) => void;
  setMode: (mode: SessionMode) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  mode: 'text',
  isConnected: false,
  setSessionId: (id) => set({ sessionId: id }),
  setMode: (mode) => set({ mode }),
  setConnected: (connected) => set({ isConnected: connected }),
  reset: () =>
    set({
      sessionId: null,
      mode: 'text',
      isConnected: false,
    }),
}));
