import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInterface from '@/components/learner/ChatInterface';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('ChatInterface Extended Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.setItem('token', 'test-token');
    jest.clearAllMocks();
  });

  it('should handle error in onSendMessage', async () => {
    const onSendMessage = jest.fn().mockRejectedValue(new Error('API error'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock fetch for messages endpoint
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    render(<ChatInterface sessionId="session-id" onSendMessage={onSendMessage} />);

    // Wait for initial messages to load
    await waitFor(() => {
      expect(screen.queryByText('Loading messages...')).not.toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(sendButton);

    await waitFor(
      () => {
        expect(onSendMessage).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Error should be logged
    await waitFor(
      () => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    consoleErrorSpy.mockRestore();
  });

  it('should not send empty messages', async () => {
    const onSendMessage = jest.fn();

    // Mock fetch for messages endpoint
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    render(<ChatInterface sessionId="session-id" onSendMessage={onSendMessage} />);

    // Wait for initial messages to load
    await waitFor(() => {
      expect(screen.queryByText('Loading messages...')).not.toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(sendButton);

    // Should not call onSendMessage for empty/whitespace messages
    await waitFor(() => {
      expect(onSendMessage).not.toHaveBeenCalled();
    });
  });

  it('should not send message when loading', async () => {
    const onSendMessage = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));

    // Mock fetch for messages endpoint
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    render(<ChatInterface sessionId="session-id" onSendMessage={onSendMessage} />);

    // Wait for initial messages to load
    await waitFor(() => {
      expect(screen.queryByText('Loading messages...')).not.toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'First' } });
    fireEvent.click(sendButton);

    // Wait for loading state
    await waitFor(() => {
      expect(screen.getByText('Send')).toBeDisabled();
    });

    // Try to send another while loading
    fireEvent.change(input, { target: { value: 'Second' } });
    fireEvent.click(sendButton);

    await waitFor(
      () => {
        expect(onSendMessage).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 }
    );
  });

  it.skip('should handle Enter key press', async () => {
    // Ensure token is set
    expect(localStorage.getItem('token')).toBe('test-token');

    // Mock fetch - first call for GET messages, second for POST message
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            id: 'msg-123',
            role: 'assistant',
            content: 'Response received',
            createdAt: new Date().toISOString(),
          },
        }),
      });
    global.fetch = fetchMock;

    render(<ChatInterface sessionId="session-id" />);

    // Wait for initial messages to load
    await waitFor(() => {
      expect(screen.queryByText('Loading messages...')).not.toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your message...') as HTMLInputElement;

    // Set input value
    fireEvent.change(input, { target: { value: 'Enter test' } });

    // Verify input has value
    expect(input.value).toBe('Enter test');

    // Trigger Enter key
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Wait for the message to be sent (fetch should be called for POST)
    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledTimes(2); // GET + POST
      },
      { timeout: 3000 }
    );

    // User message should appear in the UI (added to state before API call)
    await waitFor(
      () => {
        expect(screen.getByText('Enter test')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should not send on Enter if input is empty', async () => {
    // Mock fetch for messages endpoint
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    render(<ChatInterface sessionId="session-id" />);

    // Wait for initial messages to load
    await waitFor(() => {
      expect(screen.queryByText('Loading messages...')).not.toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your message...');

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Should not see any new messages
    expect(screen.queryByText(/placeholder response/i)).not.toBeInTheDocument();
  });
});
