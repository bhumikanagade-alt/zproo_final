import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBusDraft } from '@/features/buses/draft';
import { useFlightDraft } from '@/features/flights/draft';
import { useBookingSession } from './bookingSession';

const FULL = 15 * 60_000;

describe('booking timer restarts for a new bus or flight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T10:00:00Z'));
    useBookingSession.getState().clear();
  });
  afterEach(() => vi.useRealTimers());

  it('keeps the running timer for the same choice but restarts for a different one', () => {
    const session = useBookingSession;
    session.getState().begin('bus:trip-a');
    const first = session.getState().expiresAt;
    expect(first).toBe(Date.now() + FULL);

    vi.advanceTimersByTime(10 * 60_000);
    session.getState().begin('bus:trip-a');
    expect(session.getState().expiresAt).toBe(first);

    session.getState().begin('bus:trip-b');
    expect(session.getState().expiresAt).toBe(Date.now() + FULL);
  });

  it('restarts after the old timer expired', () => {
    useBookingSession.getState().begin('bus:trip-a');
    vi.advanceTimersByTime(FULL + 1000);
    useBookingSession.getState().begin('bus:trip-a');
    expect(useBookingSession.getState().expiresAt).toBe(Date.now() + FULL);
  });

  it('starts from the full time when a different flight is chosen', () => {
    const itinerary = (id: string) => ({
      offerIds: [id],
      pax: { adults: 1, children: 0, infants: 0 },
      expectedTotalPaise: 100_000,
      searchUrl: '/flights/results',
    });
    useFlightDraft.getState().start(itinerary('offer-one'));
    vi.advanceTimersByTime(8 * 60_000);
    useFlightDraft.getState().start(itinerary('offer-one'));
    expect(useBookingSession.getState().expiresAt).toBe(Date.now() + FULL - 8 * 60_000);

    useFlightDraft.getState().start(itinerary('offer-two'));
    expect(useBookingSession.getState().expiresAt).toBe(Date.now() + FULL);
  });

  it('starts from the full time when a different bus is chosen', () => {
    const selection = (tripId: string) => ({
      tripId,
      seats: [{ number: 'L1', pricePaise: 50_000, ladiesOnly: false }],
      boardingPointId: 'b1',
      droppingPointId: 'd1',
      expectedTotalPaise: 50_000,
      seatsUrl: '/buses/seats',
    });
    useBusDraft.getState().start(selection('trip-a'));
    vi.advanceTimersByTime(5 * 60_000);
    useBusDraft.getState().start(selection('trip-b'));
    expect(useBookingSession.getState().expiresAt).toBe(Date.now() + FULL);
  });

  it('a flight timer does not carry over to a bus', () => {
    useFlightDraft.getState().start({
      offerIds: ['offer-one'],
      pax: { adults: 1, children: 0, infants: 0 },
      expectedTotalPaise: 100_000,
      searchUrl: '/flights/results',
    });
    vi.advanceTimersByTime(9 * 60_000);
    useBookingSession.getState().begin('bus:trip-a');
    expect(useBookingSession.getState().expiresAt).toBe(Date.now() + FULL);
  });
});
