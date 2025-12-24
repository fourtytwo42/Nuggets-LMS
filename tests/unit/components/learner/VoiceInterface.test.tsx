import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VoiceInterface from '@/components/learner/VoiceInterface';

// Mock useWebSocket hook
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn().mockReturnValue({
    isConnected: true,
    sendMessage: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

// Mock MediaRecorder
let mockMediaRecorderInstance: any = null;
global.MediaRecorder = jest.fn().mockImplementation(() => {
  mockMediaRecorderInstance = {
    start: jest.fn(),
    stop: jest.fn(),
    state: 'inactive',
    stream: {
      getTracks: jest.fn().mockReturnValue([
        {
          stop: jest.fn(),
        },
      ]),
    },
    ondataavailable: null,
    onstop: null,
  };
  return mockMediaRecorderInstance;
});

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: jest.fn().mockReturnValue([
      {
        stop: jest.fn(),
      },
    ]),
  }),
} as any;

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(),
  onloadend: null,
  result: 'data:audio/webm;base64,base64audio',
})) as any;

describe('VoiceInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMediaRecorderInstance = null;
  });

  it('should render voice interface', () => {
    render(<VoiceInterface sessionId="session-id" />);
    expect(screen.getByText('Voice Conversation')).toBeInTheDocument();
  });

  it('should start recording when microphone is clicked', async () => {
    render(<VoiceInterface sessionId="session-id" />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Listening/i)).toBeInTheDocument();
    });
  });

  it('should send voice data via WebSocket when recording', async () => {
    const { useWebSocket } = require('@/hooks/useWebSocket');
    const mockSendMessage = jest.fn();
    (useWebSocket as jest.Mock).mockReturnValue({
      isConnected: true,
      sendMessage: mockSendMessage,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    render(<VoiceInterface sessionId="session-id" />);

    const button = screen.getByRole('button');
    fireEvent.click(button); // Start

    await waitFor(
      () => {
        expect(screen.getByText(/Listening/i)).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    // Wait for MediaRecorder to be set up
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate data available event
    if (mockMediaRecorderInstance && mockMediaRecorderInstance.ondataavailable) {
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockMediaRecorderInstance.ondataavailable({ data: mockBlob } as any);
    }

    // Should have sent voice start event
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'session:voice:start',
      })
    );
  });

  it('should handle WebSocket disconnection', () => {
    const { useWebSocket } = require('@/hooks/useWebSocket');
    (useWebSocket as jest.Mock).mockReturnValue({
      isConnected: false,
      sendMessage: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    render(<VoiceInterface sessionId="session-id" />);

    // Should show connection message
    expect(screen.getByText(/Connecting/i)).toBeInTheDocument();
  });
});
