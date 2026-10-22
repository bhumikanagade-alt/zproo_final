import { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';

export function createPrismaClient(logger: Logger): PrismaClient {
  const prisma = new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  });
  // Query parameters are never logged — they may contain personal data.
  prisma.$on('warn', (event) => logger.warn({ target: event.target }, event.message));
  prisma.$on('error', (event) => logger.error({ target: event.target }, event.message));
  return prisma;
}
