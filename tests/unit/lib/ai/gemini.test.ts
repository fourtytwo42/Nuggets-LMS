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

// Mock @google/generative-ai - use factory to avoid hoisting issues
const mockGetGenerativeModel = jest.fn();
const mockClientInstance = {
  getGenerativeModel: mockGetGenerativeModel,
};

jest.mock('@google/generative-ai', () => {
  const mockGoogleGenerativeAI = jest.fn(() => mockClientInstance);
  return {
    GoogleGenerativeAI: mockGoogleGenerativeAI,
  };
});

// Import after mocks are set up
import { getGeminiClient, generateEmbedding, generateEmbeddingsBatch } from '@/lib/ai/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

describe('Gemini AI Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGenerativeModel.mockClear();
    (GoogleGenerativeAI as jest.Mock).mockClear();
    process.env = { ...originalEnv };

    // Clear the singleton client - must do this before each test
    const geminiModule = require('@/lib/ai/gemini');
    (geminiModule as any).geminiClient = null;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getGeminiClient', () => {
    it('should create Gemini client with API key', () => {
      process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key';
      const client = getGeminiClient();

      expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-api-key');
      expect(client).toBeDefined();
    });

    it('should throw error when API key is missing', () => {
      // Save original key
      const originalKey = process.env.GOOGLE_GEMINI_API_KEY;

      // Remove API key and reset modules to clear singleton
      delete process.env.GOOGLE_GEMINI_API_KEY;
      jest.resetModules();

      // Require fresh module instance
      const { getGeminiClient } = require('@/lib/ai/gemini');

      // Should throw when API key is missing
      expect(() => getGeminiClient()).toThrow();

      // Restore for other tests
      if (originalKey) {
        process.env.GOOGLE_GEMINI_API_KEY = originalKey;
      }
      jest.resetModules();
    });

    it('should return same client instance on subsequent calls', () => {
      process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key';
      const client1 = getGeminiClient();
      const client2 = getGeminiClient();

      expect(client1).toBe(client2);
    });
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key';
      const geminiModule = require('@/lib/ai/gemini');
      (geminiModule as any).geminiClient = null;

      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockModel = {
        embedContent: jest.fn().mockResolvedValue({
          embedding: { values: mockEmbedding },
        }),
      };

      mockGetGenerativeModel.mockReturnValue(mockModel);

      const result = await generateEmbedding('test text');

      expect(result).toEqual(mockEmbedding);
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'text-embedding-004' });
      expect(mockModel.embedContent).toHaveBeenCalledWith('test text');
    });

    it('should throw error for empty embedding', async () => {
      process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key';
      const geminiModule = require('@/lib/ai/gemini');
      (geminiModule as any).geminiClient = null;

      const mockModel = {
        embedContent: jest.fn().mockResolvedValue({
          embedding: { values: [] },
        }),
      };

      mockGetGenerativeModel.mockReturnValue(mockModel);

      await expect(generateEmbedding('test text')).rejects.toThrow('Empty embedding returned');
    });
  });

  describe('generateEmbeddingsBatch', () => {
    it('should generate embeddings for multiple texts', async () => {
      process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key';
      const geminiModule = require('@/lib/ai/gemini');
      (geminiModule as any).geminiClient = null;

      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];

      const embedContentMock = jest
        .fn()
        .mockResolvedValueOnce({
          embedding: { values: mockEmbeddings[0] },
        })
        .mockResolvedValueOnce({
          embedding: { values: mockEmbeddings[1] },
        });

      const mockModel = {
        embedContent: embedContentMock,
      };

      mockGetGenerativeModel.mockReturnValue(mockModel);

      const result = await generateEmbeddingsBatch(['text1', 'text2']);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockEmbeddings[0]);
      expect(result[1]).toEqual(mockEmbeddings[1]);
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'text-embedding-004' });
      expect(embedContentMock).toHaveBeenCalledTimes(2);
    });
  });
});
