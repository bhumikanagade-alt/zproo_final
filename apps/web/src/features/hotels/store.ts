import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { Hotel, HotelRoom } from './data';
import type { ConfirmedBooking } from './booking';
import { generateReference } from './booking';
import { normaliseChildAges } from './occupancy';
import type { PaymentMethod } from './validation';

export interface HotelGuest {
  firstName: string;
  lastName: string;
  age: number;
  type: 'ADULT' | 'CHILD';
  gender?: string;
}

export interface HotelContact {
  email: string;
  phone: string;
  name?: string;
  country?: string;
}

export interface HotelSearchValue {
  city: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  childAges?: number[];
}

export interface HotelBookingState {
  hotel: Hotel | null;
  room: HotelRoom | null;
  city: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  childAges: number[];
  guests: HotelGuest[];
  contact: HotelContact | null;
  specialRequests: string[];
  specialNote: string;
  coupon: string | null;
  /** What the server worked out for an admin coupon; null for the built-in codes. */
  couponDiscountPaise: number | null;
  paymentMethod: PaymentMethod;
  reference: string | null;
  booking: ConfirmedBooking | null;
  setSearch: (value: HotelSearchValue) => void;
  selectRoom: (hotel: Hotel, room: HotelRoom) => void;
  setGuests: (guests: HotelGuest[], contact: HotelContact) => void;
  setSpecialRequests: (ids: string[], note: string) => void;
  setCoupon: (coupon: string | null, discountPaise?: number | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  /** Creates a reference (kept for backwards compatibility with older callers). */
  confirm: () => string;
  /** Stores the finished booking so the confirmation page can show it after a reload. */
  complete: (booking: ConfirmedBooking) => void;
  clear: () => void;
}

const storage: StateStorage = {
  getItem: (key) => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      /* storage unavailable: the flow still works in memory */
    }
  },
  removeItem: (key) => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

const EMPTY = {
  hotel: null,
  room: null,
  city: '',
  checkIn: '',
  checkOut: '',
  rooms: 1,
  adults: 2,
  children: 0,
  childAges: [] as number[],
  guests: [] as HotelGuest[],
  contact: null,
  specialRequests: [] as string[],
  specialNote: '',
  coupon: null,
  couponDiscountPaise: null,
  paymentMethod: 'upi' as PaymentMethod,
  reference: null,
  booking: null,
};

export const useHotelBooking = create<HotelBookingState>()(
  persist(
    (set) => ({
      ...EMPTY,
      setSearch: (value) =>
        set({
          city: value.city,
          checkIn: value.checkIn,
          checkOut: value.checkOut,
          rooms: value.rooms,
          adults: value.adults,
          children: value.children,
          childAges: normaliseChildAges(value.childAges ?? [], value.children),
        }),
      // A different room means the old guest list / coupon / requests no longer apply.
      selectRoom: (hotel, room) =>
        set((s) =>
          s.hotel?.id === hotel.id && s.room?.id === room.id
            ? { hotel, room }
            : { hotel, room, guests: [], contact: s.contact, coupon: null, couponDiscountPaise: null, reference: null, booking: null },
        ),
      setGuests: (guests, contact) => set({ guests, contact }),
      setSpecialRequests: (specialRequests, specialNote) => set({ specialRequests, specialNote }),
      setCoupon: (coupon, discountPaise = null) => set({ coupon, couponDiscountPaise: coupon ? discountPaise : null }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      confirm: () => {
        const reference = generateReference();
        set({ reference });
        return reference;
      },
      complete: (booking) => set({ booking, reference: booking.reference }),
      clear: () => set({ ...EMPTY }),
    }),
    { name: 'zproo-hotel-booking', storage: createJSONStorage(() => storage) },
  ),
);
