/**
 * Background worker entry point
 * Processes jobs from BullMQ queues
 */

import { Worker } from 'bullmq';
import { getRedisClient } from '@/lib/redis';
import { QueueName } from '@/services/jobs/queues';
import logger from '@/lib/logger';
import { processIngestionJob } from './processors/ingestion-processor';
import { processEmbeddingJob } from './processors/embedding-processor';
import {
  processImageGenerationJob,
  processAudioGenerationJob,
  processSlideGenerationJob,
} from './processors/ai-authoring-processor';
import { processNarrativePlanningJob } from './processors/narrative-processor';

/**
 * Get Redis connection for BullMQ workers
 * BullMQ requires maxRetriesPerRequest: null
 */
function getBullMQRedisConnection() {
  return getRedisClient({ maxRetriesPerRequest: null });
}

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
        jobName: job.name,
        data: job.data,
      });

      try {
        const result = await processor(job);
        logger.info(`Job ${job.id} completed successfully`, {
          jobId: job.id,
          queueName,
          jobName: job.name,
        });
        return result;
      } catch (error) {
        logger.error(`Job ${job.id} failed`, {
          jobId: job.id,
          queueName,
          jobName: job.name,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      connection: getBullMQRedisConnection(),
      concurrency: 5,
    }
  );
}

/**
 * Start all workers
 */
export function startWorkers() {
  logger.info('Starting background workers...');

  // Ingestion worker - handles file and URL processing
  const ingestionWorker = createWorker(QueueName.INGESTION, async (job) => {
    if (
      job.name === 'process-file' ||
      job.name === 'process-url' ||
      job.name === 'process-ingestion'
    ) {
      return await processIngestionJob(job);
    }
    throw new Error(`Unknown ingestion job type: ${job.name}`);
  });

  // Embedding worker - handles embedding generation
  const embeddingWorker = createWorker(QueueName.EMBEDDING, async (job) => {
    if (job.name === 'generate-embedding') {
      return await processEmbeddingJob(job);
    }
    throw new Error(`Unknown embedding job type: ${job.name}`);
  });

  // AI Authoring worker - handles image, audio, and slide generation
  const aiAuthoringWorker = createWorker(QueueName.AI_AUTHORING, async (job) => {
    if (job.name === 'generate-image') {
      return await processImageGenerationJob(job);
    }
    if (job.name === 'generate-audio') {
      return await processAudioGenerationJob(job);
    }
    if (job.name === 'generate-slides') {
      return await processSlideGenerationJob(job);
    }
    throw new Error(`Unknown AI authoring job type: ${job.name}`);
  });

  // Narrative worker - handles narrative node and choice generation
  const narrativeWorker = createWorker(QueueName.NARRATIVE, async (job) => {
    if (job.name === 'plan-narrative' || job.name === 'generate-narrative') {
      return await processNarrativePlanningJob(job);
    }
    throw new Error(`Unknown narrative job type: ${job.name}`);
  });

  // Handle worker events
  [ingestionWorker, embeddingWorker, aiAuthoringWorker, narrativeWorker].forEach((worker) => {
    worker.on('completed', (job) => {
      logger.info(`Worker job completed: ${job.id}`, {
        jobId: job.id,
        queueName: worker.name,
      });
    });

    worker.on('failed', (job, err) => {
      logger.error(`Worker job failed: ${job?.id}`, {
        jobId: job?.id,
        queueName: worker.name,
        error: err.message,
      });
    });

    worker.on('error', (err) => {
      logger.error('Worker error', {
        queueName: worker.name,
        error: err.message,
      });
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

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down workers...');
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
