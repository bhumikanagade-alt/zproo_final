import type { PassengerInput } from '@zproo/validation';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { FlightAddOnsSelection, PaxCounts } from '@zproo/types';
import { addOnKey, EMPTY_ADD_ONS } from '@zproo/utils';
import { useBookingSession } from '@/features/checkout/bookingSession';

export interface Itinerary {
  offerIds: string[];
  pax: PaxCounts;
  /** Total shown when the flights were chosen; the API refuses the booking if it has moved. */
  expectedTotalPaise: number;
  /** Where "change flight" goes back to. */
  searchUrl: string;
}

export interface Contact {
  email: string;
  phone: string;
}

interface FlightDraftState {
  itinerary: Itinerary | null;
  passengers: PassengerInput[] | null;
  contact: Contact | null;
  /** Seats, meals and extra baggage chosen after traveller details. */
  addOns: FlightAddOnsSelection;
  /**
   * Sent with the booking request so a retry can't hold seats twice. Renewed whenever the
   * itinerary or travellers change, so an edited booking isn't mistaken for a retry.
   */
  idempotencyKey: string;
  /** The booking created from this draft, once there is one. */
  reference: string | null;
  /** A coupon from the admin panel (Marketing → Coupons) and the amount the server worked out for this fare. */
  promoCode: string | null;
  promoDiscountPaise: number | null;
  start: (itinerary: Itinerary) => void;
  setTravellers: (passengers: PassengerInput[], contact: Contact) => void;
  acceptPrice: (totalPaise: number) => void;
  setReference: (reference: string) => void;
  /** Apply (or, with `null`, remove) a coupon. The booking is made again so it carries the right total. */
  setPromo: (code: string | null, discountPaise?: number | null) => void;
  /** Pass `null` to remove the choice. `sector` is `"<leg>.<segment>"`. */
  setSeat: (sector: string, passenger: number, seat: string | null) => void;
  setMeal: (sector: string, passenger: number, mealId: string | null) => void;
  /** `leg` is the journey leg index (baggage is bought per leg, not per flight). */
  setBaggage: (leg: number, passenger: number, baggageId: string | null) => void;
  clear: () => void;
}

type AddOnGroup = keyof FlightAddOnsSelection;

/** Sets or removes one entry, renewing the idempotency key so an edited booking isn't a retry. */
function withAddOn(
  s: FlightDraftState,
  group: AddOnGroup,
  key: string,
  value: string | null,
): Partial<FlightDraftState> {
  const next = { ...(s.addOns ?? EMPTY_ADD_ONS)[group] };
  if (value === null) delete next[key];
  else next[key] = value;
  return {
    addOns: { ...(s.addOns ?? EMPTY_ADD_ONS), [group]: next },
    idempotencyKey: newKey(),
    reference: null,
  };
}

/** sessionStorage can throw (blocked storage); the draft then lasts until reload. */
export const safeSessionStorage: StateStorage = {
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

/**
 * The flight being booked, kept per browser tab (sessionStorage) so a reload mid-checkout
 * doesn't lose it. Holds no payment data.
 */
export const useFlightDraft = create<FlightDraftState>()(
  persist(
    (set) => ({
      itinerary: null,
      passengers: null,
      contact: null,
      addOns: EMPTY_ADD_ONS,
      idempotencyKey: newKey(),
      reference: null,
      promoCode: null,
      promoDiscountPaise: null,
      start: (itinerary) => {
        // Choosing a different flight starts the booking timer again from the full time.
        useBookingSession.getState().begin(`flight:${itinerary.offerIds.join(',')}`);
        set((s) => ({
          itinerary,
          // Travellers carry over to a new flight choice when the passenger mix is the same.
          passengers:
            s.itinerary &&
            s.itinerary.pax.adults === itinerary.pax.adults &&
            s.itinerary.pax.children === itinerary.pax.children &&
            s.itinerary.pax.infants === itinerary.pax.infants
              ? s.passengers
              : null,
          // A different flight has different seat maps, so earlier extras no longer apply.
          addOns: EMPTY_ADD_ONS,
          idempotencyKey: newKey(),
          reference: null,
          // A different flight has a different fare, so the coupon is chosen again.
          ...(s.itinerary?.offerIds.join(',') === itinerary.offerIds.join(',')
            ? {}
            : { promoCode: null, promoDiscountPaise: null }),
        }));
      },
      setTravellers: (passengers, contact) =>
        set({ passengers, contact, idempotencyKey: newKey(), reference: null }),
      acceptPrice: (totalPaise) =>
        set((s) => ({
          itinerary: s.itinerary && { ...s.itinerary, expectedTotalPaise: totalPaise },
          idempotencyKey: newKey(),
        })),
      setReference: (reference) => set({ reference }),
      setPromo: (promoCode, discountPaise = null) =>
        set({
          promoCode,
          promoDiscountPaise: promoCode ? discountPaise : null,
          idempotencyKey: newKey(),
          reference: null,
        }),
      setSeat: (sector, passenger, seat) =>
        set((s) => withAddOn(s, 'seats', addOnKey(sector, passenger), seat)),
      setMeal: (sector, passenger, mealId) =>
        set((s) => withAddOn(s, 'meals', addOnKey(sector, passenger), mealId)),
      setBaggage: (leg, passenger, baggageId) =>
        set((s) => withAddOn(s, 'baggage', addOnKey(leg, passenger), baggageId)),
      clear: () =>
        set({
          itinerary: null,
          passengers: null,
          addOns: EMPTY_ADD_ONS,
          reference: null,
          promoCode: null,
          promoDiscountPaise: null,
          idempotencyKey: newKey(),
        }),
    }),
    {
      name: 'zproo-flight-draft',
      version: 1,
      storage: createJSONStorage(() => safeSessionStorage),
      partialize: ({
        itinerary,
        passengers,
        contact,
        addOns,
        idempotencyKey,
        reference,
        promoCode,
        promoDiscountPaise,
      }) => ({
        itinerary,
        passengers,
        contact,
        addOns,
        idempotencyKey,
        reference,
        promoCode,
        promoDiscountPaise,
      }),
    },
  ),
);
