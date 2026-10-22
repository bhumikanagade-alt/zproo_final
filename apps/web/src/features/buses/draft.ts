import type { BusPassengerInput } from '@zproo/validation';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { useBookingSession } from '@/features/checkout/bookingSession';
import type { Contact } from '@/features/flights/draft';

export interface BusSelection {
  tripId: string;
  /** Seat numbers with the price shown when chosen */
  seats: { number: string; pricePaise: number; ladiesOnly: boolean }[];
  boardingPointId: string;
  droppingPointId: string;
  /** Total shown when the seats were chosen; the API refuses the booking if it has moved. */
  expectedTotalPaise: number;
  /** Where "change seats" goes back to. */
  seatsUrl: string;
}

interface BusDraftState {
  selection: BusSelection | null;
  passengers: BusPassengerInput[] | null;
  contact: Contact | null;
  promoCode?: string;
  discountPaise?: number;
  /** Renewed whenever the selection or travellers change, so edits aren't mistaken for retries. */
  idempotencyKey: string;
  reference: string | null;
  start: (selection: BusSelection) => void;
  setTravellers: (passengers: BusPassengerInput[], contact: Contact) => void;
  applyPromo: (code: string, discountPaise: number) => void;
  clearPromo: () => void;
  acceptPrice: (totalPaise: number) => void;
  setReference: (reference: string) => void;
  clear: () => void;
}

const safeSessionStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.sessionStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.sessionStorage.setItem(name, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: (name) => {
    try {
      window.sessionStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

const newKey = () => crypto.randomUUID();

/** The bus being booked, kept per browser tab (sessionStorage). Holds no payment data. */
export const useBusDraft = create<BusDraftState>()(
  persist(
    (set) => ({
      selection: null,
      passengers: null,
      contact: null,
      promoCode: undefined,
      discountPaise: 0,
      idempotencyKey: newKey(),
      reference: null,
      start: (selection) => {
        // Choosing a different bus starts the booking timer again from the full time.
        useBookingSession.getState().begin(`bus:${selection.tripId}`);
        set((s) => ({
          selection,
          // Keep names already typed for seats that are still chosen.
          passengers:
            s.passengers?.filter((p) =>
              selection.seats.some((seat) => seat.number === p.seatNumber),
            ) ?? null,
          idempotencyKey: newKey(),
          promoCode: undefined,
          discountPaise: 0,
          reference: null,
        }));
      },
      setTravellers: (passengers, contact) =>
        set({ passengers, contact, idempotencyKey: newKey(), reference: null }),
      applyPromo: (promoCode, discountPaise) => set((s) => ({ promoCode, discountPaise, selection: s.selection ? { ...s.selection, expectedTotalPaise: Math.max(1, s.selection.seats.reduce((sum, seat) => sum + seat.pricePaise, 0) - discountPaise) } : s.selection, idempotencyKey: newKey(), reference: null })),
      clearPromo: () => set((s) => ({ promoCode: undefined, discountPaise: 0, selection: s.selection ? { ...s.selection, expectedTotalPaise: s.selection.seats.reduce((sum, seat) => sum + seat.pricePaise, 0) } : s.selection, idempotencyKey: newKey(), reference: null })),
      acceptPrice: (totalPaise) =>
        set((s) => ({
          selection: s.selection && { ...s.selection, expectedTotalPaise: totalPaise },
          idempotencyKey: newKey(),
        })),
      setReference: (reference) => set({ reference }),
      clear: () =>
        set({ selection: null, passengers: null, reference: null, idempotencyKey: newKey() }),
    }),
    {
      name: 'zproo-bus-draft',
      version: 1,
      storage: createJSONStorage(() => safeSessionStorage),
      partialize: ({ selection, passengers, contact, promoCode, discountPaise, idempotencyKey, reference }) => ({
        selection, passengers, contact, promoCode, discountPaise, idempotencyKey, reference,
      }),
    },
  ),
);
