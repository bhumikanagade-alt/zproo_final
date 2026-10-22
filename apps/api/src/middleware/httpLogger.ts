import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

const INCOMING_ID = /^[A-Za-z0-9._-]{8,128}$/;
const QUIET_PATHS = new Set(['/api/health/live']);

/**
 * Structured request logging. Assigns every request an ID (reusing a well-formed
 * `X-Request-Id` from the caller/proxy), echoes it in the response, and logs method,
 * path, status and duration. Query strings are dropped because they can carry PII.
 */
export function httpLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId(req, res) {
      const incoming = req.headers['x-request-id'];
      const id =
        typeof incoming === 'string' && INCOMING_ID.test(incoming) ? incoming : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    autoLogging: { ignore: (req) => QUIET_PATHS.has(req.url?.split('?')[0] ?? '') },
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res, responseTime) =>
      `${req.method} ${req.url?.split('?')[0]} ${res.statusCode} ${Math.round(responseTime)}ms`,
    customErrorMessage: (req, res) => `${req.method} ${req.url?.split('?')[0]} ${res.statusCode}`,
    serializers: {
      req: (req: { id: string; method: string; url: string; remoteAddress?: string }) => ({
        id: req.id,
        method: req.method,
        path: req.url.split('?')[0],
        ip: req.remoteAddress,
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });
}
