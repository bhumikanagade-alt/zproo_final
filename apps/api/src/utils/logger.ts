import { pino, type Logger } from 'pino';

/**
 * Anything matching these paths is replaced with "[REDACTED]" before a log line is written.
 * Keep this list in sync with docs/SECURITY.md.
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-razorpay-signature"]',
  'res.headers["set-cookie"]',
  ...[
    'password',
    'passwordHash',
    'otp',
    'otpCode',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'signature',
    'cardNumber',
    'cvv',
  ].flatMap((key) => [key, `*.${key}`]),
];

export function createLogger(options: { level: string; pretty: boolean; version: string }): Logger {
  return pino({
    level: options.level,
    base: { service: 'zproo-api', version: options.version },
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(options.pretty && {
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service,version' },
      },
    }),
  });
}
