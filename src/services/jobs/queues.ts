import { Queue } from 'bullmq';
import { getRedisClient } from '@/lib/redis';

/**
 * Job queue names
 */
export enum QueueName {
  INGESTION = 'ingestion',
  EMBEDDING = 'embedding',
  AI_AUTHORING = 'ai-authoring',
  NARRATIVE = 'narrative',
}

/**
 * Get Redis connection for BullMQ
 * BullMQ requires maxRetriesPerRequest: null
 */
function getBullMQRedisConnection() {
  return getRedisClient({ maxRetriesPerRequest: null });
}

/**
 * Create a job queue
 */
export function createQueue(name: QueueName): Queue {
  return new Queue(name, {
    connection: getBullMQRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });
}

/**
 * Ingestion queue - for content processing jobs
 */
export const ingestionQueue = createQueue(QueueName.INGESTION);

/**
 * Embedding queue - for embedding generation jobs
 */
export const embeddingQueue = createQueue(QueueName.EMBEDDING);

/**
 * AI Authoring queue - for slide/audio generation jobs
 */
export const aiAuthoringQueue = createQueue(QueueName.AI_AUTHORING);

/**
 * Narrative queue - for narrative planning jobs
 */
export const narrativeQueue = createQueue(QueueName.NARRATIVE);
