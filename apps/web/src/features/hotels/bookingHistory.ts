import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '@/features/auth/store';
import type { ConfirmedBooking } from './booking';
import { addDays, diffNights } from './dates';
import { priceStay } from './pricing';
import { findHotel } from './data';
import { describeCancellation } from './cancellation';
import { localJson } from './localStorageAdapter';

export type StoredStatus = 'CONFIRMED' | 'CANCELLED';

export interface StoredBooking {
  booking: ConfirmedBooking;
  userId: string;
  status: StoredStatus;
  cancelledAt?: string;
  /** Paise returned on cancellation. */
  refundPaise?: number;
  /** Set when the dates were changed after booking. */
  modifiedAt?: string;
  /** Review written for this stay. */
  reviewed?: boolean;
}

interface HistoryState {
  items: StoredBooking[];
  add: (userId: string, booking: ConfirmedBooking) => void;
  cancel: (reference: string, refundPaise: number) => void;
  changeDates: (reference: string, checkIn: string, checkOut: string) => boolean;
  markReviewed: (reference: string) => void;
}

const MAX_ITEMS = 50;

export const useBookingHistory = create<HistoryState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (userId, booking) =>
        set((s) =>
          s.items.some((i) => i.booking.reference === booking.reference)
            ? s
            : { items: [{ booking, userId, status: 'CONFIRMED' as const }, ...s.items].slice(0, MAX_ITEMS) },
        ),
      cancel: (reference, refundPaise) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.booking.reference === reference
              ? { ...i, status: 'CANCELLED' as const, cancelledAt: new Date().toISOString(), refundPaise }
              : i,
          ),
        })),
      changeDates: (reference, checkIn, checkOut) => {
        const found = get().items.find((i) => i.booking.reference === reference);
        if (!found || found.status !== 'CONFIRMED') return false;
        const nights = Math.max(1, diffNights(checkIn, checkOut));
        const hotel = findHotel(found.booking.hotelId);
        const room = hotel?.rooms.find((r) => r.name === found.booking.roomName);
        // Re-price at the room's current rate; without a catalogue match keep the per-night price.
        const price = room
          ? priceStay(room, nights, found.booking.rooms, null)
          : priceStay(
              { pricePerNightPaise: found.booking.price.perNightPaise },
              nights,
              found.booking.rooms,
              null,
            );
        // The cancellation deadlines move with the check-in date.
        const rules = room
          ? describeCancellation(room.cancellation, checkIn, found.booking.checkInTime)
          : null;
        set((s) => ({
          items: s.items.map((i) =>
            i.booking.reference === reference
              ? {
                  ...i,
                  modifiedAt: new Date().toISOString(),
                  booking: {
                    ...i.booking,
                    checkIn,
                    checkOut,
                    nights,
                    price,
                    ...(rules ? { cancellationHeadline: rules.headline, cancellationRules: rules.rules } : {}),
                  },
                }
              : i,
          ),
        }));
        return true;
      },
      markReviewed: (reference) =>
        set((s) => ({ items: s.items.map((i) => (i.booking.reference === reference ? { ...i, reviewed: true } : i)) })),
    }),
    { name: 'zproo-hotel-bookings', storage: localJson() },
  ),
);

/** Bookings that belong to the signed-in user, newest first. */
export function useMyHotelBookings(): StoredBooking[] {
  const user = useAuthStore((s) => s.user);
  const items = useBookingHistory((s) => s.items);
  if (!user) return [];
  return items.filter((i) => i.userId === String(user.id));
}

export type BookingTab = 'upcoming' | 'past' | 'cancelled';

/** A confirmed stay is "past" once check-out day has ended. */
export function tabOfBooking(item: StoredBooking, today: string = new Date().toISOString().slice(0, 10)): BookingTab {
  if (item.status === 'CANCELLED') return 'cancelled';
  return item.booking.checkOut < today ? 'past' : 'upcoming';
}

/** First date a stay can be moved to (tomorrow). */
export const earliestChangeDate = (today: string) => addDays(today, 1);
