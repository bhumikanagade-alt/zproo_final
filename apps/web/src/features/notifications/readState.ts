import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/** Which notifications each signed-in user has already opened (kept in this browser). */
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
      /* storage unavailable: read marks last until the page is reloaded */
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

interface ReadState {
  /** user id → ids of notifications that user has read */
  read: Record<string, string[]>;
  markRead: (userId: string, ids: string[]) => void;
}

const MAX_PER_USER = 200;

export const useReadNotifications = create<ReadState>()(
  persist(
    (set) => ({
      read: {},
      markRead: (userId, ids) =>
        set((s) => {
          const current = s.read[userId] ?? [];
          const next = [...new Set([...current, ...ids])].slice(-MAX_PER_USER);
          return next.length === current.length ? s : { read: { ...s.read, [userId]: next } };
        }),
    }),
    { name: 'zproo-read-notifications', storage: createJSONStorage(() => storage) },
  ),
);
