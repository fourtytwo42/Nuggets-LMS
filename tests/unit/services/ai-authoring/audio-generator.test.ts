import { AudioGeneratorService } from '@/services/ai-authoring/audio-generator';
import OpenAI from 'openai';
import fs from 'fs/promises';
import type { Nugget } from '@prisma/client';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    audio: {
      speech: {
        create: jest.fn(),
      },
    },
  }));
});

// Mock fs
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AudioGeneratorService', () => {
  let service: AudioGeneratorService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key', STORAGE_PATH: './test-storage' };
    service = new AudioGeneratorService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateAudioScript', () => {
    it('should generate audio script from nugget', async () => {
      const mockNugget: Partial<Nugget> = {
        id: 'nugget-id',
        content: 'This is test content for audio generation.',
      };

      const result = await service.generateAudioScript(mockNugget as Nugget);

      expect(result).toHaveProperty('script');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('wordCount');
      expect(result.metadata).toHaveProperty('estimatedDuration');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should format content for audio', async () => {
      const mockNugget: Partial<Nugget> = {
        id: 'nugget-id',
        content: '# Header\n**Bold text** and *italic text*.',
      };

      const result = await service.generateAudioScript(mockNugget as Nugget);

      expect(result.script).not.toContain('#');
      expect(result.script).not.toContain('**');
      expect(result.script).not.toContain('*');
    });
  });

  describe('generateAudioFile', () => {
    it('should generate and save audio file', async () => {
      const mockBuffer = Buffer.from('fake-audio-data');
      const mockResponse = {
        arrayBuffer: jest.fn().mockResolvedValue(mockBuffer),
      };

      const mockOpenAI = new OpenAI({ apiKey: 'test' });
      (mockOpenAI.audio.speech.create as jest.Mock).mockResolvedValue(mockResponse);

      (OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.generateAudioFile('test script', 'nugget-id', 'org-id');

      expect(mockOpenAI.audio.speech.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'tts-1',
          voice: 'alloy',
          input: 'test script',
        })
      );
      expect(fs.writeFile).toHaveBeenCalled();
      expect(result).toContain('audio/org-id/nugget-id.mp3');
    });

    it('should handle errors gracefully', async () => {
      const mockOpenAI = new OpenAI({ apiKey: 'test' });
      (mockOpenAI.audio.speech.create as jest.Mock).mockRejectedValue(new Error('API error'));

      (OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

      await expect(service.generateAudioFile('test script', 'nugget-id', 'org-id')).rejects.toThrow(
        'API error'
      );
    });
  });
});
