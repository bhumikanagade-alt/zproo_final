import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '@/features/auth/store';
import { localJson } from './localStorageAdapter';

interface WishlistState {
  /** Saved hotel ids per signed-in user ("guest" when signed out). */
  byUser: Record<string, string[]>;
  toggle: (userKey: string, hotelId: string) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      byUser: {},
      toggle: (userKey, hotelId) =>
        set((s) => {
          const current = s.byUser[userKey] ?? [];
          const next = current.includes(hotelId) ? current.filter((id) => id !== hotelId) : [hotelId, ...current];
          return { byUser: { ...s.byUser, [userKey]: next } };
        }),
    }),
    { name: 'zproo-hotel-wishlist', storage: localJson() },
  ),
);

/** The current user's saved hotels. */
export function useWishlist() {
  const user = useAuthStore((s) => s.user);
  const userKey = user ? String(user.id) : 'guest';
  const ids = useWishlistStore((s) => s.byUser[userKey]);
  const toggleStore = useWishlistStore((s) => s.toggle);
  const list = ids ?? [];
  return {
    ids: list,
    has: (hotelId: string) => list.includes(hotelId),
    toggle: (hotelId: string) => toggleStore(userKey, hotelId),
  };
}
