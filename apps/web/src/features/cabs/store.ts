import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { generateReference } from './fare';
import { advanceStage, cancelBooking, createBooking, rateBooking, type CabDraft } from './bookingLogic';
import { PICKUP_POINTS, VEHICLES } from './data';
import { todayIso } from '@zproo/validation';
import type { CabBooking } from './types';

const storage: StateStorage = {
  getItem: (k) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  removeItem: (k) => { try { window.localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

export const emptyPassenger = { name: '', mobile: '', email: '', count: 1, instructions: '', pickupNotes: '' };

export const initialDraft = (): CabDraft => ({
  pickup: '',
  drop: '',
  mode: 'one-way',
  returnDate: '',
  returnTime: '',
  rentalHours: 4,
  airportDir: 'to',
  date: todayIso(),
  time: '',
  passengers: 1,
  request: '',
  vehicleId: null,
  pickupPoint: PICKUP_POINTS[0]!,
  passenger: { ...emptyPassenger },
  couponCode: null,
  couponDiscount: null,
  paymentMethod: 'upi',
  routeInfo: null,
});

interface CabState {
  draft: CabDraft;
  bookings: CabBooking[];
  patch: (p: Partial<CabDraft>) => void;
  /** Changing a location invalidates the chosen ride so fares are recalculated consistently. */
  setLocation: (key: 'pickup' | 'drop', value: string) => void;
  swap: () => void;
  /** Picks a ride type and sets the passenger count to suit that vehicle (e.g. bike taxi = 1). */
  selectVehicle: (id: import('./types').VehicleId | null) => void;
  resetDraft: () => void;
  /** A free booking reference, so a coupon use can be recorded against it before the booking is saved. */
  newReference: () => string;
  confirmBooking: (reference?: string) => CabBooking;
  cancel: (ref: string, reason: string, comment: string) => void;
  advance: (ref: string) => void;
  rate: (ref: string, stars: number, feedback: string) => void;
  bookAgain: (ref: string) => void;
}

const mapBooking = (list: CabBooking[], ref: string, fn: (b: CabBooking) => CabBooking) =>
  list.map((b) => (b.reference === ref ? fn(b) : b));

export const useCabStore = create<CabState>()(
  persist(
    (set, get) => ({
      draft: initialDraft(),
      bookings: [],
      patch: (p) => set((s) => ({ draft: { ...s.draft, ...p } })),
      setLocation: (key, value) => set((s) => ({ draft: { ...s.draft, [key]: value, vehicleId: null, couponCode: null, couponDiscount: null } })),
      swap: () => set((s) => ({ draft: { ...s.draft, pickup: s.draft.drop, drop: s.draft.pickup, vehicleId: null, couponCode: null, couponDiscount: null } })),
      selectVehicle: (id) => set((s) => {
        const v = id ? VEHICLES.find((x) => x.id === id) : undefined;
        if (!v) return { draft: { ...s.draft, vehicleId: null, couponCode: null, couponDiscount: null } };
        return { draft: { ...s.draft, vehicleId: v.id, couponCode: null, couponDiscount: null, passengers: v.seats, passenger: { ...s.draft.passenger, count: v.seats } } };
      }),
      resetDraft: () => set((s) => ({ draft: { ...initialDraft(), passenger: s.draft.passenger } })),
      newReference: () => generateReference(new Set(get().bookings.map((b) => b.reference))),
      confirmBooking: (reference) => {
        const { draft, bookings } = get();
        const booking = createBooking(draft, new Set(bookings.map((b) => b.reference)), Date.now(), undefined, reference);
        set({ bookings: [booking, ...bookings] });
        return booking;
      },
      cancel: (ref, reason, comment) => set((s) => ({ bookings: mapBooking(s.bookings, ref, (b) => cancelBooking(b, reason, comment)) })),
      advance: (ref) => set((s) => ({ bookings: mapBooking(s.bookings, ref, advanceStage) })),
      rate: (ref, stars, feedback) => set((s) => ({ bookings: mapBooking(s.bookings, ref, (b) => rateBooking(b, stars, feedback)) })),
      bookAgain: (ref) => {
        const b = get().bookings.find((x) => x.reference === ref);
        if (!b) return;
        set((s) => ({ draft: { ...initialDraft(), pickup: b.pickup, drop: b.mode === 'rental' ? b.pickup : b.drop, mode: b.mode, passenger: b.passenger, passengers: b.passenger.count, vehicleId: null, time: s.draft.time } }));
      },
    }),
    { name: 'zproo-cabs-demo', storage: createJSONStorage(() => storage), version: 1 },
  ),
);
