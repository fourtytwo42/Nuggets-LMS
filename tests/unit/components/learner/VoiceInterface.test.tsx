import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VoiceInterface from '@/components/learner/VoiceInterface';

// Mock MediaRecorder
let mockMediaRecorderInstance: any = null;
global.MediaRecorder = jest.fn().mockImplementation(() => {
  mockMediaRecorderInstance = {
    start: jest.fn(),
    stop: jest.fn(),
    state: 'inactive',
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

  it('should call onVoiceMessage when recording stops', async () => {
    const onVoiceMessage = jest.fn().mockResolvedValue(undefined);
    render(<VoiceInterface sessionId="session-id" onVoiceMessage={onVoiceMessage} />);

    const button = screen.getByRole('button');
    fireEvent.click(button); // Start

    await waitFor(
      () => {
        expect(screen.getByText(/Listening/i)).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    // Wait a bit for MediaRecorder to be set up
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate MediaRecorder stop event
    if (mockMediaRecorderInstance && mockMediaRecorderInstance.onstop) {
      // Create mock audio chunks
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockMediaRecorderInstance.ondataavailable({ data: mockBlob } as any);
      mockMediaRecorderInstance.onstop();
    }

    fireEvent.click(button); // Stop

    await waitFor(
      () => {
        expect(onVoiceMessage).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });
});
