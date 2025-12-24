import { NuggetAssemblerService } from '@/services/content-ingestion/nugget-assembler';
import { prisma } from '@/lib/prisma';
import { semanticChunkerService } from '@/services/content-ingestion/semantic-chunker';
import { metadataExtractorService } from '@/services/content-ingestion/metadata-extractor';
import { embeddingService } from '@/services/content-ingestion/embedding-service';
import { imageGeneratorService } from '@/services/content-ingestion/image-generator';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    nugget: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    nuggetSource: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/services/content-ingestion/semantic-chunker', () => ({
  semanticChunkerService: {
    chunkText: jest.fn(),
  },
}));

jest.mock('@/services/content-ingestion/metadata-extractor', () => ({
  metadataExtractorService: {
    extractMetadata: jest.fn(),
  },
}));

jest.mock('@/services/content-ingestion/embedding-service', () => ({
  embeddingService: {
    queueEmbeddingJob: jest.fn(),
  },
}));

jest.mock('@/services/content-ingestion/image-generator', () => ({
  imageGeneratorService: {
    generateImagePrompt: jest.fn(),
    generateImage: jest.fn(),
  },
}));

describe('NuggetAssemblerService', () => {
  let service: NuggetAssemblerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NuggetAssemblerService();
  });

  describe('assembleNuggets', () => {
    it('should assemble nuggets from content', async () => {
      const mockChunks = [
        {
          text: 'Chunk 1 content',
          startIndex: 0,
          endIndex: 15,
          metadata: { wordCount: 3, sentenceCount: 1 },
        },
        {
          text: 'Chunk 2 content',
          startIndex: 16,
          endIndex: 31,
          metadata: { wordCount: 3, sentenceCount: 1 },
        },
      ];

      const mockMetadata = {
        topics: ['Topic1'],
        difficulty: 5,
        prerequisites: [],
        estimatedTime: 1,
        relatedConcepts: [],
      };

      const mockNuggets = [
        { id: 'nugget-1', content: 'Chunk 1 content', organizationId: 'org-id' },
        { id: 'nugget-2', content: 'Chunk 2 content', organizationId: 'org-id' },
      ];

      (semanticChunkerService.chunkText as jest.Mock).mockReturnValue(mockChunks);
      (metadataExtractorService.extractMetadata as jest.Mock).mockReturnValue(mockMetadata);
      (prisma.nugget.create as jest.Mock)
        .mockResolvedValueOnce(mockNuggets[0])
        .mockResolvedValueOnce(mockNuggets[1]);
      (prisma.nugget.update as jest.Mock).mockResolvedValue(undefined);
      (prisma.nuggetSource.create as jest.Mock).mockResolvedValue(undefined);
      (embeddingService.queueEmbeddingJob as jest.Mock).mockResolvedValue(undefined);

      const result = await service.assembleNuggets({
        content: 'Test content',
        organizationId: 'org-id',
        source: { type: 'file', path: '/test/file.pdf' },
      });

      expect(result).toHaveLength(2);
      expect(prisma.nugget.create).toHaveBeenCalledTimes(2);
      expect(embeddingService.queueEmbeddingJob).toHaveBeenCalledTimes(2);
    });

    it('should generate images when option is enabled', async () => {
      const mockChunks = [
        {
          text: 'Chunk content',
          startIndex: 0,
          endIndex: 12,
          metadata: { wordCount: 2, sentenceCount: 1 },
        },
      ];

      const mockMetadata = {
        topics: ['Topic1'],
        difficulty: 5,
        prerequisites: [],
        estimatedTime: 1,
        relatedConcepts: [],
      };

      const mockNugget = { id: 'nugget-1', content: 'Chunk content', organizationId: 'org-id' };

      (semanticChunkerService.chunkText as jest.Mock).mockReturnValue(mockChunks);
      (metadataExtractorService.extractMetadata as jest.Mock).mockReturnValue(mockMetadata);
      (prisma.nugget.create as jest.Mock).mockResolvedValue(mockNugget);
      (prisma.nugget.update as jest.Mock).mockResolvedValue(undefined);
      (prisma.nuggetSource.create as jest.Mock).mockResolvedValue(undefined);
      (embeddingService.queueEmbeddingJob as jest.Mock).mockResolvedValue(undefined);
      (imageGeneratorService.generateImagePrompt as jest.Mock).mockReturnValue('test prompt');
      (imageGeneratorService.generateImage as jest.Mock).mockResolvedValue(
        'images/org-id/nugget-1.png'
      );

      await service.assembleNuggets({
        content: 'Test content',
        organizationId: 'org-id',
        source: { type: 'file', path: '/test/file.pdf' },
        options: { generateImages: true },
      });

      expect(imageGeneratorService.generateImage).toHaveBeenCalled();
      expect(prisma.nugget.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'nugget-1' },
          data: expect.objectContaining({ imageUrl: 'images/org-id/nugget-1.png' }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      (semanticChunkerService.chunkText as jest.Mock).mockImplementation(() => {
        throw new Error('Chunking error');
      });

      await expect(
        service.assembleNuggets({
          content: 'Test content',
          organizationId: 'org-id',
          source: { type: 'file', path: '/test/file.pdf' },
        })
      ).rejects.toThrow('Chunking error');
    });
  });

  describe('getNuggetsByOrganization', () => {
    it('should get nuggets by organization', async () => {
      const mockNuggets = [{ id: 'nugget-1', content: 'content' }];
      (prisma.nugget.findMany as jest.Mock).mockResolvedValue(mockNuggets);

      const result = await service.getNuggetsByOrganization('org-id');

      expect(result).toEqual(mockNuggets);
      expect(prisma.nugget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-id' },
        })
      );
    });

    it('should filter by status', async () => {
      (prisma.nugget.findMany as jest.Mock).mockResolvedValue([]);

      await service.getNuggetsByOrganization('org-id', { status: 'ready' });

      expect(prisma.nugget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-id', status: 'ready' },
        })
      );
    });
  });

  describe('getNuggetById', () => {
    it('should get nugget by ID', async () => {
      const mockNugget = { id: 'nugget-1', content: 'content' };
      (prisma.nugget.findFirst as jest.Mock).mockResolvedValue(mockNugget);

      const result = await service.getNuggetById('nugget-1', 'org-id');

      expect(result).toEqual(mockNugget);
      expect(prisma.nugget.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'nugget-1', organizationId: 'org-id' },
        })
      );
    });
  });
});
