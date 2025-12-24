/**
 * Background worker entry point
 * Processes jobs from BullMQ queues
 */

import { Worker } from 'bullmq';
import { getRedisClient } from '@/lib/redis';
import { QueueName } from '@/services/jobs/queues';
import logger from '@/lib/logger';

// Import job processors (will be implemented in later stages)
// import { processIngestionJob } from './processors/ingestion';
// import { processEmbeddingJob } from './processors/embedding';

/**
 * Create a worker for a queue
 */
function createWorker(queueName: QueueName, processor: (job: any) => Promise<any>) {
  return new Worker(
    queueName,
    async (job) => {
      logger.info(`Processing job ${job.id} from queue ${queueName}`, {
        jobId: job.id,
        queueName,
        data: job.data,
      });

      try {
        const result = await processor(job);
        logger.info(`Job ${job.id} completed successfully`, {
          jobId: job.id,
          queueName,
        });
        return result;
      } catch (error) {
        logger.error(`Job ${job.id} failed`, {
          jobId: job.id,
          queueName,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      connection: getRedisClient(),
      concurrency: 5,
    }
  );
}

/**
 * Start all workers
 */
export function startWorkers() {
  logger.info('Starting background workers...');

  // Placeholder processors - will be implemented in later stages
  const placeholderProcessor = async (job: any) => {
    logger.info(`Placeholder processor for job ${job.id}`);
    return { processed: true };
  };

  // Create workers for each queue
  const ingestionWorker = createWorker(QueueName.INGESTION, placeholderProcessor);
  const embeddingWorker = createWorker(QueueName.EMBEDDING, placeholderProcessor);
  const aiAuthoringWorker = createWorker(QueueName.AI_AUTHORING, placeholderProcessor);
  const narrativeWorker = createWorker(QueueName.NARRATIVE, placeholderProcessor);

  // Handle worker events
  [ingestionWorker, embeddingWorker, aiAuthoringWorker, narrativeWorker].forEach((worker) => {
    worker.on('completed', (job) => {
      logger.info(`Worker job completed: ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Worker job failed: ${job?.id}`, { error: err.message });
    });

    worker.on('error', (err) => {
      logger.error('Worker error', { error: err.message });
    });
  });

  logger.info('All workers started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down workers...');
    await Promise.all([
      ingestionWorker.close(),
      embeddingWorker.close(),
      aiAuthoringWorker.close(),
      narrativeWorker.close(),
    ]);
    process.exit(0);
  });
}

// Start workers if this file is run directly
if (require.main === module) {
  startWorkers();
}
