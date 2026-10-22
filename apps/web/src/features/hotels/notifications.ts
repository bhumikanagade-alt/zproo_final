import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/** One "Hotel booking confirmed" entry for the notification bell. */
export interface HotelNotification {
  reference: string;
  userId: string;
  hotelName: string;
  city: string;
  checkIn: string;
  checkOut: string;
  createdAt: string; // ISO timestamp
}

interface HotelNotificationState {
  items: HotelNotification[];
  /** Adds a confirmed hotel booking (ignored if that reference is already recorded). */
  add: (item: HotelNotification) => void;
  clear: () => void;
}

const MAX_ITEMS = 20;

const storage: StateStorage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable: notifications still work in memory */
    }
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const useHotelNotifications = create<HotelNotificationState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) =>
          s.items.some((i) => i.reference === item.reference && i.userId === item.userId)
            ? s
            : { items: [item, ...s.items].slice(0, MAX_ITEMS) },
        ),
      clear: () => set({ items: [] }),
    }),
    { name: 'zproo-hotel-notifications', storage: createJSONStorage(() => storage) },
  ),
);

/** Human-friendly "x min ago" label for the bell. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - Date.parse(iso));
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
