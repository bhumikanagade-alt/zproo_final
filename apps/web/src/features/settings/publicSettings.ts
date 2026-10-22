import type { PublicSettings } from '@zproo/types';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/services/http';

/** Settings the website reads from the admin panel: announcement, maintenance, paused services. */
async function fetchPublicSettings(): Promise<PublicSettings> {
  if (import.meta.env.VITE_DATA_SOURCE === 'static') {
    // Read straight from this browser: the website never downloads the admin engine for this.
    return (await import('@/static/admin/public')).publicSettings();
  }
  return apiGet<PublicSettings>('/settings/public');
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ['public-settings'],
    queryFn: fetchPublicSettings,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
