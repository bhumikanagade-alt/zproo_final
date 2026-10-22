import type { TrainClass, TrainOffer, TrainQuota } from '@zproo/types';
import type { TrainPassengerInput } from '@zproo/validation';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { useBookingSession } from '@/features/checkout/bookingSession';

export interface TrainSelection {
  offerId: string;
  travelClass: TrainClass;
  quota: TrainQuota;
  /** Snapshot shown on later steps; the API re-checks everything live before booking. */
  train: TrainOffer;
  /** Passengers asked for in the search (the form can still change the number). */
  passengers: number;
  /** Where "change train" goes back to. */
  resultsUrl: string;
}

export interface TrainContact {
  email: string;
  phone: string;
}

interface TrainDraftState {
  selection: TrainSelection | null;
  passengers: TrainPassengerInput[] | null;
  contact: TrainContact | null;
  confirmOnly: boolean;
  /** Renewed whenever the selection or passengers change, so edits aren't mistaken for retries. */
  idempotencyKey: string;
  reference: string | null;
  /** A coupon from the admin panel (Marketing → Coupons) and the amount the server worked out for this fare. */
  promoCode: string | null;
  promoDiscountPaise: number | null;
  start: (selection: TrainSelection) => void;
  setPassengers: (
    passengers: TrainPassengerInput[],
    contact: TrainContact,
    confirmOnly: boolean,
  ) => void;
  setPromo: (code: string | null, discountPaise?: number | null) => void;
  renewKey: () => void;
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

/**
 * The train being booked, kept per browser tab (sessionStorage) so back/forward and reloads keep
 * it. Holds no payment data, and no identity documents (none are collected).
 */
export const useTrainDraft = create<TrainDraftState>()(
  persist(
    (set) => ({
      selection: null,
      passengers: null,
      contact: null,
      confirmOnly: false,
      idempotencyKey: newKey(),
      reference: null,
      promoCode: null,
      promoDiscountPaise: null,
      start: (selection) => {
        useBookingSession
          .getState()
          .begin(`train:${selection.offerId}:${selection.travelClass}:${selection.quota}`);
        set((s) => {
          const same =
            s.selection?.offerId === selection.offerId &&
            s.selection.travelClass === selection.travelClass;
          return {
            selection,
            // Keep passengers already typed when re-selecting the same train and class.
            passengers: same
              ? s.passengers
              : (s.passengers?.map((p) => ({ ...p, berthPreference: 'NO_PREFERENCE' as const })) ??
                null),
            idempotencyKey: newKey(),
            reference: null,
            // A different train or class has a different fare, so the coupon is chosen again.
            ...(same ? {} : { promoCode: null, promoDiscountPaise: null }),
          };
        });
      },
      setPassengers: (passengers, contact, confirmOnly) =>
        set({ passengers, contact, confirmOnly, idempotencyKey: newKey(), reference: null }),
      setPromo: (promoCode, discountPaise = null) =>
        set({ promoCode, promoDiscountPaise: promoCode ? discountPaise : null, idempotencyKey: newKey() }),
      renewKey: () => set({ idempotencyKey: newKey() }),
      setReference: (reference) => set({ reference }),
      clear: () =>
        set({
          selection: null,
          passengers: null,
          confirmOnly: false,
          reference: null,
          promoCode: null,
          promoDiscountPaise: null,
          idempotencyKey: newKey(),
        }),
    }),
    {
      name: 'zproo-train-draft',
      version: 1,
      storage: createJSONStorage(() => safeSessionStorage),
      partialize: ({ selection, passengers, contact, confirmOnly, idempotencyKey, reference, promoCode, promoDiscountPaise }) => ({
        promoCode,
        promoDiscountPaise,
        selection,
        passengers,
        contact,
        confirmOnly,
        idempotencyKey,
        reference,
      }),
    },
  ),
);
