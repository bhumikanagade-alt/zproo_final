import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { bikesApi } from './api';
import type { BikeFilters, BookingRequest } from './types';

export const bikeKeys = {
  list: (f: BikeFilters) => ['bikes', 'list', f] as const,
  detail: (id: string) => ['bikes', 'detail', id] as const,
  locations: () => ['bikes', 'locations'] as const,
  reviews: (id: string) => ['bikes', 'reviews', id] as const,
};

export function useBikes(filters: BikeFilters) {
  return useQuery({
    queryKey: bikeKeys.list(filters),
    queryFn: () => bikesApi.listBikes(filters),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useBike(id: string | undefined) {
  return useQuery({
    queryKey: bikeKeys.detail(id ?? ''),
    queryFn: () => bikesApi.getBike(id ?? ''),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: bikeKeys.locations(),
    queryFn: () => bikesApi.listLocations(),
    staleTime: Infinity,
    retry: false,
  });
}

export function useReviews(bikeId: string | undefined) {
  return useQuery({
    queryKey: bikeKeys.reviews(bikeId ?? ''),
    queryFn: () => bikesApi.listReviews(bikeId ?? ''),
    enabled: Boolean(bikeId),
    retry: false,
  });
}

/** Whole fleet, unfiltered: powers the landing page (popular bikes, category tiles). */
export function useAllBikes() {
  return useQuery({
    queryKey: ['bikes', 'all'] as const,
    queryFn: () => bikesApi.listBikes({ query: '', categories: [], transmission: 'any', maxDailyPrice: 100_000, onlyAvailable: false, sort: 'rating' }),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Submits the mock booking. Swap `bikesApi.createBooking` for the real endpoint later; nothing here changes. */
export function useCreateBooking() {
  return useMutation({ mutationFn: (req: BookingRequest) => bikesApi.createBooking(req) });
}
