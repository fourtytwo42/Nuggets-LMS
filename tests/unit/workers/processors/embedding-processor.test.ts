// Mock msgpackr to avoid ES module issues
jest.mock('msgpackr', () => ({
  pack: jest.fn(),
  unpack: jest.fn(),
}));

// Mock bullmq dependencies
jest.mock('bullmq', () => ({
  Queue: jest.fn(),
  Worker: jest.fn(),
}));

import { processEmbeddingJob } from '@/workers/processors/embedding-processor';
import { embeddingService } from '@/services/content-ingestion/embedding-service';
import logger from '@/lib/logger';

jest.mock('@/services/content-ingestion/embedding-service');
jest.mock('@/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('EmbeddingProcessor', () => {
  const mockJob = {
    id: 'job-1',
    data: {
      nuggetId: 'nugget-1',
      content: 'Test content for embedding',
      organizationId: 'org-1',
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process embedding job successfully', async () => {
    (embeddingService.generateAndStoreEmbedding as jest.Mock).mockResolvedValue(undefined);

    const result = await processEmbeddingJob(mockJob);

    expect(result.success).toBe(true);
    expect(result.nuggetId).toBe('nugget-1');
    expect(embeddingService.generateAndStoreEmbedding).toHaveBeenCalledWith(
      'nugget-1',
      'Test content for embedding'
    );
  });

  it('should handle embedding generation errors', async () => {
    (embeddingService.generateAndStoreEmbedding as jest.Mock).mockRejectedValue(
      new Error('Embedding generation failed')
    );

    await expect(processEmbeddingJob(mockJob)).rejects.toThrow('Embedding generation failed');
  });
});
