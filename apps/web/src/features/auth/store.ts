import type { AuthSession, Permission, PublicUser } from '@zproo/types';
import { create } from 'zustand';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  user: PublicUser | null;
  /** Kept in memory only — never in localStorage, where injected scripts could read it. */
  accessToken: string | null;
  setSession: (session: AuthSession) => void;
  setUser: (user: PublicUser) => void;
  clear: () => void;
}

/** A non-secret hint that this browser has signed in, so anonymous visitors skip the refresh call. */
const SESSION_HINT = 'zproo.hasSession';

export const sessionHint = {
  get: () => {
    try {
      return window.localStorage.getItem(SESSION_HINT) === '1';
    } catch {
      return false;
    }
  },
  set: (value: boolean) => {
    try {
      if (value) window.localStorage.setItem(SESSION_HINT, '1');
      else window.localStorage.removeItem(SESSION_HINT);
    } catch {
      /* storage unavailable: every visit simply tries to refresh */
    }
  },
};

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  setSession: ({ user, accessToken }) => {
    sessionHint.set(true);
    set({ status: 'authenticated', user, accessToken });
  },
  setUser: (user) => set({ user }),
  clear: () => {
    sessionHint.set(false);
    set({ status: 'anonymous', user: null, accessToken: null });
  },
}));

export function hasPermission(user: PublicUser | null, permission: Permission): boolean {
  return Boolean(user?.permissions.includes(permission));
}
