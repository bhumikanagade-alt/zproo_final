import { ApiClientError } from '@/services/http';

/** User-facing message for a failed request. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return 'Something went wrong. Please try again.';
}
