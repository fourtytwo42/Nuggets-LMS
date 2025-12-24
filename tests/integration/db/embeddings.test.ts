import { insertEmbedding, findSimilarNuggets } from '@/lib/db/embeddings';
import { prisma } from '@/lib/prisma';

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

describe('Embedding utilities', () => {
  const mockNuggetId = 'test-nugget-id';
  const mockEmbedding = new Array(1536).fill(0.1);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('insertEmbedding', () => {
    it('should insert embedding using raw SQL', async () => {
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(undefined);

      await insertEmbedding(mockNuggetId, mockEmbedding);

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (prisma.$executeRaw as jest.Mock).mockRejectedValue(error);

      await expect(insertEmbedding(mockNuggetId, mockEmbedding)).rejects.toThrow('Database error');
    });
  });

  describe('findSimilarNuggets', () => {
    const mockOrganizationId = 'test-org-id';
    const mockNuggets = [
      {
        id: 'nugget-1',
        organizationId: mockOrganizationId,
        content: 'Test content',
        status: 'ready',
      },
    ];

    it('should find similar nuggets', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockNuggets);

      const result = await findSimilarNuggets(mockEmbedding, mockOrganizationId, 0.7, 20);

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(result).toEqual(mockNuggets);
    });

    it('should use default threshold and limit', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockNuggets);

      await findSimilarNuggets(mockEmbedding, mockOrganizationId);

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(error);

      await expect(findSimilarNuggets(mockEmbedding, mockOrganizationId)).rejects.toThrow(
        'Database error'
      );
    });
  });
});
