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
    try {
      (require('@/lib/redis') as any).redis = null;
    } catch (e) {
      // Module might not be loaded yet
    }
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
    const redisModule = require('@/lib/redis');
    (redisModule as any).redis = null;
    // Clear mock calls from previous tests
    (Redis as jest.Mock).mockClear();
    // Ensure mock implementation is set
    (Redis as jest.Mock).mockImplementation(() => mockRedis);
    const client = redisModule.getRedisClient();
    expect(Redis).toHaveBeenCalled();
    const callArgs = (Redis as jest.Mock).mock.calls[0][0];
    expect(callArgs.host).toBe('localhost');
    expect(callArgs.port).toBe(6379);
    expect(client).toBe(mockRedis);
  });

  it('should set up error handler', () => {
    jest.resetModules();
    const redisModule = require('@/lib/redis');
    (redisModule as any).redis = null;
    const client = redisModule.getRedisClient();
    // Error handler is set up in the actual implementation
    // Check that on was called with 'error'
    const errorCall = (client.on as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === 'error'
    );
    expect(errorCall).toBeDefined();
  });

  it('should set up connect handler', () => {
    jest.resetModules();
    const redisModule = require('@/lib/redis');
    (redisModule as any).redis = null;
    const client = redisModule.getRedisClient();
    // Connect handler is set up in the actual implementation
    // Check that on was called with 'connect'
    const connectCall = (client.on as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === 'connect'
    );
    expect(connectCall).toBeDefined();
  });

  it('should close connection', async () => {
    const redisModule = require('@/lib/redis');
    // Clear singleton and get a client to set up the singleton
    (redisModule as any).redis = null;
    const client = redisModule.getRedisClient();
    expect(client).toBe(mockRedis);
    // Clear quit mock calls
    (mockRedis.quit as jest.Mock).mockClear();
    // Now close it
    await redisModule.closeRedisConnection();
    expect(mockRedis.quit).toHaveBeenCalled();
    expect((redisModule as any).redis).toBeNull();
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
