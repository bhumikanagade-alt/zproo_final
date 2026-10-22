import { Redis } from 'ioredis';
import type { Logger } from 'pino';

export function createRedisClient(url: string, logger: Logger): Redis {
  const redis = new Redis(url, {
    lazyConnect: true,
    // Fail fast instead of queueing commands while Redis is down; callers degrade gracefully.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => Math.min(attempt * 500, 5_000),
  });

  let lastErrorLoggedAt = 0;
  redis.on('error', (err: Error) => {
    // Reconnect attempts can emit an error every few hundred ms; log at most every 30 s.
    if (Date.now() - lastErrorLoggedAt > 30_000) {
      lastErrorLoggedAt = Date.now();
      logger.warn({ err: { message: err.message } }, 'Redis connection error');
    }
  });
  redis.on('ready', () => logger.info('Redis connected'));
  return redis;
}
