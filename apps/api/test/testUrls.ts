/** Test infrastructure URLs, shared by vitest.config.ts and globalSetup. Override via env. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://zproo:zproo@localhost:5432/zproo_test?schema=public';
export const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15';
