import type { IncrementResponse, Options, Store } from 'express-rate-limit';
import type { Redis } from 'ioredis';
import type { RateLimitStoreFactory } from '../middleware/rateLimit';

/**
 * Fixed-window counter in Redis, shared by all API replicas. Uses plain MULTI commands (no Lua
 * scripts to load), so it recovers by itself when Redis comes back after an outage.
 */
export class RedisRateLimitStore implements Store {
  readonly prefix: string;
  private windowMs = 60_000;

  constructor(
    private readonly redis: Redis,
    prefix: string,
  ) {
    this.prefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const k = this.prefix + key;
    // SET NX starts a new window only if none exists; INCR and PTTL read it in the same transaction.
    const results = await this.redis
      .multi()
      .set(k, 0, 'PX', this.windowMs, 'NX')
      .incr(k)
      .pttl(k)
      .exec();
    if (!results) throw new Error('Rate limit transaction aborted');
    const [, [incrError, totalHits], [ttlError, ttl]] = results as [
      unknown,
      [Error | null, number],
      [Error | null, number],
    ];
    if (incrError || ttlError) throw incrError ?? ttlError;
    return { totalHits, resetTime: new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs)) };
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(this.prefix + key);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(this.prefix + key);
  }
}

export function redisRateLimitStore(redis: Redis): RateLimitStoreFactory {
  return (prefix) => new RedisRateLimitStore(redis, prefix);
}
