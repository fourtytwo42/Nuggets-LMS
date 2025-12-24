import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInterface from '@/components/learner/ChatInterface';

describe('ChatInterface', () => {
  it('should render chat interface', () => {
    render(<ChatInterface sessionId="session-id" />);
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('should send message when clicking send button', async () => {
    render(<ChatInterface sessionId="session-id" />);
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(
      () => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should send message when pressing Enter', async () => {
    render(<ChatInterface sessionId="session-id" />);
    const input = screen.getByPlaceholderText('Type your message...');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(
      () => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should call onSendMessage callback when provided', async () => {
    const onSendMessage = jest.fn().mockResolvedValue(undefined);
    render(<ChatInterface sessionId="session-id" onSendMessage={onSendMessage} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith('Hello');
    });
  });

  it('should disable input and button while loading', async () => {
    const onSendMessage = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
    render(<ChatInterface sessionId="session-id" onSendMessage={onSendMessage} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });
});
