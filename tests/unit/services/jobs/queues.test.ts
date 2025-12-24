import {
  ingestionQueue,
  embeddingQueue,
  aiAuthoringQueue,
  narrativeQueue,
} from '@/services/jobs/queues';
import { Queue } from 'bullmq';

jest.mock('bullmq');
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
    expect(ingestionQueue).toBeInstanceOf(Queue);
  });

  it('should create embedding queue', () => {
    expect(embeddingQueue).toBeDefined();
    expect(embeddingQueue).toBeInstanceOf(Queue);
  });

  it('should create aiAuthoring queue', () => {
    expect(aiAuthoringQueue).toBeDefined();
    expect(aiAuthoringQueue).toBeInstanceOf(Queue);
  });

  it('should create narrative queue', () => {
    expect(narrativeQueue).toBeDefined();
    expect(narrativeQueue).toBeInstanceOf(Queue);
  });

  it('should have correct queue names', () => {
    expect(ingestionQueue.name).toBe('ingestion');
    expect(embeddingQueue.name).toBe('embedding');
    expect(aiAuthoringQueue.name).toBe('ai-authoring');
    expect(narrativeQueue.name).toBe('narrative');
  });
});
