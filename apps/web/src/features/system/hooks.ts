import type { HealthReport } from '@zproo/types';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/services/http';

export const systemKeys = {
  health: ['system', 'health'] as const,
};

export function useApiHealth(enabled = true) {
  return useQuery({
    queryKey: systemKeys.health,
    queryFn: () => apiGet<HealthReport>('/health'),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}
