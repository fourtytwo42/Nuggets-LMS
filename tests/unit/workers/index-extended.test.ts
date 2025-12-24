// Mock dependencies BEFORE imports
jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => ({})),
}));

jest.mock('@/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockWorker = {
  on: jest.fn(),
  close: jest.fn(),
};

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => mockWorker),
}));

jest.mock('@/services/jobs/queues', () => ({
  QueueName: {
    INGESTION: 'ingestion-queue',
    EMBEDDING: 'embedding-queue',
    AI_AUTHORING: 'ai-authoring-queue',
    NARRATIVE: 'narrative-queue',
  },
}));

import { startWorkers } from '@/workers/index';
import logger from '@/lib/logger';

describe('Workers - Extended Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create workers for all queues', () => {
    const { Worker } = require('bullmq');
    startWorkers();

    expect(Worker).toHaveBeenCalledTimes(4);
  });

  it('should set up event handlers for workers', () => {
    startWorkers();

    expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(mockWorker.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should handle worker completed event', () => {
    startWorkers();

    const completedHandler = mockWorker.on.mock.calls.find((call) => call[0] === 'completed')?.[1];
    if (completedHandler) {
      const mockJob = { id: 'job-123' };
      completedHandler(mockJob);
      expect(logger.info).toHaveBeenCalledWith('Worker job completed: job-123');
    }
  });

  it('should handle worker failed event', () => {
    startWorkers();

    const failedHandler = mockWorker.on.mock.calls.find((call) => call[0] === 'failed')?.[1];
    if (failedHandler) {
      const mockJob = { id: 'job-123' };
      const mockError = new Error('Job failed');
      failedHandler(mockJob, mockError);
      expect(logger.error).toHaveBeenCalledWith('Worker job failed: job-123', {
        error: 'Job failed',
      });
    }
  });

  it('should handle worker error event', () => {
    startWorkers();

    const errorHandler = mockWorker.on.mock.calls.find((call) => call[0] === 'error')?.[1];
    if (errorHandler) {
      const mockError = new Error('Worker error');
      errorHandler(mockError);
      expect(logger.error).toHaveBeenCalledWith('Worker error', { error: 'Worker error' });
    }
  });
});
