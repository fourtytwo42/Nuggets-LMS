import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary Extended Tests', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
    // Suppress error output in tests
  });

  beforeEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should render custom fallback', () => {
    const fallback = <div>Custom error fallback</div>;
    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
  });

  it('should log error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // ErrorBoundary logs to console.error in componentDidCatch
    // React also logs errors, so we check that console.error was called
    expect(consoleErrorSpy).toHaveBeenCalled();
    // Check for ErrorBoundary-specific log message
    const calls = consoleErrorSpy.mock.calls;
    const hasErrorBoundaryLog = calls.some(
      (call) =>
        call[0] && typeof call[0] === 'string' && call[0].includes('ErrorBoundary caught an error')
    );
    expect(hasErrorBoundaryLog).toBe(true);
  });

  it('should show error message', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should handle reload button click', () => {
    // Mock window.location.reload by replacing the entire location object
    const reloadSpy = jest.fn();
    const originalLocation = { ...window.location };

    // Create a mock location object
    const mockLocation = {
      ...originalLocation,
      reload: reloadSpy,
    };

    // Replace window.location entirely
    delete (window as any).location;
    (window as any).location = mockLocation;

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Page');
    fireEvent.click(reloadButton);

    expect(reloadSpy).toHaveBeenCalled();

    // Restore original location
    (window as any).location = originalLocation;
  });

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});
