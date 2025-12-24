import { startWorkers } from '@/workers/index';
import { getRedisClient } from '@/lib/redis';
import logger from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => ({})),
}));

jest.mock('@/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
  })),
}));

describe('Workers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start all workers', () => {
    startWorkers();

    expect(logger.info).toHaveBeenCalledWith('Starting background workers...');
    expect(logger.info).toHaveBeenCalledWith('All workers started');
  });

  it('should handle worker events', () => {
    const { Worker } = require('bullmq');
    startWorkers();

    // Verify workers were created
    expect(Worker).toHaveBeenCalled();
  });
});
