import type { Logger } from 'pino';
import { ProviderError, RateLimitError } from '../../utils/errors';
import type { TrainProvider } from './TrainProvider';

/**
 * Error an adapter throws for a failed provider call. `retryable` marks transient failures
 * (timeouts, 5xx, connection resets); `rateLimited` marks HTTP 429 / quota responses.
 * Messages must be safe to log: never include passenger details or credentials.
 */
export class TrainProviderError extends Error {
  constructor(
    message: string,
    readonly options: { retryable?: boolean; rateLimited?: boolean; status?: number } = {},
  ) {
    super(message);
    this.name = 'TrainProviderError';
  }
}

export class TrainProviderTimeoutError extends TrainProviderError {
  constructor(operation: string, ms: number) {
    super(`Railway provider did not answer ${operation} within ${ms} ms`, { retryable: true });
    this.name = 'TrainProviderTimeoutError';
  }
}

export interface ResilienceOptions {
  timeoutMs: number;
  /** Extra attempts for read-only calls. Booking and cancellation are never retried blindly. */
  retries: number;
  logger: Logger;
  /** Back-off base (ms); attempt n waits base × 2^(n-1). */
  backoffMs?: number;
}

const READS = new Set([
  'searchStations',
  'search',
  'getOffer',
  'status',
  'cancellationQuote',
  'liveStatus',
]);

function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TrainProviderTimeoutError(operation, ms)), ms);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps any railway adapter with timeouts, bounded retries for safe (read-only) calls, rate-limit
 * mapping and structured logging. Booking and cancellation calls get a timeout but no automatic
 * retry: their outcome is then unknown, and the reservation service reconciles it with `status`
 * (adapters must make `book`/`cancel` idempotent on our references).
 */
export function resilientTrainProvider(
  inner: TrainProvider,
  options: ResilienceOptions,
): TrainProvider {
  const { timeoutMs, retries, logger } = options;
  const backoff = options.backoffMs ?? 250;

  async function call<T>(operation: string, run: () => Promise<T>): Promise<T> {
    const attempts = READS.has(operation) ? retries + 1 : 1;
    for (let attempt = 1; ; attempt++) {
      const started = Date.now();
      try {
        const result = await withTimeout(run(), timeoutMs, operation);
        logger.debug(
          { provider: inner.name, operation, attempt, ms: Date.now() - started },
          'Railway provider call',
        );
        return result;
      } catch (err) {
        const e = err instanceof TrainProviderError ? err : null;
        const log = {
          provider: inner.name,
          operation,
          attempt,
          ms: Date.now() - started,
          err: { name: (err as Error).name, message: (err as Error).message },
        };
        if (e?.options.rateLimited) {
          logger.warn(log, 'Railway provider rate limit');
          throw new RateLimitError('The railway system is busy. Please try again in a minute.');
        }
        const retryable = e ? Boolean(e.options.retryable) : false;
        if (retryable && attempt < attempts) {
          logger.warn(log, 'Railway provider call failed; retrying');
          await sleep(backoff * 2 ** (attempt - 1));
          continue;
        }
        logger.error(log, 'Railway provider call failed');
        if (e)
          throw new ProviderError(
            'The railway system is not responding. Please try again shortly.',
            inner.name,
          );
        throw err;
      }
    }
  }

  return {
    name: inner.name,
    isDemo: inner.isDemo,
    capabilities: () => inner.capabilities(),
    searchStations: (q, limit) => call('searchStations', () => inner.searchStations(q, limit)),
    search: (q) => call('search', () => inner.search(q)),
    getOffer: (id, quota, c) => call('getOffer', () => inner.getOffer(id, quota, c)),
    book: (req) => call('book', () => inner.book(req)),
    status: (ref) => call('status', () => inner.status(ref)),
    cancellationQuote: (req) => call('cancellationQuote', () => inner.cancellationQuote(req)),
    cancel: (req) => call('cancel', () => inner.cancel(req)),
    liveStatus: (n, d) => call('liveStatus', () => inner.liveStatus(n, d)),
  };
}
