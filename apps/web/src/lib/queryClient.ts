import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from '@/services/http';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        // Retry transient failures only; 4xx responses will not succeed on retry.
        retry: (failureCount, error) =>
          failureCount < 2 &&
          !(error instanceof ApiClientError && error.status >= 400 && error.status < 500),
      },
      mutations: { retry: false },
    },
  });
}
