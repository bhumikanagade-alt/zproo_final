import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { DependencyCheck } from '../services/health.service';

export function databaseCheck(prisma: PrismaClient): DependencyCheck {
  return {
    name: 'database',
    async check() {
      await prisma.$queryRaw`SELECT 1`;
    },
  };
}

export function redisCheck(redis: Redis): DependencyCheck {
  return {
    name: 'redis',
    async check() {
      const reply = await redis.ping();
      if (reply !== 'PONG') throw new Error(`Unexpected PING reply: ${reply}`);
    },
  };
}
