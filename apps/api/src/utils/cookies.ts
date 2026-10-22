import type { CookieOptions, Request, Response } from 'express';
import type { Env } from '../config/env';
import { AUTH } from '../config/constants';

type CookieEnv = Pick<Env, 'isProduction' | 'COOKIE_DOMAIN'>;

function refreshCookieOptions(env: CookieEnv): CookieOptions {
  return {
    httpOnly: true, // unreadable by JavaScript, so XSS cannot steal it
    secure: env.isProduction, // HTTPS only in production (local dev runs on http)
    sameSite: 'lax', // not sent on cross-site POSTs, which blocks CSRF on /auth/refresh
    path: AUTH.refreshCookiePath, // only sent to auth endpoints
    ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN }),
  };
}

export function setRefreshCookie(res: Response, token: string, maxAgeMs: number, env: CookieEnv) {
  res.cookie(AUTH.refreshCookieName, token, { ...refreshCookieOptions(env), maxAge: maxAgeMs });
}

export function clearRefreshCookie(res: Response, env: CookieEnv) {
  res.clearCookie(AUTH.refreshCookieName, refreshCookieOptions(env));
}

export function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[AUTH.refreshCookieName];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
