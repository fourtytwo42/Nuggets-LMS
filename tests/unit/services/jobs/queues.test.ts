import {
  ingestionQueue,
  embeddingQueue,
  aiAuthoringQueue,
  narrativeQueue,
  QueueName,
} from '@/services/jobs/queues';
import { Queue } from 'bullmq';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation((name, options) => ({
    name,
    options,
  })),
}));

jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => ({
    host: 'localhost',
    port: 6379,
  })),
}));

describe('Job Queues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create ingestion queue', () => {
    expect(ingestionQueue).toBeDefined();
    expect(ingestionQueue.name).toBe(QueueName.INGESTION);
  });

  it('should create embedding queue', () => {
    expect(embeddingQueue).toBeDefined();
    expect(embeddingQueue.name).toBe(QueueName.EMBEDDING);
  });

  it('should create aiAuthoring queue', () => {
    expect(aiAuthoringQueue).toBeDefined();
    expect(aiAuthoringQueue.name).toBe(QueueName.AI_AUTHORING);
  });

  it('should create narrative queue', () => {
    expect(narrativeQueue).toBeDefined();
    expect(narrativeQueue.name).toBe(QueueName.NARRATIVE);
  });

  it('should have correct queue names', () => {
    expect(ingestionQueue.name).toBe('ingestion');
    expect(embeddingQueue.name).toBe('embedding');
    expect(aiAuthoringQueue.name).toBe('ai-authoring');
    expect(narrativeQueue.name).toBe('narrative');
  });
});
