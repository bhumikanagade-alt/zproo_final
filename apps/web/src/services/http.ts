import type {
  ApiFailure,
  ApiSuccess,
  ErrorCode,
  FieldIssue,
} from '@zproo/types';

import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/lib/env';

export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT';

/**
 * Normalised error for every failed API call.
 * UI code never needs to inspect raw Axios errors.
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errorCode: ClientErrorCode,
    readonly details: FieldIssue[] = [],
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function isApiFailure(value: unknown): value is ApiFailure {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ApiFailure).success === false
  );
}

export function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (error instanceof AxiosError) {
    const body: unknown = error.response?.data;

    if (error.response && isApiFailure(body)) {
      return new ApiClientError(
        body.message,
        error.response.status,
        body.errorCode,
        body.details ?? [],
        body.requestId,
      );
    }

    if (
      error.code === AxiosError.ECONNABORTED ||
      error.code === AxiosError.ETIMEDOUT
    ) {
      return new ApiClientError(
        'The request timed out. Please try again.',
        0,
        'TIMEOUT',
      );
    }

    if (!error.response) {
      return new ApiClientError(
        'Unable to reach ZPROO GO. Check your connection.',
        0,
        'NETWORK_ERROR',
      );
    }

    return new ApiClientError(
      'Something went wrong',
      error.response.status,
      'INTERNAL_ERROR',
    );
  }

  return new ApiClientError(
    'Something went wrong',
    0,
    'INTERNAL_ERROR',
  );
}

/**
 * Axios client.
 *
 * When VITE_DATA_SOURCE=api:
 *   requests go to the real ZPROO GO API.
 *
 * Otherwise:
 *   requests are handled by the browser static adapter.
 */
export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: 20_000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },

  // The comparison is written out here (not read from `env`) so the bundler can remove the demo
  // engine, its demo accounts and the demo password hash from production builds entirely.
  ...(import.meta.env.VITE_DATA_SOURCE === 'static' && {
    adapter: async (config: InternalAxiosRequestConfig) =>
      (await import('@/static/server')).staticAdapter(config),
  }),
});

if (import.meta.env.DEV) {
  // Development only: shows which backend the app is talking to.
  console.info('[zproo] data source:', env.staticMode ? 'static (in-browser demo)' : env.apiUrl);
}

interface AuthBridge {
  getAccessToken: () => string | null;

  /**
   * Renews the session.
   * Resolves to the new access token, or null when signed out.
   */
  refresh: () => Promise<string | null>;
}

let auth: AuthBridge = {
  getAccessToken: () => null,
  refresh: async () => null,
};

/**
 * Registered by the auth feature at startup.
 * Keeps this module free of auth imports.
 */
export function configureAuth(bridge: AuthBridge): void {
  auth = bridge;
}

type RetriableConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
};

http.interceptors.request.use((config) => {
  const token = auth.getAccessToken();

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,

  async (error: unknown) => {
    const apiError = toApiClientError(error);

    const config =
      error instanceof AxiosError
        ? (error.config as RetriableConfig | undefined)
        : undefined;

    /**
     * Expired access token:
     * renew once and replay the request.
     *
     * Auth endpoints never retry.
     */
    if (
      apiError.status === 401 &&
      config &&
      !config._retried &&
      !config.url?.startsWith('/auth/')
    ) {
      config._retried = true;

      const token = await auth.refresh().catch(() => null);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return http.request(config);
      }
    }

    return Promise.reject(apiError);
  },
);

/**
 * GET returning the unwrapped `data`
 * from the API success envelope.
 */
export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await http.get<ApiSuccess<T>>(url, config);

  return res.data.data;
}

/**
 * POST returning the unwrapped `data`
 * from the API success envelope.
 */
export async function apiPost<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await http.post<ApiSuccess<T>>(
    url,
    body,
    config,
  );

  return res.data.data;
}
/** PATCH returning the unwrapped `data`. */
export async function apiPatch<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.patch<ApiSuccess<T>>(url, body, config);
  return res.data.data;
}

/** PUT returning the unwrapped `data`. */
export async function apiPut<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.put<ApiSuccess<T>>(url, body, config);
  return res.data.data;
}

/** DELETE returning the unwrapped `data`. */
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.delete<ApiSuccess<T>>(url, config);
  return res.data.data;
}
