import { Job } from 'bullmq';
import { embeddingService } from '@/services/content-ingestion/embedding-service';
import logger from '@/lib/logger';

export interface EmbeddingJobData {
  nuggetId: string;
  content: string;
  organizationId: string;
}

/**
 * Process embedding generation job
 */
export async function processEmbeddingJob(job: Job<EmbeddingJobData>): Promise<{
  success: boolean;
  nuggetId: string;
}> {
  const { nuggetId, content } = job.data;

  try {
    logger.info('Processing embedding job', {
      jobId: job.id,
      nuggetId,
      contentLength: content.length,
    });

    await embeddingService.generateAndStoreEmbedding(nuggetId, content);

    logger.info('Embedding job completed', {
      jobId: job.id,
      nuggetId,
    });

    return {
      success: true,
      nuggetId,
    };
  } catch (error) {
    logger.error('Embedding job failed', {
      jobId: job.id,
      nuggetId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
