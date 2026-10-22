import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

const HOLD_MINUTES = 15;
const storage: StateStorage = {
  getItem: (key) => { try { return window.sessionStorage.getItem(key); } catch { return null; } },
  setItem: (key, value) => { try { window.sessionStorage.setItem(key, value); } catch {} },
  removeItem: (key) => { try { window.sessionStorage.removeItem(key); } catch {} },
};

interface BookingSessionState {
  started: boolean;
  startedAt: number | null;
  expiresAt: number | null;
  /** Which bus/flight this timer belongs to (e.g. `bus:<tripId>`, `flight:<offerIds>`). */
  key: string | null;
  start: () => void;
  /**
   * Called when a bus or flight is chosen. A different choice (or an expired timer) starts a fresh
   * hold from the full time; re-entering the same choice keeps the running timer.
   */
  begin: (key: string) => void;
  clear: () => void;
}

export const useBookingSession = create<BookingSessionState>()(
  persist(
    (set, get) => ({
      started: false,
      startedAt: null,
      expiresAt: null,
      key: null,
      begin: (key) => {
        const current = get();
        const running = current.started && current.expiresAt !== null && current.expiresAt > Date.now();
        if (running && current.key === key) return;
        const startedAt = Date.now();
        set({ started: true, startedAt, expiresAt: startedAt + HOLD_MINUTES * 60_000, key });
      },
      start: () => {
        const current = get();
        if (current.started && current.expiresAt && current.expiresAt > Date.now()) return;
        const startedAt = Date.now();
        set({ started: true, startedAt, expiresAt: startedAt + HOLD_MINUTES * 60_000, key: get().key });
      },
      clear: () => set({ started: false, startedAt: null, expiresAt: null, key: null }),
    }),
    { name: 'zproo-booking-session', storage: createJSONStorage(() => storage) },
  ),
);
