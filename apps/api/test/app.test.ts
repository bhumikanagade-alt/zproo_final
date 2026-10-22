import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers';

describe('error handling', () => {
  it('returns the 404 envelope for unknown routes', async () => {
    const res = await request(buildTestApp()).get('/api/does-not-exist').expect(404);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Route GET /api/does-not-exist not found',
      errorCode: 'NOT_FOUND',
      data: null,
    });
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('rejects malformed JSON with 400 BAD_REQUEST', async () => {
    const res = await request(buildTestApp())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":')
      .expect(400);
    expect(res.body).toMatchObject({
      success: false,
      errorCode: 'BAD_REQUEST',
      message: 'Malformed JSON body',
    });
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await request(buildTestApp())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ blob: 'x'.repeat(200 * 1024) }))
      .expect(413);
    expect(res.body.errorCode).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('request IDs', () => {
  it('generates a request id when none is supplied', async () => {
    const res = await request(buildTestApp()).get('/api/health/live');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('propagates a well-formed incoming request id', async () => {
    const res = await request(buildTestApp())
      .get('/api/health/live')
      .set('X-Request-Id', 'edge-abc12345');
    expect(res.headers['x-request-id']).toBe('edge-abc12345');
  });

  it('replaces a malformed incoming request id', async () => {
    const res = await request(buildTestApp())
      .get('/api/health/live')
      .set('X-Request-Id', 'bad id <script>');
    expect(res.headers['x-request-id']).not.toBe('bad id <script>');
  });
});

describe('security', () => {
  it('sets security headers and hides the framework', async () => {
    const res = await request(buildTestApp()).get('/api/health/live');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('allows CORS with credentials for the frontend origin', async () => {
    const res = await request(buildTestApp())
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not grant CORS to unknown origins', async () => {
    const res = await request(buildTestApp())
      .get('/api/health/live')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rate limits API requests with the error envelope', async () => {
    const app = buildTestApp({ env: { RATE_LIMIT_MAX: '2' } });
    await request(app).get('/api/nope').expect(404);
    await request(app).get('/api/nope').expect(404);
    const res = await request(app).get('/api/nope').expect(429);
    expect(res.body).toMatchObject({ success: false, errorCode: 'RATE_LIMITED' });
    expect(res.headers['ratelimit-policy']).toBeDefined();
  });

  it('does not rate limit health probes', async () => {
    const app = buildTestApp({ env: { RATE_LIMIT_MAX: '1' } });
    for (let i = 0; i < 3; i++) await request(app).get('/api/health/live').expect(200);
  });
});

describe('API docs', () => {
  it('serves the OpenAPI document for every module', async () => {
    const res = await request(buildTestApp()).get('/api/docs/openapi.json').expect(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining([
        '/health',
        '/health/ready',
        '/health/live',
        '/auth/send-otp',
        '/auth/verify-otp',
        '/auth/register',
        '/auth/login',
        '/auth/social/{provider}',
        '/auth/refresh',
        '/auth/logout',
        '/auth/logout-all',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/me',
        '/admin/users',
        '/flights/search',
        '/flights/{offerId}',
        '/flights/book',
        '/bookings',
        '/bookings/{reference}',
        '/bookings/{reference}/ticket.pdf',
        '/payments/create',
        '/payments/verify',
        '/payments/{paymentId}/fail',
        '/buses/search',
        '/buses/{tripId}',
        '/buses/{tripId}/seats',
        '/buses/book',
      ]),
    );
    const login = res.body.paths['/auth/login'].post.requestBody.content['application/json'].schema;
    expect(login.properties).toHaveProperty('identifier');
    expect(login.properties).toHaveProperty('password');
    expect(res.body.components.securitySchemes).toHaveProperty('bearerAuth');
  });

  it('serves Swagger UI', async () => {
    const res = await request(buildTestApp()).get('/api/docs/').expect(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('is disabled when ENABLE_API_DOCS=false', async () => {
    await request(buildTestApp({ env: { ENABLE_API_DOCS: 'false' } }))
      .get('/api/docs/openapi.json')
      .expect(404);
  });
});
