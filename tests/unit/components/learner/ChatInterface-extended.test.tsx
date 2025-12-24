import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInterface from '@/components/learner/ChatInterface';

describe('ChatInterface Extended Tests', () => {
  it('should handle error in onSendMessage', async () => {
    const onSendMessage = jest.fn().mockRejectedValue(new Error('API error'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<ChatInterface sessionId="session-id" onSendMessage={onSendMessage} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should not send empty messages', () => {
    const onSendMessage = jest.fn();
    render(<ChatInterface sessionId="session-id" onSendMessage={onSendMessage} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(sendButton);

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('should not send message when loading', async () => {
    const onSendMessage = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));
    render(<ChatInterface sessionId="session-id" onSendMessage={onSendMessage} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'First' } });
    fireEvent.click(sendButton);

    // Try to send another while loading
    fireEvent.change(input, { target: { value: 'Second' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle Enter key press', async () => {
    render(<ChatInterface sessionId="session-id" />);
    const input = screen.getByPlaceholderText('Type your message...') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Enter test' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Enter test')).toBeInTheDocument();
    });
  });

  it('should not send on Enter if input is empty', () => {
    render(<ChatInterface sessionId="session-id" />);
    const input = screen.getByPlaceholderText('Type your message...');

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(screen.queryByText(/placeholder response/i)).not.toBeInTheDocument();
  });
});
