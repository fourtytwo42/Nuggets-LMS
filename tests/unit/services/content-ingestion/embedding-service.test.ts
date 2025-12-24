import { EmbeddingService } from '@/services/content-ingestion/embedding-service';
import { generateEmbedding } from '@/lib/ai/gemini';
import { insertEmbedding, findSimilarNuggets } from '@/lib/db/embeddings';
import { embeddingQueue } from '@/services/jobs/queues';

// Mock dependencies
jest.mock('@/lib/ai/gemini', () => ({
  generateEmbedding: jest.fn(),
  generateEmbeddingsBatch: jest.fn(),
}));

jest.mock('@/lib/db/embeddings', () => ({
  insertEmbedding: jest.fn(),
  findSimilarNuggets: jest.fn(),
}));

jest.mock('@/services/jobs/queues', () => ({
  embeddingQueue: {
    add: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmbeddingService();
  });

  describe('generateAndStoreEmbedding', () => {
    it('should generate and store embedding', async () => {
      const nuggetId = 'nugget-id';
      const content = 'Test content';
      const mockEmbedding = [0.1, 0.2, 0.3];

      (generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
      (insertEmbedding as jest.Mock).mockResolvedValue(undefined);

      await service.generateAndStoreEmbedding(nuggetId, content);

      expect(generateEmbedding).toHaveBeenCalledWith(content);
      expect(insertEmbedding).toHaveBeenCalledWith(nuggetId, mockEmbedding);
    });

    it('should handle errors', async () => {
      const nuggetId = 'nugget-id';
      const content = 'Test content';

      (generateEmbedding as jest.Mock).mockRejectedValue(new Error('API error'));

      await expect(service.generateAndStoreEmbedding(nuggetId, content)).rejects.toThrow(
        'API error'
      );
    });
  });

  describe('queueEmbeddingJob', () => {
    it('should queue embedding generation job', async () => {
      const nuggetId = 'nugget-id';
      const content = 'Test content';
      const organizationId = 'org-id';

      (embeddingQueue.add as jest.Mock).mockResolvedValue(undefined);

      await service.queueEmbeddingJob(nuggetId, content, organizationId);

      expect(embeddingQueue.add).toHaveBeenCalledWith(
        'generate-embedding',
        {
          nuggetId,
          content,
          organizationId,
        },
        expect.objectContaining({
          priority: 1,
          attempts: 3,
        })
      );
    });
  });

  describe('findSimilarNuggets', () => {
    it('should find similar nuggets', async () => {
      const queryText = 'test query';
      const organizationId = 'org-id';
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockNuggets = [{ id: 'nugget-1', content: 'content' }];

      (generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
      (findSimilarNuggets as jest.Mock).mockResolvedValue(mockNuggets);

      const result = await service.findSimilarNuggets(queryText, organizationId);

      expect(generateEmbedding).toHaveBeenCalledWith(queryText);
      expect(findSimilarNuggets).toHaveBeenCalledWith(mockEmbedding, organizationId, 0.7, 20);
      expect(result).toEqual(mockNuggets);
    });

    it('should use custom threshold and limit', async () => {
      const queryText = 'test query';
      const organizationId = 'org-id';
      const mockEmbedding = [0.1, 0.2, 0.3];

      (generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
      (findSimilarNuggets as jest.Mock).mockResolvedValue([]);

      await service.findSimilarNuggets(queryText, organizationId, 0.8, 10);

      expect(findSimilarNuggets).toHaveBeenCalledWith(mockEmbedding, organizationId, 0.8, 10);
    });
  });
});
