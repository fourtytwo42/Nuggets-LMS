import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '@/stores/ui-store';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useUIStore());
    act(() => {
      result.current.setSidebarOpen(true);
    });
  });

  it('should initialize with sidebar open', () => {
    const { result } = renderHook(() => useUIStore());

    expect(result.current.sidebarOpen).toBe(true);
  });

  it('should toggle sidebar', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.sidebarOpen).toBe(false);

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.sidebarOpen).toBe(true);
  });

  it('should set sidebar open state', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.setSidebarOpen(false);
    });

    expect(result.current.sidebarOpen).toBe(false);

    act(() => {
      result.current.setSidebarOpen(true);
    });

    expect(result.current.sidebarOpen).toBe(true);
  });
});
