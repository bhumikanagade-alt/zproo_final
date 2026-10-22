import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import type { Env } from '../../config/env';
import { MockTrainProvider } from './MockTrainProvider';
import { resilientTrainProvider } from './resilient';
import type { TrainProvider } from './TrainProvider';

export type * from './TrainProvider';
export { MockTrainProvider } from './MockTrainProvider';
export { resilientTrainProvider, TrainProviderError, TrainProviderTimeoutError } from './resilient';

/**
 * Railway provider selected by TRAIN_PROVIDER. Only the development mock ships today: live
 * Indian Railways booking needs an authorised IRCTC partner integration (docs/RAILWAY_PROVIDER.md).
 * Production refuses to start with the mock (env validation), so it can never fall back silently.
 */
export function createTrainProvider(
  env: Pick<Env, 'TRAIN_PROVIDER' | 'TRAIN_PROVIDER_TIMEOUT_MS' | 'TRAIN_PROVIDER_RETRIES'>,
  prisma: PrismaClient,
  logger: Logger,
): TrainProvider {
  let inner: TrainProvider;
  switch (env.TRAIN_PROVIDER) {
    case 'mock':
      inner = new MockTrainProvider(prisma);
      break;
  }
  return resilientTrainProvider(inner, {
    timeoutMs: env.TRAIN_PROVIDER_TIMEOUT_MS,
    retries: env.TRAIN_PROVIDER_RETRIES,
    logger: logger.child({ module: 'train-provider' }),
  });
}
