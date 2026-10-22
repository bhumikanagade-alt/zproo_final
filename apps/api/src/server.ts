import { createServer } from 'node:http';
import { createApp } from './app';
import { loadEnvFiles, parseEnv } from './config/env';
import { createServices } from './container';
import { createPrismaClient } from './lib/prisma';
import { redisRateLimitStore } from './lib/rateLimitStore';
import { createRedisClient } from './lib/redis';
import { createLogger } from './utils/logger';

loadEnvFiles();
const env = parseEnv(process.env);
const logger = createLogger({
  level: env.LOG_LEVEL,
  pretty: env.NODE_ENV === 'development',
  version: env.APP_VERSION,
});

const prisma = createPrismaClient(logger);
const redis = createRedisClient(env.REDIS_URL, logger);
// Give Redis a moment to connect so the first requests see it; if it is down the API still
// starts (the client keeps reconnecting) and /api/health reports it.
await Promise.race([
  redis.connect().catch(() => undefined),
  new Promise((resolve) => setTimeout(resolve, 3_000).unref()),
]);

if (env.ephemeralSecrets) {
  logger.warn(
    'JWT_SECRET/JWT_REFRESH_SECRET not set — using random secrets; sessions reset on restart',
  );
}

const services = createServices({ env, logger, prisma, redis });
const app = createApp({ env, logger, services, rateLimitStore: redisRateLimitStore(redis) });
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      docs: env.apiDocsEnabled ? `http://localhost:${env.PORT}/api/docs` : 'disabled',
    },
    'ZPROO GO API listening',
  );
});

// Release seats held by unpaid bookings. Safe on every replica (state changes are conditional).
const expiry = setInterval(() => {
  services.bookings
    .expireHolds()
    .catch((err: unknown) => logger.error({ err }, 'Expiring booking holds failed'));
}, 60_000);
expiry.unref();

// Paid train bookings waiting for the railway, and refunds the gateway has not accepted yet.
const reconcile = setInterval(() => {
  services.trainReservations
    .reconcilePending()
    .catch((err: unknown) => logger.error({ err }, 'Reconciling train bookings failed'));
  services.refunds
    .processPending()
    .catch((err: unknown) => logger.error({ err }, 'Processing refunds failed'));
}, 60_000);
reconcile.unref();

let shuttingDown = false;
async function shutdown(signal: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  clearInterval(expiry);
  clearInterval(reconcile);
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  process.exit(exitCode);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  void shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  void shutdown('uncaughtException', 1);
});
