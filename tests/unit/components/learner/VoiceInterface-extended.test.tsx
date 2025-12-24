import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VoiceInterface from '@/components/learner/VoiceInterface';

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

global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: jest.fn().mockReturnValue([
      {
        stop: jest.fn(),
      },
    ]),
  }),
} as any;

describe('VoiceInterface Extended Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMediaRecorderInstance = null;
  });

  it('should handle getUserMedia error', async () => {
    (global.navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(
      new Error('Permission denied')
    );
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<VoiceInterface sessionId="session-id" />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle recording state changes', async () => {
    render(<VoiceInterface sessionId="session-id" />);
    const button = screen.getByRole('button');

    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/Listening/i)).toBeInTheDocument();
    });

    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.queryByText(/Listening/i)).not.toBeInTheDocument();
    });
  });

  it('should handle onVoiceMessage error', async () => {
    const onVoiceMessage = jest.fn().mockRejectedValue(new Error('API error'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    (global.navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([
        {
          stop: jest.fn(),
        },
      ]),
    });

    render(<VoiceInterface sessionId="session-id" onVoiceMessage={onVoiceMessage} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(
      () => {
        expect(screen.getByText(/Listening|Recording/i)).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    // Simulate MediaRecorder events
    if (mockMediaRecorderInstance) {
      mockMediaRecorderInstance.ondataavailable({
        data: new Blob(['audio'], { type: 'audio/webm' }),
      });
      if (mockMediaRecorderInstance.onstop) {
        await mockMediaRecorderInstance.onstop();
      }
    }

    await waitFor(
      () => {
        expect(onVoiceMessage).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    consoleErrorSpy.mockRestore();
  });
});
