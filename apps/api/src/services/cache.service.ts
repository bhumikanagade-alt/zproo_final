import type { Redis } from 'ioredis';
import type { Logger } from 'pino';

/**
 * Small JSON cache over Redis. Optional: without Redis (tests, outages) every call is a miss, and
 * Redis errors never fail a request.
 */
export class CacheService {
  constructor(
    private readonly redis: Redis | undefined,
    private readonly logger: Logger,
  ) {}

  async getOrSet<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await load();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  private async get<T>(key: string): Promise<T | undefined> {
    if (!this.redis || this.redis.status !== 'ready') return undefined;
    try {
      const raw = await this.redis.get(key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch (err) {
      this.logger.warn({ err: { message: (err as Error).message }, key }, 'Cache read failed');
      return undefined;
    }
  }

  private async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.redis || this.redis.status !== 'ready') return;
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn({ err: { message: (err as Error).message }, key }, 'Cache write failed');
    }
  }
}
