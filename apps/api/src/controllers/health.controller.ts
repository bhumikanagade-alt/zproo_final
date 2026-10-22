import type { RequestHandler } from 'express';
import type { HealthService } from '../services/health.service';
import { ServiceUnavailableError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export function createHealthController(health: HealthService) {
  /** Full report; always 200 so dashboards can read degraded details. */
  const report: RequestHandler = async (_req, res) => {
    sendSuccess(res, await health.report());
  };

  /** Readiness probe: 503 when any dependency is down, so load balancers stop routing. */
  const ready: RequestHandler = async (_req, res) => {
    const result = await health.report();
    if (result.status !== 'ok') {
      const down = Object.entries(result.checks)
        .filter(([, check]) => check.status === 'down')
        .map(([name]) => name);
      throw new ServiceUnavailableError(`Dependencies unavailable: ${down.join(', ')}`);
    }
    sendSuccess(res, result, 'Ready');
  };

  /** Liveness probe: the process is up and serving requests. */
  const live: RequestHandler = (_req, res) => {
    sendSuccess(res, { status: 'ok' }, 'Alive');
  };

  return { report, ready, live };
}
