import { useSessionStore } from '@/stores/session-store';

describe('Session Store Extended Tests', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('should set session ID', () => {
    const { setSessionId } = useSessionStore.getState();
    setSessionId('session-123');
    expect(useSessionStore.getState().sessionId).toBe('session-123');
  });

  it('should set mode', () => {
    const { setMode } = useSessionStore.getState();
    setMode('voice');
    expect(useSessionStore.getState().mode).toBe('voice');
  });

  it('should set connected state', () => {
    const { setConnected } = useSessionStore.getState();
    setConnected(true);
    expect(useSessionStore.getState().isConnected).toBe(true);
  });

  it('should reset all state', () => {
    const { setSessionId, setMode, setConnected, reset } = useSessionStore.getState();
    setSessionId('session-123');
    setMode('voice');
    setConnected(true);

    reset();

    expect(useSessionStore.getState().sessionId).toBeNull();
    expect(useSessionStore.getState().mode).toBe('text');
    expect(useSessionStore.getState().isConnected).toBe(false);
  });

  it('should handle null session ID', () => {
    const { setSessionId } = useSessionStore.getState();
    setSessionId('session-123');
    setSessionId(null);
    expect(useSessionStore.getState().sessionId).toBeNull();
  });
});
