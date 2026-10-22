import type { AdminUserRow, Paginated, PlatformSettings, RoleName, UserStatus } from '@zproo/types';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@/components/feedback/Notifications';
import { errorMessage } from '@/features/auth/errors';
import { ApiClientError, apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/services/http';

/** "body.validTo" → "Valid to" */
export const humanizePath = (path: string) =>
  (path.split('.').filter((p) => p !== 'body' && p !== 'query').join(' ') || 'Input')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

/** Field errors of a failed write, keyed by top-level field name. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiClientError)) return {};
  const out: Record<string, string> = {};
  for (const d of error.details) {
    const key = d.path.split('.').filter((p) => p !== 'body')[0] ?? '';
    out[key] ??= d.message;
  }
  return out;
}

/** Query params: empty strings and undefined are dropped so URLs stay clean. */
export type Params = Record<string, string | number | boolean | undefined | null>;
const clean = (params?: Params) =>
  params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)) : undefined;

export const adminKeys = {
  all: ['admin'] as const,
  get: (path: string, params?: Params) => ['admin', path, clean(params) ?? {}] as const,
  users: (filters: AdminUserFilters) => ['admin', '/users', clean({ ...filters }) ?? {}] as const,
};

/** Cached GET under /api/admin. Lists keep showing the previous page while the next loads. */
export function useAdminGet<T>(path: string, params?: Params, options: { enabled?: boolean; refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: adminKeys.get(path, params),
    queryFn: () => apiGet<T>(`/admin${path}`, { params: clean(params) }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    ...options,
  });
}

type Method = 'post' | 'patch' | 'put' | 'delete';

/**
 * Which cached admin screens a change can affect, by the first part of the path it changes.
 * Anything not listed refreshes every admin screen (the safe default).
 */
const AFFECTS: Record<string, string[]> = {
  bookings: ['/bookings', '/payments', '/refunds', '/users', '/inventory', '/dashboard', '/reports', '/audit'],
  refunds: ['/refunds', '/bookings', '/payments', '/dashboard', '/reports', '/audit'],
  users: ['/users', '/bookings', '/dashboard', '/audit'],
  wallet: ['/wallet', '/audit'],
  settings: ['/settings', '/audit'],
  inventory: ['/inventory', '/audit'],
  coupons: ['/coupons', '/audit'],
  offers: ['/offers', '/audit'],
  notifications: ['/notifications', '/audit'],
  partners: ['/partners', '/audit'],
  drivers: ['/drivers', '/audit'],
  tickets: ['/tickets', '/dashboard', '/audit'],
};

/**
 * A write under /api/admin. On success every admin query refreshes (lists, dashboard and
 * counters all depend on each other) and a toast confirms; failures toast the API's message.
 */
export function useAdminMutation<TBody = unknown, TResult = unknown>(
  method: Method,
  path: string | ((body: TBody) => string),
  { success, onSuccess }: { success?: string | ((r: TResult) => string); onSuccess?: (r: TResult) => void } = {},
) {
  const qc = useQueryClient();
  const { notify } = useNotifications();
  return useMutation({
    mutationFn: (body: TBody) => {
      const url = `/admin${typeof path === 'function' ? path(body) : path}`;
      if (method === 'delete') return apiDelete<TResult>(url);
      if (method === 'patch') return apiPatch<TResult>(url, body);
      if (method === 'put') return apiPut<TResult>(url, body);
      return apiPost<TResult>(url, body);
    },
    onSuccess: async (result, body) => {
      const first = (typeof path === 'function' ? path(body) : path).split('/').filter(Boolean)[0] ?? '';
      const affected = AFFECTS[first];
      // Refresh only the screens this change can affect; unknown changes refresh everything.
      await qc.invalidateQueries(
        affected
          ? { queryKey: adminKeys.all, predicate: (q) => affected.some((p) => String(q.queryKey[1] ?? '').startsWith(p)) }
          : { queryKey: adminKeys.all },
      );
      void qc.invalidateQueries({ queryKey: ['public-settings'] });
      if (success) notify(typeof success === 'function' ? success(result) : success, 'success');
      onSuccess?.(result);
    },
    onError: (error) => {
      const first = error instanceof ApiClientError ? error.details[0] : undefined;
      notify(first ? `${humanizePath(first.path)}: ${first.message}` : errorMessage(error), 'error');
    },
  });
}

// ───────── Users (kept for the existing users page API) ─────────

export interface AdminUserFilters {
  search: string;
  role: RoleName | '';
  status: UserStatus | '';
  page: number;
  limit: number;
}

export function useAdminUsers(filters: AdminUserFilters) {
  return useAdminGet<Paginated<AdminUserRow>>('/users', { ...filters });
}

export function useAdminSettings() {
  return useAdminGet<PlatformSettings>('/settings');
}

export { usePublicSettings } from '@/features/settings/publicSettings';
