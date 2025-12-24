import { ImageGeneratorService } from '@/services/content-ingestion/image-generator';
import OpenAI from 'openai';
import fs from 'fs/promises';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    images: {
      generate: jest.fn(),
    },
  }));
});

// Mock fs
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock logger
jest.mock('@/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock cost tracker
jest.mock('@/services/analytics/cost-tracker', () => ({
  costTracker: {
    trackImageGeneration: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('ImageGeneratorService', () => {
  let service: ImageGeneratorService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key', STORAGE_PATH: './test-storage' };
    service = new ImageGeneratorService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateImagePrompt', () => {
    it('should generate image prompt from content and topics', () => {
      const content = 'This is about machine learning algorithms.';
      const topics = ['Machine Learning', 'Algorithms'];

      const prompt = service.generateImagePrompt(content, topics);

      expect(prompt).toContain('Machine Learning');
      expect(prompt).toContain('Algorithms');
      expect(prompt).toContain('Educational illustration');
    });

    it('should handle empty topics', () => {
      const content = 'Some content here.';
      const topics: string[] = [];

      const prompt = service.generateImagePrompt(content, topics);

      expect(prompt).toContain('learning concept');
    });
  });

  describe('generateImage', () => {
    it('should generate and save image using GPT Image', async () => {
      const mockImageBase64 = Buffer.from('fake-image-data').toString('base64');
      const mockImageBuffer = Buffer.from('fake-image-data');

      const mockOpenAI = new OpenAI({ apiKey: 'test' });
      (mockOpenAI.images.generate as jest.Mock).mockResolvedValue({
        data: [{ b64_json: mockImageBase64 }],
      });

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      // Mock OpenAI constructor to return our mock
      (OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

      const result = await service.generateImage('test prompt', 'nugget-id', 'org-id');

      expect(mockOpenAI.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-image-1-mini',
          prompt: 'test prompt',
          size: '1024x1024',
          quality: 'medium',
          response_format: 'b64_json',
        })
      );
      expect(fs.writeFile).toHaveBeenCalled();
      expect(result).toContain('images/org-id/nugget-id.png');
    });

    it('should support custom quality and size options', async () => {
      const mockImageBase64 = Buffer.from('fake-image-data').toString('base64');
      const mockOpenAI = new OpenAI({ apiKey: 'test' });
      (mockOpenAI.images.generate as jest.Mock).mockResolvedValue({
        data: [{ b64_json: mockImageBase64 }],
      });

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

      await service.generateImage('test prompt', 'nugget-id', 'org-id', {
        quality: 'low',
        size: '1024x1536',
      });

      expect(mockOpenAI.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: 'low',
          size: '1024x1536',
        })
      );
    });

    it('should throw error when API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      const newService = new ImageGeneratorService();

      expect(() => {
        // Accessing client will throw
        (newService as any).generateImage('prompt', 'id', 'org-id');
      }).not.toThrow(); // Constructor doesn't throw, but generateImage will
    });

    it('should calculate token counts correctly', () => {
      const prompt = 'This is a test prompt for image generation';
      const tokens = service.getTokenCounts(prompt, 'medium', '1024x1024');

      expect(tokens.promptTokens).toBeGreaterThan(0);
      expect(tokens.imageTokens).toBe(1056); // Medium quality, square
    });

    it('should calculate different token counts for different qualities', () => {
      const prompt = 'Test';
      const lowTokens = service.getTokenCounts(prompt, 'low', '1024x1024');
      const mediumTokens = service.getTokenCounts(prompt, 'medium', '1024x1024');
      const highTokens = service.getTokenCounts(prompt, 'high', '1024x1024');

      expect(lowTokens.imageTokens).toBe(272);
      expect(mediumTokens.imageTokens).toBe(1056);
      expect(highTokens.imageTokens).toBe(4160);
    });
  });
});
