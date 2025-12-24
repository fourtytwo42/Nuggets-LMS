import { SlideGeneratorService } from '@/services/ai-authoring/slide-generator';
import { getGeminiClient } from '@/lib/ai/gemini';
import type { Nugget } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/ai/gemini', () => ({
  getGeminiClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SlideGeneratorService', () => {
  let service: SlideGeneratorService;
  let mockModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SlideGeneratorService();

    mockModel = {
      generateContent: jest.fn(),
    };

    const mockClient = {
      getGenerativeModel: jest.fn(() => mockModel),
    };

    (getGeminiClient as jest.Mock).mockReturnValue(mockClient);
  });

  describe('generateSlides', () => {
    it('should generate slides from nugget content', async () => {
      const mockNugget: Partial<Nugget> = {
        id: 'nugget-id',
        content: 'Test content about machine learning.',
        metadata: {
          topics: ['Machine Learning'],
          difficulty: 5,
        } as any,
      };

      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue(
            JSON.stringify({
              slides: [
                { title: 'Introduction', content: 'Content 1', order: 1 },
                { title: 'Main Topic', content: 'Content 2', order: 2 },
              ],
            })
          ),
        },
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.generateSlides(mockNugget as Nugget);

      expect(result.slides).toHaveLength(2);
      expect(result.slides[0].title).toBe('Introduction');
      expect(result.metadata.totalSlides).toBe(2);
    });

    it('should handle fallback parsing when JSON is invalid', async () => {
      const mockNugget: Partial<Nugget> = {
        id: 'nugget-id',
        content: 'Test content about machine learning.',
        metadata: {} as any,
      };

      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue('# Slide 1\nContent here\n\n# Slide 2\nMore content'),
        },
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.generateSlides(mockNugget as Nugget);

      expect(result.slides.length).toBeGreaterThan(0);
      expect(result.slides[0]).toHaveProperty('title');
      expect(result.slides[0]).toHaveProperty('content');
    });

    it('should create single slide when no structure found', async () => {
      const mockNugget: Partial<Nugget> = {
        id: 'nugget-id',
        content: 'Test content about machine learning.',
        metadata: {} as any,
      };

      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue('Just plain text without structure'),
        },
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.generateSlides(mockNugget as Nugget);

      expect(result.slides.length).toBeGreaterThan(0);
      expect(result.slides[0]).toHaveProperty('title');
      expect(result.slides[0]).toHaveProperty('content');
    });

    it('should handle errors gracefully', async () => {
      const mockNugget: Partial<Nugget> = {
        id: 'nugget-id',
        content: 'Test content',
        metadata: {} as any,
      };

      mockModel.generateContent.mockRejectedValue(new Error('API error'));

      await expect(service.generateSlides(mockNugget as Nugget)).rejects.toThrow('API error');
    });
  });
});
