import type { PrismaClient } from '@prisma/client';
import type { Env } from '../../config/env';
import type { BusProvider } from './BusProvider';
import { MockBusProvider } from './MockBusProvider';

export type { BusProvider, BusSearchQuery } from './BusProvider';
export { MockBusProvider } from './MockBusProvider';

export function createBusProvider(
  env: Pick<Env, 'BUS_PROVIDER'>,
  prisma: PrismaClient,
): BusProvider {
  switch (env.BUS_PROVIDER) {
    case 'mock':
      return new MockBusProvider(prisma);
  }
}
