import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp, down, up } from './helpers';

describe('GET /api/health', () => {
  it('reports ok when all dependencies are up', async () => {
    const res = await request(buildTestApp()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Success',
      data: {
        status: 'ok',
        version: '0.1.0',
        checks: { database: { status: 'up' }, redis: { status: 'up' } },
      },
    });
  });

  it('reports degraded (still 200) when a dependency is down', async () => {
    const app = buildTestApp({ checks: [up('database'), down('redis')] });
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.checks.redis).toMatchObject({
      status: 'down',
      error: 'connection refused',
    });
  });

  it('marks a hanging dependency as down after the timeout', async () => {
    const hang = { name: 'database', check: () => new Promise<void>(() => {}) };
    const res = await request(buildTestApp({ checks: [hang] }))
      .get('/api/health')
      .expect(200);
    expect(res.body.data.checks.database).toMatchObject({
      status: 'down',
      error: 'Timed out after 200ms',
    });
  });
});

describe('GET /api/health/ready', () => {
  it('returns 200 when ready', async () => {
    await request(buildTestApp()).get('/api/health/ready').expect(200);
  });

  it('returns 503 with the error envelope when a dependency is down', async () => {
    const app = buildTestApp({ checks: [down('database'), up('redis')] });
    const res = await request(app).get('/api/health/ready').expect(503);
    expect(res.body).toMatchObject({
      success: false,
      errorCode: 'SERVICE_UNAVAILABLE',
      message: 'Dependencies unavailable: database',
      data: null,
    });
  });
});

describe('GET /api/health/live', () => {
  it('always returns 200', async () => {
    const app = buildTestApp({ checks: [down('database'), down('redis')] });
    const res = await request(app).get('/api/health/live').expect(200);
    expect(res.body.data).toEqual({ status: 'ok' });
  });
});
