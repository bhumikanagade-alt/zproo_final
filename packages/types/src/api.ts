/** Machine-readable error codes returned in the `errorCode` field of every error response. */
export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  PROVIDER_NOT_CONFIGURED: 'PROVIDER_NOT_CONFIGURED',
  OFFER_EXPIRED: 'OFFER_EXPIRED',
  PRICE_CHANGED: 'PRICE_CHANGED',
  SOLD_OUT: 'SOLD_OUT',
  SEAT_UNAVAILABLE: 'SEAT_UNAVAILABLE',
  BOOKING_EXPIRED: 'BOOKING_EXPIRED',
  INVALID_STATE: 'INVALID_STATE',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface FieldIssue {
  path: string;
  message: string;
}

export interface ApiFailure {
  success: false;
  message: string;
  errorCode: ErrorCode;
  data: null;
  /** Present on VALIDATION_ERROR only. */
  details?: FieldIssue[];
  /** Correlates the response with server logs. */
  requestId?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export type HealthStatus = 'ok' | 'degraded';
export type DependencyStatus = 'up' | 'down';

export interface HealthReport {
  status: HealthStatus;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: Record<string, { status: DependencyStatus; latencyMs: number; error?: string }>;
}
