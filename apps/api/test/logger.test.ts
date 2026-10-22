import { Writable } from 'node:stream';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { REDACT_PATHS } from '../src/utils/logger';

describe('logger redaction', () => {
  it('never writes secrets', () => {
    let output = '';
    const sink = new Writable({
      write(chunk, _enc, cb) {
        output += String(chunk);
        cb();
      },
    });
    const logger = pino({ redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } }, sink);
    logger.info({
      password: 'hunter2',
      body: { otp: '482913', refreshToken: 'rt_abc', cardNumber: '4111111111111111' },
      req: { headers: { authorization: 'Bearer eyJ', cookie: 'rt=abc' } },
    });
    for (const secret of [
      'hunter2',
      '482913',
      'rt_abc',
      '4111111111111111',
      'Bearer eyJ',
      'rt=abc',
    ]) {
      expect(output).not.toContain(secret);
    }
    expect(output).toContain('[REDACTED]');
  });
});
