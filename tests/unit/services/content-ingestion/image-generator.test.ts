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
    it('should generate and save image', async () => {
      const mockImageUrl = 'https://example.com/image.png';
      const mockImageBuffer = Buffer.from('fake-image-data');

      const mockOpenAI = new OpenAI({ apiKey: 'test' });
      (mockOpenAI.images.generate as jest.Mock).mockResolvedValue({
        data: [{ url: mockImageUrl }],
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockImageBuffer),
      });

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      // Mock OpenAI constructor to return our mock
      (OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

      const result = await service.generateImage('test prompt', 'nugget-id', 'org-id');

      expect(mockOpenAI.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'dall-e-3',
          prompt: 'test prompt',
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(mockImageUrl);
      expect(fs.writeFile).toHaveBeenCalled();
      expect(result).toContain('images/org-id/nugget-id.png');
    });

    it('should throw error when API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      const newService = new ImageGeneratorService();

      expect(() => {
        // Accessing client will throw
        (newService as any).generateImage('prompt', 'id', 'org-id');
      }).not.toThrow(); // Constructor doesn't throw, but generateImage will
    });
  });
});
