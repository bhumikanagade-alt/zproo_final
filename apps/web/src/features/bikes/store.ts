import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { defaultDates, earliestPickup, parseLocal, toIsoDate, toTime } from './dates';
import type { BikeBooking, CustomerDetails, PaymentMethod, RentalSchedule } from './types';

const storage: StateStorage = {
  getItem: (k) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  removeItem: (k) => { try { window.localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

export const emptyCustomer: CustomerDetails = { fullName: '', mobile: '', email: '', licenceNumber: '', dateOfBirth: '', address: '', gender: 'MALE' };

export const initialSchedule = (): RentalSchedule => ({
  pickupCity: 'Pune',
  // The pickup / return areas are chosen on the rental details page, after the city.
  pickupLocationId: '',
  returnLocationId: '',
  ...defaultDates(),
});

interface BikeState {
  schedule: RentalSchedule;
  customer: CustomerDetails;
  extraIds: string[];
  notes: string;
  acceptedTerms: boolean;
  paymentMethod: PaymentMethod;
  /** A coupon from the admin panel and the whole rupees the server said it takes off this rental. */
  coupon: { code: string; discount: number } | null;
  bookings: BikeBooking[];
  patchSchedule: (p: Partial<RentalSchedule>) => void;
  patchCustomer: (p: Partial<CustomerDetails>) => void;
  toggleExtra: (id: string) => void;
  setNotes: (notes: string) => void;
  setAcceptedTerms: (accepted: boolean) => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  setCoupon: (coupon: { code: string; discount: number } | null) => void;
  /** Replaces a stale (past) persisted schedule with fresh defaults. */
  ensureFreshSchedule: () => void;
  saveBooking: (b: BikeBooking) => void;
  resetBookingDraft: () => void;
}

export const useBikeStore = create<BikeState>()(
  persist(
    (set, get) => ({
      schedule: initialSchedule(),
      customer: { ...emptyCustomer },
      extraIds: [],
      notes: '',
      acceptedTerms: false,
      paymentMethod: 'upi',
      coupon: null,
      bookings: [],
      patchSchedule: (p) =>
        set((s) => {
          const next = { ...s.schedule, ...p };
          // Moving pickup to/after the return date drags the return along (keeps the same length).
          if (('pickupDate' in p || 'pickupTime' in p) && !('returnDate' in p) && !('returnTime' in p)) {
            const oldStart = parseLocal(s.schedule.pickupDate, s.schedule.pickupTime);
            const oldEnd = parseLocal(s.schedule.returnDate, s.schedule.returnTime);
            const newStart = parseLocal(next.pickupDate, next.pickupTime);
            if (oldStart && oldEnd && newStart && newStart >= oldEnd) {
              const shifted = new Date(newStart.getTime() + (oldEnd.getTime() - oldStart.getTime()));
              next.returnDate = toIsoDate(shifted);
              next.returnTime = toTime(shifted);
            }
          }
          return { schedule: next };
        }),
      patchCustomer: (p) => set((s) => ({ customer: { ...s.customer, ...p } })),
      toggleExtra: (id) =>
        set((s) => ({ extraIds: s.extraIds.includes(id) ? s.extraIds.filter((x) => x !== id) : [...s.extraIds, id] })),
      setNotes: (notes) => set({ notes: notes.slice(0, 300) }),
      setAcceptedTerms: (acceptedTerms) => set({ acceptedTerms }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setCoupon: (coupon) => set({ coupon }),
      ensureFreshSchedule: () => {
        const { schedule } = get();
        const start = parseLocal(schedule.pickupDate, schedule.pickupTime);
        if (!start || start < earliestPickup()) set({ schedule: { ...schedule, ...defaultDates() } });
      },
      saveBooking: (b) => set((s) => ({ bookings: [b, ...s.bookings.filter((x) => x.reference !== b.reference)].slice(0, 20) })),
      resetBookingDraft: () => set({ customer: { ...emptyCustomer }, extraIds: [], notes: '', acceptedTerms: false, paymentMethod: 'upi', coupon: null }),
    }),
    {
      name: 'zproo-bikes-v1',
      version: 2,
      // v1 saved a hub id without a city; start the schedule fresh and keep past bookings.
      migrate: (persisted) => {
        const old = (persisted ?? {}) as { bookings?: BikeBooking[] };
        return { schedule: initialSchedule(), bookings: old.bookings ?? [] };
      },
      storage: createJSONStorage(() => storage),
      // Personal details are kept in memory only; just the schedule and past mock bookings persist.
      partialize: (s) => ({ schedule: s.schedule, bookings: s.bookings }),
    },
  ),
);
