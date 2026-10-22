import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { SLOTS, type ServiceKey } from './data';
import {
  advance, cancelParcel, computeCharges, createBooking, emptyDetails, fetchQuote, markRateServiceRecovered,
  rateParcel, SEED_BOOKINGS, type ParcelBooking, type ParcelCoupon, type ParcelDetails, type ParcelRoute, type PickupSlot, type Quote,
} from './logic';

const storage: StateStorage = {
  getItem: (k) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  removeItem: (k) => { try { window.localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

export interface SavedAddress { n: string; m: string; a: string; p: string; c: string }

interface ParcelState {
  route: ParcelRoute;
  details: ParcelDetails;
  svc: ServiceKey;
  pm: string;
  /** Coupon from the admin panel that the server accepted (amount in rupees). Not persisted. */
  coupon: ParcelCoupon | null;
  slot: PickupSlot;
  /** [SMS, WhatsApp] */
  notify: number[];
  bookings: ParcelBooking[];
  addressBook: SavedAddress[];

  setRoute: (p: Partial<ParcelRoute>) => void;
  swapRoute: () => void;
  patchDetails: (p: Partial<ParcelDetails>) => void;
  setSvc: (s: ServiceKey) => void;
  setPm: (m: string) => void;
  setCoupon: (c: ParcelCoupon | null) => void;
  setSlot: (s: Partial<PickupSlot>) => void;
  setNotify: (i: number, on: boolean) => void;
  saveAddress: (side: 's' | 'r') => void;
  /** Starts a fresh booking from the home form (clears the coupon and the previous quote). */
  begin: () => void;
  /** Creates the booking from the current draft (with the ID the coupon use was recorded against, if any). Returns null if the rates have not loaded. */
  confirm: (bookingId?: string) => ParcelBooking | null;
  cancel: (id: string, reason: string) => ParcelBooking | undefined;
  advanceStatus: (id: string) => void;
  rate: (id: string, stars: number, feedback: string) => void;
  bookAgain: (id: string) => boolean;
}

const map = (list: ParcelBooking[], id: string, fn: (b: ParcelBooking) => ParcelBooking) => list.map((b) => (b.id === id ? fn(b) : b));

export const useParcelStore = create<ParcelState>()(
  persist(
    (set, get) => ({
      route: { from: 'Pune', to: 'Mumbai', w: '2.5' },
      details: emptyDetails(),
      svc: 'Standard',
      pm: 'UPI',
      coupon: null,
      slot: { d: '', t: SLOTS[0] },
      notify: [1, 1],
      bookings: SEED_BOOKINGS,
      addressBook: [],

      setRoute: (p) => set((s) => ({ route: { ...s.route, ...p } })),
      swapRoute: () => set((s) => ({ route: { ...s.route, from: s.route.to, to: s.route.from } })),
      patchDetails: (p) => set((s) => ({ details: { ...s.details, ...p } })),
      setSvc: (svc) => set({ svc }),
      setPm: (pm) => set({ pm }),
      setCoupon: (coupon) => set({ coupon }),
      setSlot: (p) => set((s) => ({ slot: { ...s.slot, ...p } })),
      setNotify: (i, on) => set((s) => ({ notify: s.notify.map((v, j) => (j === i ? (on ? 1 : 0) : v)) })),
      saveAddress: (side) => {
        const { details: p, route, addressBook } = get();
        const a: SavedAddress = side === 's'
          ? { n: p.sn, m: p.sm, a: p.sa, p: p.sp, c: route.from }
          : { n: p.rn, m: p.rm, a: p.ra, p: p.rp, c: route.to };
        set({ addressBook: [a, ...addressBook.filter((x) => !(x.m === a.m && x.p === a.p))].slice(0, 6) });
      },
      begin: () => { set({ coupon: null }); useParcelQuote.getState().reset(); },
      confirm: (bookingId) => {
        const s = get();
        const quote = useParcelQuote.getState().data;
        const charges = computeCharges(quote, s.svc, s.details, s.coupon);
        if (!charges) return null;
        const booking = createBooking({
          route: s.route, p: s.details, charges, slot: s.slot, notify: s.notify, pm: s.pm,
          existingIds: new Set(s.bookings.map((b) => b.id)), id: bookingId,
        });
        // The quote is cleared by the confirmation page (clearing it here would bounce the payment page).
        set({ bookings: [booking, ...s.bookings], coupon: null });
        return booking;
      },
      cancel: (id, reason) => {
        const b = get().bookings.find((x) => x.id === id);
        if (!b) return undefined;
        set((s) => ({ bookings: map(s.bookings, id, (x) => cancelParcel(x, reason)) }));
        return b;
      },
      advanceStatus: (id) => set((s) => ({ bookings: map(s.bookings, id, advance) })),
      rate: (id, stars, fb) => set((s) => ({ bookings: map(s.bookings, id, (x) => rateParcel(x, stars, fb)) })),
      bookAgain: (id) => {
        const b = get().bookings.find((x) => x.id === id);
        if (!b?.snap) return false;
        set({ route: { ...b.snap.f }, details: JSON.parse(JSON.stringify(b.snap.p)) as ParcelDetails, coupon: null });
        useParcelQuote.getState().reset();
        return true;
      },
    }),
    {
      name: 'zproo-parcels-demo',
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({
        route: s.route, details: s.details, svc: s.svc, pm: s.pm, slot: s.slot, notify: s.notify,
        bookings: s.bookings, addressBook: s.addressBook,
      }),
    },
  ),
);

// ───────────────────────────── Quote (not persisted) ─────────────────────────────

interface QuoteState {
  status: 'idle' | 'loading' | 'ok' | 'err';
  data: Quote | null;
  error: string;
  reset: () => void;
  /** Fetch now. Newer calls win over older ones, so rapid edits never show stale rates. */
  load: () => Promise<void>;
  /** Debounced refresh used while the customer edits weight and size. */
  refresh: () => void;
  retry: () => void;
}

let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

export const useParcelQuote = create<QuoteState>()((set, get) => ({
  status: 'idle',
  data: null,
  error: '',
  reset: () => { clearTimeout(timer); seq++; set({ status: 'idle', data: null, error: '' }); },
  load: async () => {
    const my = ++seq;
    set({ status: 'loading' });
    const { route, details } = useParcelStore.getState();
    try {
      const data = await fetchQuote(route, details);
      if (my === seq) set({ status: 'ok', data, error: '' });
    } catch (e) {
      if (my === seq) set({ status: 'err', error: e instanceof Error ? e.message : 'Rate service unavailable' });
    }
  },
  refresh: () => {
    clearTimeout(timer);
    seq++;
    set({ status: 'loading' });
    timer = setTimeout(() => void get().load(), 350);
  },
  retry: () => { markRateServiceRecovered(); void get().load(); },
}));
