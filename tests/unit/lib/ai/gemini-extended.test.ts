// Mock logger first
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock @google/generative-ai
const mockGetGenerativeModel = jest.fn();
const mockClientInstance = {
  getGenerativeModel: mockGetGenerativeModel,
};

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => mockClientInstance),
}));

import { generateEmbedding, generateEmbeddingsBatch } from '@/lib/ai/gemini';

describe('Gemini AI Extended Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGenerativeModel.mockClear();
    process.env = { ...originalEnv };
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key';
    const geminiModule = require('@/lib/ai/gemini');
    (geminiModule as any).geminiClient = null;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateEmbedding error handling', () => {
    it('should handle API errors', async () => {
      const mockModel = {
        embedContent: jest.fn().mockRejectedValue(new Error('API error')),
      };
      mockGetGenerativeModel.mockReturnValue(mockModel);

      await expect(generateEmbedding('test')).rejects.toThrow('API error');
    });

    it('should handle null embedding values', async () => {
      const mockModel = {
        embedContent: jest.fn().mockResolvedValue({
          embedding: { values: null },
        }),
      };
      mockGetGenerativeModel.mockReturnValue(mockModel);

      await expect(generateEmbedding('test')).rejects.toThrow('Empty embedding returned');
    });

    it('should handle undefined embedding', async () => {
      const mockModel = {
        embedContent: jest.fn().mockResolvedValue({
          embedding: {},
        }),
      };
      mockGetGenerativeModel.mockReturnValue(mockModel);

      await expect(generateEmbedding('test')).rejects.toThrow('Empty embedding returned');
    });
  });

  describe('generateEmbeddingsBatch error handling', () => {
    it('should handle partial failures', async () => {
      const mockModel = {
        embedContent: jest
          .fn()
          .mockResolvedValueOnce({
            embedding: { values: [0.1, 0.2] },
          })
          .mockRejectedValueOnce(new Error('API error')),
      };
      mockGetGenerativeModel.mockReturnValue(mockModel);

      await expect(generateEmbeddingsBatch(['text1', 'text2'])).rejects.toThrow('API error');
    });

    it('should handle empty embedding in batch', async () => {
      const mockModel = {
        embedContent: jest
          .fn()
          .mockResolvedValueOnce({
            embedding: { values: [0.1, 0.2] },
          })
          .mockResolvedValueOnce({
            embedding: { values: [] },
          }),
      };
      mockGetGenerativeModel.mockReturnValue(mockModel);

      await expect(generateEmbeddingsBatch(['text1', 'text2'])).rejects.toThrow(
        'Empty embedding returned'
      );
    });
  });
});
