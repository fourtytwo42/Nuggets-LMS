import { generateEmbedding, generateEmbeddingsBatch } from '@/lib/ai/gemini';
import { insertEmbedding, findSimilarNuggets } from '@/lib/db/embeddings';
import { embeddingQueue } from '@/services/jobs/queues';
import logger from '@/lib/logger';
import type { Nugget } from '@prisma/client';

/**
 * Embedding service for generating and storing embeddings
 */
export class EmbeddingService {
  /**
   * Generate embedding for a nugget and store it
   */
  async generateAndStoreEmbedding(nuggetId: string, content: string): Promise<void> {
    try {
      logger.info('Generating embedding for nugget', { nuggetId, contentLength: content.length });

      const embedding = await generateEmbedding(content);

      await insertEmbedding(nuggetId, embedding);

      logger.info('Embedding generated and stored', { nuggetId, embeddingSize: embedding.length });
    } catch (error) {
      logger.error('Error generating and storing embedding', {
        error: error instanceof Error ? error.message : String(error),
        nuggetId,
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple nuggets in batch
   */
  async generateAndStoreEmbeddingsBatch(
    nuggets: Array<{ id: string; content: string }>
  ): Promise<void> {
    try {
      logger.info('Generating embeddings batch', { count: nuggets.length });

      const contents = nuggets.map((n) => n.content);
      const embeddings = await generateEmbeddingsBatch(contents);

      // Store embeddings
      await Promise.all(
        nuggets.map((nugget, index) => insertEmbedding(nugget.id, embeddings[index]))
      );

      logger.info('Embeddings batch generated and stored', { count: nuggets.length });
    } catch (error) {
      logger.error('Error generating embeddings batch', {
        error: error instanceof Error ? error.message : String(error),
        count: nuggets.length,
      });
      throw error;
    }
  }

  /**
   * Queue embedding generation job
   */
  async queueEmbeddingJob(
    nuggetId: string,
    content: string,
    organizationId: string
  ): Promise<void> {
    try {
      await embeddingQueue.add(
        'generate-embedding',
        {
          nuggetId,
          content,
          organizationId,
        },
        {
          priority: 1,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );

      logger.info('Queued embedding generation job', { nuggetId });
    } catch (error) {
      logger.error('Error queueing embedding job', {
        error: error instanceof Error ? error.message : String(error),
        nuggetId,
      });
      throw error;
    }
  }

  /**
   * Find similar nuggets using semantic search
   */
  async findSimilarNuggets(
    queryText: string,
    organizationId: string,
    threshold: number = 0.7,
    limit: number = 20
  ): Promise<Nugget[]> {
    try {
      logger.info('Finding similar nuggets', {
        queryText: queryText.substring(0, 100),
        organizationId,
      });

      const queryEmbedding = await generateEmbedding(queryText);
      const similarNuggets = await findSimilarNuggets(
        queryEmbedding,
        organizationId,
        threshold,
        limit
      );

      logger.info('Found similar nuggets', { count: similarNuggets.length, organizationId });
      return similarNuggets;
    } catch (error) {
      logger.error('Error finding similar nuggets', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }
}

// Singleton instance
export const embeddingService = new EmbeddingService();
