import { indianMobileSchema, paginationQuerySchema } from '@zproo/validation';
import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../src/middleware/errorHandler';
import { httpLogger } from '../src/middleware/httpLogger';
import { validate, validated } from '../src/middleware/validate';

function appWithRoute() {
  const app = express();
  app.use(httpLogger(pino({ level: 'silent' })));
  app.use(express.json());
  app.post(
    '/items/:id',
    validate({
      params: z.object({ id: z.string().min(3) }),
      query: paginationQuerySchema,
      body: z.object({ phone: indianMobileSchema }),
    }),
    (req, res) => {
      res.json({
        params: validated(req, 'params'),
        query: validated(req, 'query'),
        body: validated(req, 'body'),
      });
    },
  );
  app.use(errorHandler);
  return app;
}

describe('validate middleware', () => {
  it('exposes parsed and transformed input', async () => {
    const res = await request(appWithRoute())
      .post('/items/abc?page=2')
      .send({ phone: '98765 43210' })
      .expect(200);
    expect(res.body).toEqual({
      params: { id: 'abc' },
      query: { page: 2, limit: 20 },
      body: { phone: '+919876543210' },
    });
  });

  it('collects issues from every request part', async () => {
    const res = await request(appWithRoute())
      .post('/items/a?limit=1000')
      .send({ phone: '123' })
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    expect(res.body.details.map((d: { path: string }) => d.path)).toEqual([
      'params.id',
      'query.limit',
      'body.phone',
    ]);
  });
});
