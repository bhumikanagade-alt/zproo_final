import type { AuthSession } from '@zproo/types';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiGet, http } from '@/services/http';
import { makeUser } from '@/test/render';
import { bootstrapSession, installAuth, refreshSession } from './session';
import { sessionHint, useAuthStore } from './store';

const session = (token: string): AuthSession => ({
  user: makeUser(),
  accessToken: token,
  expiresIn: 900,
});

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data: unknown };
const originalAdapter = http.defaults.adapter;

/** Routes requests to `handler` instead of the network, like a tiny mock server. */
function mockServer(handler: Handler) {
  const calls: { url: string; authorization: string | undefined }[] = [];
  http.defaults.adapter = async (config) => {
    calls.push({
      url: config.url ?? '',
      authorization: config.headers.Authorization as string | undefined,
    });
    const { status, data } = handler(config);
    const response = { status, statusText: '', data, headers: {}, config };
    if (status >= 400)
      throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response);
    return response;
  };
  return calls;
}

const unauthenticated = {
  status: 401,
  data: { success: false, message: 'Please sign in', errorCode: 'UNAUTHENTICATED', data: null },
};
const ok = (data: unknown) => ({ status: 200, data: { success: true, message: 'Success', data } });

beforeEach(() => {
  installAuth();
  useAuthStore.setState({ status: 'anonymous', user: null, accessToken: null });
  sessionHint.set(false);
});

afterEach(() => {
  http.defaults.adapter = originalAdapter;
});

describe('refreshSession', () => {
  it('shares one request between concurrent callers', async () => {
    const calls = mockServer(() => ok(session('fresh')));
    const [a, b] = await Promise.all([refreshSession(), refreshSession()]);
    expect(calls.filter((c) => c.url === '/auth/refresh')).toHaveLength(1);
    expect(a?.accessToken).toBe('fresh');
    expect(b).toBe(a);
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'fresh',
    });
    expect(sessionHint.get()).toBe(true);
  });

  it('signs out locally when the refresh cookie is rejected', async () => {
    sessionHint.set(true);
    mockServer(() => unauthenticated);
    expect(await refreshSession()).toBeNull();
    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(sessionHint.get()).toBe(false);
  });
});

describe('bootstrapSession', () => {
  it('skips the network for visitors who never signed in', async () => {
    const calls = mockServer(() => ok(session('x')));
    await bootstrapSession();
    expect(calls).toHaveLength(0);
    expect(useAuthStore.getState().status).toBe('anonymous');
  });

  it('restores the session for returning users', async () => {
    sessionHint.set(true);
    mockServer(() => ok(session('restored')));
    await bootstrapSession();
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'restored',
    });
  });
});

describe('HTTP client with auth', () => {
  it('attaches the access token', async () => {
    useAuthStore.setState({ status: 'authenticated', user: makeUser(), accessToken: 'abc' });
    const calls = mockServer(() => ok({ fine: true }));
    await apiGet('/me');
    expect(calls[0]?.authorization).toBe('Bearer abc');
  });

  it('renews an expired access token once and replays the request', async () => {
    useAuthStore.setState({ status: 'authenticated', user: makeUser(), accessToken: 'expired' });
    const calls = mockServer((config) => {
      if (config.url === '/auth/refresh') return ok(session('renewed'));
      return config.headers.Authorization === 'Bearer renewed'
        ? ok({ name: 'Amit' })
        : unauthenticated;
    });
    expect(await apiGet('/me')).toEqual({ name: 'Amit' });
    expect(calls.map((c) => [c.url, c.authorization])).toEqual([
      ['/me', 'Bearer expired'],
      ['/auth/refresh', 'Bearer expired'],
      ['/me', 'Bearer renewed'],
    ]);
  });

  it('gives up after one renewal attempt', async () => {
    useAuthStore.setState({ status: 'authenticated', user: makeUser(), accessToken: 'expired' });
    const calls = mockServer(() => unauthenticated);
    await expect(apiGet('/me')).rejects.toMatchObject({
      status: 401,
      errorCode: 'UNAUTHENTICATED',
    });
    expect(calls.map((c) => c.url)).toEqual(['/me', '/auth/refresh']);
    expect(useAuthStore.getState().status).toBe('anonymous');
  });

  it('never tries to renew for auth endpoints', async () => {
    const calls = mockServer(() => unauthenticated);
    await expect(http.post('/auth/login', {})).rejects.toMatchObject({ status: 401 });
    expect(calls).toHaveLength(1);
  });
});
