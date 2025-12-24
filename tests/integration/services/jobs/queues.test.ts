import { createQueue, QueueName, ingestionQueue } from '@/services/jobs/queues';
import { Queue } from 'bullmq';

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    getJobs: jest.fn(),
  })),
  Worker: jest.fn(),
}));

// Mock Redis
jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => ({})),
}));

describe('Job queues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQueue', () => {
    it('should create a queue', () => {
      const queue = createQueue(QueueName.INGESTION);
      expect(queue).toBeDefined();
      expect(Queue).toHaveBeenCalled();
    });

    it('should configure queue with retry options', () => {
      createQueue(QueueName.INGESTION);
      expect(Queue).toHaveBeenCalledWith(
        QueueName.INGESTION,
        expect.objectContaining({
          defaultJobOptions: expect.objectContaining({
            attempts: 3,
            backoff: expect.objectContaining({
              type: 'exponential',
              delay: 2000,
            }),
          }),
        })
      );
    });
  });

  describe('ingestionQueue', () => {
    it('should be defined', () => {
      expect(ingestionQueue).toBeDefined();
    });
  });
});
