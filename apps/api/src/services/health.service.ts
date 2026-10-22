import type { HealthReport } from '@zproo/types';

export interface DependencyCheck {
  name: string;
  check(): Promise<void>;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export class HealthService {
  private readonly startedAt = Date.now();

  constructor(
    private readonly checks: DependencyCheck[],
    private readonly version: string,
    private readonly timeoutMs = 2_000,
  ) {}

  async report(): Promise<HealthReport> {
    const results = await Promise.all(
      this.checks.map(async ({ name, check }) => {
        const started = performance.now();
        try {
          await withTimeout(check(), this.timeoutMs);
          return [
            name,
            { status: 'up' as const, latencyMs: Math.round(performance.now() - started) },
          ] as const;
        } catch (error) {
          return [
            name,
            {
              status: 'down' as const,
              latencyMs: Math.round(performance.now() - started),
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          ] as const;
        }
      }),
    );
    const checks = Object.fromEntries(results);
    return {
      status: results.every(([, r]) => r.status === 'up') ? 'ok' : 'degraded',
      version: this.version,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
