import { renderHook, act } from '@testing-library/react';
import { useSessionStore } from '@/stores/session-store';

describe('useSessionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useSessionStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSessionStore());

    expect(result.current.sessionId).toBeNull();
    expect(result.current.mode).toBe('text');
    expect(result.current.isConnected).toBe(false);
  });

  it('should set session ID', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.setSessionId('session-123');
    });

    expect(result.current.sessionId).toBe('session-123');
  });

  it('should set mode', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.setMode('voice');
    });

    expect(result.current.mode).toBe('voice');
  });

  it('should set connected status', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.setConnected(true);
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should reset all state', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.setSessionId('session-123');
      result.current.setMode('voice');
      result.current.setConnected(true);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.sessionId).toBeNull();
    expect(result.current.mode).toBe('text');
    expect(result.current.isConnected).toBe(false);
  });
});
