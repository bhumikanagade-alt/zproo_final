import type {
  BookingDetails,
  TrainCancellationQuote,
  TrainCapabilities,
  TrainLiveStatus,
  TrainOffer,
  TrainQuota,
  TrainQuote,
  TrainSearchResult,
} from '@zproo/types';
import type { BookTrainInput, TrainQuoteInput, TrainSearch } from '@zproo/validation';
import { useQuery } from '@tanstack/react-query';
import { bookingKeys } from '@/features/checkout/api';
import { apiGet, apiPost } from '@/services/http';

export const trainKeys = {
  capabilities: ['trains', 'capabilities'] as const,
  search: (s: TrainSearch) => ['trains', 'search', s] as const,
  offer: (id: string, quota: TrainQuota) => ['trains', 'offer', id, quota] as const,
  quote: (q: TrainQuoteInput) => ['trains', 'quote', q] as const,
  live: (train: string, date: string) => ['trains', 'live', train, date] as const,
};

/** What the configured railway provider supports; the UI offers only these options. */
export function useTrainCapabilities() {
  return useQuery({
    queryKey: trainKeys.capabilities,
    queryFn: () => apiGet<TrainCapabilities>('/trains/capabilities'),
    staleTime: 10 * 60_000,
    enabled: true,
  });
}

export function useTrainSearch(search: TrainSearch | null) {
  return useQuery({
    queryKey: search ? trainKeys.search(search) : ['trains', 'search', null],
    queryFn: () =>
      apiGet<TrainSearchResult>('/trains/search', {
        params: search && {
          from: search.from,
          to: search.to,
          date: search.date,
          class: search.travelClass === 'ALL' ? undefined : search.travelClass,
          quota: search.quota,
          passengers: search.passengers,
        },
      }),
    enabled: search !== null,
    staleTime: 60_000,
  });
}

/** Live availability and fares for one train (never cached by the API). */
export function useTrainOffer(offerId: string | undefined, quota: TrainQuota) {
  return useQuery({
    queryKey: trainKeys.offer(offerId ?? '', quota),
    queryFn: () =>
      apiGet<TrainOffer>(`/trains/offers/${encodeURIComponent(offerId ?? '')}`, {
        params: { quota },
      }),
    enabled: Boolean(offerId),
    staleTime: 0,
  });
}

/** Server-calculated fare and availability for the chosen class and passengers. */
export function useTrainQuote(input: TrainQuoteInput | null) {
  return useQuery({
    queryKey: input ? trainKeys.quote(input) : ['trains', 'quote', null],
    queryFn: () => apiPost<TrainQuote>('/trains/quote', input),
    enabled: input !== null,
    staleTime: 0,
    retry: false,
  });
}

export function useLiveStatus(trainNumber: string | null, date: string) {
  return useQuery({
    queryKey: trainKeys.live(trainNumber ?? '', date),
    queryFn: () =>
      apiGet<TrainLiveStatus>(`/trains/${encodeURIComponent(trainNumber ?? '')}/live-status`, {
        params: { date },
      }),
    enabled: Boolean(trainNumber),
    retry: false,
  });
}

export { bookingKeys };

export const trainsApi = {
  book: (input: BookTrainInput, idempotencyKey: string) =>
    apiPost<BookingDetails>('/trains/book', input, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  refresh: (reference: string) =>
    apiPost<BookingDetails>(`/trains/bookings/${encodeURIComponent(reference)}/refresh`),
  cancellationQuote: (reference: string, passengerIds: string[]) =>
    apiPost<TrainCancellationQuote>(
      `/trains/bookings/${encodeURIComponent(reference)}/cancellation-quote`,
      {
        passengerIds,
      },
    ),
  cancel: (reference: string, passengerIds: string[], idempotencyKey: string) =>
    apiPost<BookingDetails>(
      `/trains/bookings/${encodeURIComponent(reference)}/cancel`,
      { passengerIds },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    ),
};
