import Redis, { RedisOptions } from 'ioredis';

let redis: Redis | null = null;

/**
 * Get or create Redis client
 * @param options - Optional Redis connection options
 */
export function getRedisClient(options?: { maxRetriesPerRequest?: number | null }): Redis {
  if (redis && !options) {
    return redis;
  }

  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);

  // If options are provided, create a new client (for BullMQ which requires maxRetriesPerRequest: null)
  if (options) {
    const clientOptions: RedisOptions = {
      host,
      port,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      // Explicitly use the provided value (including null for BullMQ)
      maxRetriesPerRequest:
        options.maxRetriesPerRequest !== undefined ? options.maxRetriesPerRequest : null,
    };
    const client = new Redis(clientOptions);
    client.on('error', (error) => {
      console.error('Redis connection error:', error);
    });
    client.on('connect', () => {
      console.log('Redis connected');
    });
    return client;
  }

  // Otherwise, use singleton with default options
  const redisOptions: RedisOptions = {
    host,
    port,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  };

  // Otherwise, use singleton
  if (!redis) {
    redis = new Redis(redisOptions);
    redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });
    redis.on('connect', () => {
      console.log('Redis connected');
    });
  }

  return redis;
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

/**
 * Reset Redis client for testing purposes only
 * This should not be used in production code
 */
export function __resetForTesting(): void {
  redis = null;
}
