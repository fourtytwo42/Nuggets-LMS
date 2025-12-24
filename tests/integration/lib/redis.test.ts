import { getRedisClient, closeRedisConnection } from '@/lib/redis';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

describe('Redis client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await closeRedisConnection();
  });

  it('should create Redis client', () => {
    const client = getRedisClient();
    expect(client).toBeDefined();
    expect(Redis).toHaveBeenCalled();
  });

  it('should reuse existing client', () => {
    const client1 = getRedisClient();
    const client2 = getRedisClient();
    expect(client1).toBe(client2);
  });

  it('should use environment variables for connection', () => {
    process.env.REDIS_HOST = 'test-host';
    process.env.REDIS_PORT = '6380';
    closeRedisConnection();
    getRedisClient();
    expect(Redis).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'test-host',
        port: 6380,
      })
    );
  });
});
