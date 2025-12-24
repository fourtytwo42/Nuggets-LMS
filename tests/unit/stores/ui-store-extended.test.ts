import { useUIStore } from '@/stores/ui-store';

describe('UI Store Extended Tests', () => {
  beforeEach(() => {
    useUIStore.getState().setSidebarOpen(true);
  });

  it('should toggle sidebar', () => {
    const { toggleSidebar } = useUIStore.getState();
    const initial = useUIStore.getState().sidebarOpen;
    toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(!initial);
  });

  it('should set sidebar open', () => {
    const { setSidebarOpen } = useUIStore.getState();
    setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('should toggle sidebar multiple times', () => {
    const { toggleSidebar } = useUIStore.getState();
    const initial = useUIStore.getState().sidebarOpen;
    toggleSidebar();
    toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(initial);
  });
});
