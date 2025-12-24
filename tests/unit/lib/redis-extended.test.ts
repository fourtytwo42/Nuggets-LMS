import { getRedisClient, closeRedisConnection } from '@/lib/redis';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('Redis Client Extended Tests', () => {
  const originalEnv = process.env;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockRedis = {
      on: jest.fn().mockReturnThis(),
      quit: jest.fn().mockResolvedValue('OK'),
    } as any;

    (Redis as jest.Mock).mockImplementation(() => mockRedis);
    // Clear singleton
    (require('@/lib/redis') as any).redis = null;
  });

  afterEach(() => {
    process.env = originalEnv;
    (require('@/lib/redis') as any).redis = null;
  });

  it('should use custom REDIS_HOST from environment', () => {
    process.env.REDIS_HOST = 'custom-host';
    process.env.REDIS_PORT = '6380';
    getRedisClient();
    expect(Redis).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'custom-host',
        port: 6380,
      })
    );
  });

  it('should use default host and port when not set', () => {
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    getRedisClient();
    expect(Redis).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'localhost',
        port: 6379,
      })
    );
  });

  it('should set up error handler', () => {
    getRedisClient();
    expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should set up connect handler', () => {
    getRedisClient();
    expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
  });

  it('should close connection', async () => {
    getRedisClient();
    // Ensure redis is set
    (require('@/lib/redis') as any).redis = mockRedis;
    await closeRedisConnection();
    expect(mockRedis.quit).toHaveBeenCalled();
    expect((require('@/lib/redis') as any).redis).toBeNull();
  });

  it('should return same client instance on subsequent calls', () => {
    const client1 = getRedisClient();
    const client2 = getRedisClient();
    expect(client1).toBe(client2);
  });

  it('should handle close when no connection exists', async () => {
    (require('@/lib/redis') as any).redis = null;
    await expect(closeRedisConnection()).resolves.not.toThrow();
  });
});
