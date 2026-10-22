import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/** localStorage that never throws (private mode, blocked storage): state then lives in memory only. */
const safeLocal: StateStorage = {
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
      /* ignore */
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

export const localJson = () => createJSONStorage(() => safeLocal);
