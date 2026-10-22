import type { AuthSession } from '@zproo/types';
import { ApiClientError, configureAuth } from '@/services/http';
import { authApi } from './api';
import { useAuthFlow } from './flowStore';
import { sessionHint, useAuthStore } from './store';

let inFlight: Promise<AuthSession | null> | null = null;

/**
 * Exchanges the refresh cookie for a new session. Concurrent callers share one request, and
 * tabs take turns via the Web Locks API: refresh tokens are single-use, so two tabs refreshing
 * with the same cookie would look like token theft and end the session.
 */
export function refreshSession(): Promise<AuthSession | null> {
  inFlight ??= withCrossTabLock(async () => {
    try {
      const session = await authApi.refresh();
      useAuthStore.getState().setSession(session);
      return session;
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
        useAuthStore.getState().clear();
        return null;
      }
      throw error;
    }
  }).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function withCrossTabLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? locks.request('zproo-auth-refresh', fn) : fn();
}

/** On page load: restore the session if this browser has signed in before. */
export async function bootstrapSession(): Promise<void> {
  if (!sessionHint.get()) {
    useAuthStore.getState().clear();
    return;
  }
  try {
    await refreshSession();
  } catch {
    // Network or server trouble: treat as signed out for now; the next API call retries.
    useAuthStore.setState({ status: 'anonymous' });
  }
}

export async function signOut(options: { everywhere?: boolean } = {}): Promise<void> {
  try {
    await (options.everywhere ? authApi.logoutAll() : authApi.logout());
  } finally {
    useAuthStore.getState().clear();
    useAuthFlow.getState().clear();
  }
}

/** Connects the HTTP client to the session: attaches the access token and renews it on 401. */
export function installAuth(): void {
  configureAuth({
    getAccessToken: () => useAuthStore.getState().accessToken,
    refresh: async () => (await refreshSession())?.accessToken ?? null,
  });
}
