import type { BookingDetails, BusCancellationQuote, BusSearchResult, BusSeatMap, BusTripOffer } from '@zproo/types';
import type { BookBusInput, BusSearch } from '@zproo/validation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/services/http';

export const busKeys = {
  search: (s: BusSearch) => ['buses', 'search', s] as const,
  trip: (id: string) => ['buses', 'trip', id] as const,
  seats: (id: string) => ['buses', 'seats', id] as const,
};

export function useBusSearch(search: BusSearch | null) {
  return useQuery({
    queryKey: search ? busKeys.search(search) : ['buses', 'search', null],
    queryFn: () => apiGet<BusSearchResult>('/buses/search', { params: search }),
    enabled: search !== null,
    staleTime: 60_000,
  });
}

export function useBusTrip(tripId: string | undefined) {
  return useQuery({
    queryKey: busKeys.trip(tripId ?? ''),
    queryFn: () => apiGet<BusTripOffer>(`/buses/${encodeURIComponent(tripId ?? '')}`),
    enabled: Boolean(tripId),
    staleTime: 30_000,
  });
}

/** Live seat availability; refreshed every 20 seconds while the seat map is open. */
export function useSeatMap(tripId: string | undefined) {
  return useQuery({
    queryKey: busKeys.seats(tripId ?? ''),
    queryFn: () => apiGet<BusSeatMap>(`/buses/${encodeURIComponent(tripId ?? '')}/seats`),
    enabled: Boolean(tripId),
    refetchInterval: 20_000,
  });
}

export const busesApi = {
  abandonment: (input: { tripId: string; travelDate?: string; seats?: string[]; contactEmail?: string }) => apiPost<{ captured: boolean; provider: string; developmentOnly?: boolean }>('/booking-abandonment', input),
  book: (input: BookBusInput, idempotencyKey: string) =>
    apiPost<BookingDetails>('/buses/book', input, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  cancellationQuote: (reference: string) =>
    apiPost<BusCancellationQuote>(`/buses/bookings/${encodeURIComponent(reference)}/cancellation-quote`, {}),
  cancel: (reference: string, reason: string | undefined, idempotencyKey: string) =>
    apiPost<BookingDetails>(
      `/buses/bookings/${encodeURIComponent(reference)}/cancel`,
      reason ? { reason } : {},
      { headers: { 'Idempotency-Key': idempotencyKey } },
    ),
};
