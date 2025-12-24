import { startWorkers } from '@/workers/index';
import { getRedisClient } from '@/lib/redis';
import logger from '@/lib/logger';

// Mock cheerio to avoid ES module issues
jest.mock('cheerio', () => {
  const mockText = jest.fn(() => 'Mocked text content');
  const mockRemove = jest.fn().mockReturnThis();
  const cheerioInstance = jest.fn((selector: string) => {
    if (selector === 'script, style') {
      return { remove: mockRemove };
    }
    return { text: mockText };
  }) as any;
  cheerioInstance.text = mockText;
  cheerioInstance.remove = mockRemove;
  return {
    load: jest.fn(() => cheerioInstance),
  };
});

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
