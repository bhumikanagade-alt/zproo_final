import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HotelReview, TravellerType } from './extras';
import { localJson } from './localStorageAdapter';

interface OwnReviewState {
  reviews: HotelReview[];
  /** Review ids this device has marked helpful. */
  helpful: string[];
  add: (input: { hotelId: string; author: string; travellerType: TravellerType; rating: number; title: string; text: string; stayedOn: string }) => void;
  toggleHelpful: (id: string) => void;
}

export const useOwnReviews = create<OwnReviewState>()(
  persist(
    (set) => ({
      reviews: [],
      helpful: [],
      add: (input) =>
        set((s) => ({
          reviews: [{ ...input, id: `own-${Date.now().toString(36)}`, helpful: 0, own: true }, ...s.reviews],
        })),
      toggleHelpful: (id) => set((s) => ({ helpful: s.helpful.includes(id) ? s.helpful.filter((x) => x !== id) : [...s.helpful, id] })),
    }),
    { name: 'zproo-hotel-reviews', storage: localJson() },
  ),
);
