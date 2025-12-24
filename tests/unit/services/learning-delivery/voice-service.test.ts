import { VoiceService } from '@/services/learning-delivery/voice-service';
import { prisma } from '@/lib/prisma';
import { aiTutorService } from '@/services/learning-delivery/ai-tutor';
import { getGeminiClient } from '@/lib/ai/gemini';
import logger from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    session: {
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/services/learning-delivery/ai-tutor', () => ({
  aiTutorService: {
    generateResponse: jest.fn(),
  },
}));

jest.mock('@/lib/ai/gemini', () => ({
  getGeminiClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: jest.fn(),
        },
        speech: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('VoiceService', () => {
  let voiceService: VoiceService;
  let mockSession: any;

  beforeEach(() => {
    jest.clearAllMocks();
    voiceService = new VoiceService();
    mockSession = {
      id: 'session-id',
      learnerId: 'learner-id',
      organizationId: 'org-id',
      mode: 'voice',
      startedAt: new Date(),
      lastActivity: new Date(),
    };
  });

  describe('processVoiceInput', () => {
    it('should process voice input and return voice response', async () => {
      const mockTranscription = 'Hello, I need help';
      const mockAIResponse = 'I can help you with that';
      const mockAudioBase64 = 'base64audio';

      // Mock Gemini transcription
      const mockGeminiModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue(mockTranscription),
          },
        }),
      };
      (getGeminiClient as jest.Mock).mockReturnValue({
        getGenerativeModel: jest.fn().mockReturnValue(mockGeminiModel),
      });

      // Mock conversation history
      (prisma.message.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'msg-1',
          role: 'user',
          content: mockTranscription,
          createdAt: new Date(),
        },
      ]);

      // Mock AI tutor response
      (aiTutorService.generateResponse as jest.Mock).mockResolvedValue(mockAIResponse);

      // Mock message creation
      (prisma.message.create as jest.Mock)
        .mockResolvedValueOnce({
          id: 'msg-user',
          role: 'user',
          content: mockTranscription,
        })
        .mockResolvedValueOnce({
          id: 'msg-assistant',
          role: 'assistant',
          content: mockAIResponse,
        });

      // Mock session update
      (prisma.session.update as jest.Mock).mockResolvedValue(mockSession);

      // Set up OpenAI TTS mock
      process.env.OPENAI_API_KEY = 'test-key';
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockTTSResponse = {
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      };
      const OpenAIMock = require('openai').default;
      (OpenAIMock as jest.Mock).mockImplementation(() => ({
        audio: {
          speech: {
            create: jest.fn().mockResolvedValue(mockTTSResponse),
          },
        },
      }));

      // Process voice input
      const result = await voiceService.processVoiceInput(mockSession, {
        audio: mockAudioBase64,
        format: 'webm',
      });

      expect(result).toHaveProperty('audio');
      expect(result.text).toBe(mockAIResponse);
      expect(prisma.message.create).toHaveBeenCalledTimes(2); // User message + AI response
      expect(prisma.session.update).toHaveBeenCalled();
    });

    it('should handle transcription errors', async () => {
      // Mock Gemini to throw error
      (getGeminiClient as jest.Mock).mockImplementation(() => {
        throw new Error('Transcription failed');
      });

      // Mock OpenAI fallback
      const mockOpenAI = require('openai').default;
      const mockOpenAIClient = new mockOpenAI();
      (mockOpenAIClient.audio.transcriptions.create as jest.Mock).mockRejectedValue(
        new Error('Transcription failed')
      );

      await expect(
        voiceService.processVoiceInput(mockSession, {
          audio: 'base64audio',
          format: 'webm',
        })
      ).rejects.toThrow();
    });
  });

  describe('startVoiceSession', () => {
    it('should start voice session', async () => {
      (prisma.session.update as jest.Mock).mockResolvedValue({
        ...mockSession,
        mode: 'voice',
      });

      await voiceService.startVoiceSession('session-id');

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-id' },
        data: {
          mode: 'voice',
          lastActivity: expect.any(Date),
        },
      });
      expect(logger.info).toHaveBeenCalledWith('Voice session started', {
        sessionId: 'session-id',
      });
    });

    it('should handle errors when starting voice session', async () => {
      (prisma.session.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(voiceService.startVoiceSession('session-id')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('stopVoiceSession', () => {
    it('should stop voice session', async () => {
      (prisma.session.update as jest.Mock).mockResolvedValue(mockSession);

      await voiceService.stopVoiceSession('session-id');

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-id' },
        data: {
          lastActivity: expect.any(Date),
        },
      });
      expect(logger.info).toHaveBeenCalledWith('Voice session stopped', {
        sessionId: 'session-id',
      });
    });

    it('should handle errors when stopping voice session', async () => {
      (prisma.session.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(voiceService.stopVoiceSession('session-id')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
