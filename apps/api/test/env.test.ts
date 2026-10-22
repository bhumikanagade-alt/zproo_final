import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env';
import { baseEnv as testEnv } from './helpers';

// Environment without secrets, as a fresh deployment starts.
const { JWT_SECRET: _a, JWT_REFRESH_SECRET: _b, ...baseEnv } = testEnv;

const secret = 'a'.repeat(32);
const otherSecret = 'b'.repeat(32);

describe('parseEnv', () => {
  it('applies defaults', () => {
    const env = parseEnv({ ...baseEnv, NODE_ENV: 'development' });
    expect(env.PORT).toBe(5000);
    expect(env.corsOrigins).toEqual(['http://localhost:5173']);
    expect(env.apiDocsEnabled).toBe(true);
    expect(env.accessTokenTtlSeconds).toBe(900);
    expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(30);
  });

  it('parses a CORS allowlist and strips trailing slashes', () => {
    const env = parseEnv({
      ...baseEnv,
      CORS_ORIGINS: 'https://zproogo.com/, https://admin.zproogo.com',
    });
    expect(env.corsOrigins).toEqual(['https://zproogo.com', 'https://admin.zproogo.com']);
  });

  it('rejects a non-postgres DATABASE_URL without echoing the value', () => {
    const bad = { ...baseEnv, DATABASE_URL: 'mysql://user:hunter2@db/x' };
    expect(() => parseEnv(bad)).toThrow(/DATABASE_URL: must be a postgres/);
    expect(() => parseEnv(bad)).not.toThrow(/hunter2/);
  });

  it('requires distinct JWT secrets in production', () => {
    expect(() => parseEnv({ ...baseEnv, NODE_ENV: 'production' })).toThrow(
      /JWT_SECRET: is required in production/,
    );
    expect(() =>
      parseEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        JWT_SECRET: secret,
        JWT_REFRESH_SECRET: secret,
      }),
    ).toThrow(/must differ/);
  });

  it('refuses the console SMS and email providers in production', () => {
    const prod = {
      ...baseEnv,
      NODE_ENV: 'production',
      JWT_SECRET: secret,
      JWT_REFRESH_SECRET: otherSecret,
    };
    expect(() => parseEnv(prod)).toThrow(
      /SMS_PROVIDER: console provider is not allowed in production/,
    );
    expect(() => parseEnv(prod)).toThrow(
      /EMAIL_PROVIDER: console provider is not allowed in production/,
    );
  });

  it.each(['FLIGHT_PROVIDER', 'BUS_PROVIDER', 'TRAIN_PROVIDER', 'PAYMENT_PROVIDER'])(
    'refuses the mock %s in production',
    (key) => {
      const prod = {
        ...baseEnv,
        NODE_ENV: 'production',
        JWT_SECRET: secret,
        JWT_REFRESH_SECRET: otherSecret,
      };
      expect(() => parseEnv(prod)).toThrow(
        new RegExp(`${key}: mock provider is not allowed in production`),
      );
    },
  );

  it('generates throwaway secrets outside production and flags it', () => {
    const env = parseEnv({ ...baseEnv, NODE_ENV: 'development' });
    expect(env.ephemeralSecrets).toBe(true);
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.JWT_SECRET).not.toBe(env.JWT_REFRESH_SECRET);
    expect(parseEnv(testEnv).ephemeralSecrets).toBe(false);
  });

  it('treats empty values (KEY= in .env) as unset', () => {
    const env = parseEnv({ ...testEnv, JWT_SECRET: '', PORT: '', CORS_ORIGINS: '' });
    expect(env.ephemeralSecrets).toBe(true);
    expect(env.PORT).toBe(5000);
    expect(env.corsOrigins).toEqual(['http://localhost:5173']);
  });

  it('rejects short secrets', () => {
    expect(() => parseEnv({ ...baseEnv, JWT_SECRET: 'short' })).toThrow(/at least 32/);
  });

  it('parses the access token lifetime', () => {
    expect(parseEnv({ ...testEnv, JWT_ACCESS_TTL: '1h' }).accessTokenTtlSeconds).toBe(3600);
    expect(parseEnv({ ...testEnv, JWT_ACCESS_TTL: '90s' }).accessTokenTtlSeconds).toBe(90);
    expect(() => parseEnv({ ...testEnv, JWT_ACCESS_TTL: '15 minutes' })).toThrow(/JWT_ACCESS_TTL/);
  });
});
