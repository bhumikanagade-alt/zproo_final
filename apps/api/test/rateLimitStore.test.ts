import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RedisRateLimitStore } from '../src/lib/rateLimitStore';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379/15', {
  lazyConnect: true,
});

beforeAll(() => redis.connect());
afterAll(() => redis.quit());

describe('RedisRateLimitStore', () => {
  it('counts hits within a window and expires them', async () => {
    const store = new RedisRateLimitStore(redis, `rl:test:${Date.now()}:`);
    store.init({ windowMs: 300 } as never);
    const first = await store.increment('k');
    const second = await store.increment('k');
    expect([first.totalHits, second.totalHits]).toEqual([1, 2]);
    expect(second.resetTime?.getTime()).toBeGreaterThan(Date.now());
    await new Promise((r) => setTimeout(r, 400));
    expect((await store.increment('k')).totalHits).toBe(1);
  });

  it('supports decrement and reset', async () => {
    const store = new RedisRateLimitStore(redis, `rl:test:${Date.now()}:b:`);
    store.init({ windowMs: 10_000 } as never);
    await store.increment('k');
    await store.increment('k');
    await store.decrement('k');
    expect((await store.increment('k')).totalHits).toBe(2);
    await store.resetKey('k');
    expect((await store.increment('k')).totalHits).toBe(1);
  });
});
