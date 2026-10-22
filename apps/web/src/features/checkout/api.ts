import type { BookingDetails, BookingListItem, PaymentOrder } from '@zproo/types';
import { useQuery } from '@tanstack/react-query';
import { env } from '@/lib/env';
import { apiGet, apiPost, http } from '@/services/http';

export const bookingKeys = {
  booking: (reference: string) => ['bookings', reference] as const,
  bookings: ['bookings'] as const,
};

/** True while a confirmed booking is still waiting for its PNR(s) from the airline or operator. */
const awaitingTickets = (b: BookingDetails | undefined) =>
  // Trains: paid and waiting for the railway to confirm the reservation.
  b?.status === 'PROCESSING' ||
  (b?.status === 'CONFIRMED' && (b.flights.some((f) => !f.pnr) || (b.bus !== null && !b.bus.pnr)));

export function useBooking(reference: string | null, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: bookingKeys.booking(reference ?? ''),
    queryFn: () => apiGet<BookingDetails>(`/bookings/${reference}`),
    enabled: Boolean(reference),
    // Tickets are issued just after payment: poll (for about a minute) until every PNR is in.
    refetchInterval: (query) =>
      options.poll && awaitingTickets(query.state.data) && query.state.dataUpdateCount < 20
        ? 3_000
        : false,
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: bookingKeys.bookings,
    queryFn: () => apiGet<BookingListItem[]>('/bookings'),
    enabled: true,
  });
}

export const checkoutApi = {
  createPayment: (bookingReference: string) =>
    apiPost<PaymentOrder>('/payments/create', { bookingReference }),
  /** Development gateway only: stands in for the checkout popup of a real gateway. */
  completeMockPayment: (paymentId: string, outcome: 'success' | 'failure') =>
    apiPost<{ reference: string; status: 'SUCCESS' | 'FAILED' }>('/payments/mock/complete', {
      paymentId,
      outcome,
    }),
  verifyPayment: (body: {
    paymentId: string;
    providerPaymentId: string;
    signature: string;
    method?: string;
  }) => apiPost<{ reference: string }>('/payments/verify', body),
  failPayment: (paymentId: string, reason: string) =>
    apiPost<null>(`/payments/${paymentId}/fail`, { reason }),
  /**
   * Static (demo) mode has no PDF service: the printable e-ticket opens with the print dialog
   * ready ("Save as PDF"). API mode fetches the PDF with the access token (a plain link can't
   * send it) and saves it via a blob URL.
   */
  async downloadTicket(reference: string): Promise<void> {
    if (env.staticMode) {
      const url = `/tickets/${encodeURIComponent(reference)}?print=1`;
      const win = window.open(url, '_blank');
      if (win) win.opener = null;
      // Pop-up blocked: open the ticket in this tab instead of failing silently.
      else window.location.assign(url);
      return;
    }
    let blob: Blob;
    try {
      const res = await http.get<Blob>(`/bookings/${encodeURIComponent(reference)}/ticket.pdf`, {
        responseType: 'blob',
      });
      blob = res.data;
    } catch (error) {
      // With responseType "blob" the server's JSON error arrives as a Blob: read its message.
      const body = (error as { response?: { data?: unknown } }).response?.data;
      if (body instanceof Blob) {
        try {
          const parsed = JSON.parse(await body.text()) as { error?: { message?: string }; message?: string };
          const message = parsed.error?.message ?? parsed.message;
          if (message) throw new Error(message);
        } catch (inner) {
          if (inner instanceof Error && !(inner instanceof SyntaxError)) throw inner;
        }
      }
      throw new Error('We could not prepare your ticket. Please try again in a moment.');
    }
    if (blob.type && !blob.type.includes('pdf')) {
      throw new Error('We could not prepare your ticket. Please try again in a moment.');
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ZPROO-GO-${reference}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};
