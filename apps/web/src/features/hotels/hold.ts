import { useEffect, useState } from 'react';

export const HOLD_MINUTES = 15;
const KEY = 'zproo-hotel-hold';

interface Hold {
  key: string;
  startedAt: number;
}

const read = (): Hold | null => {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Hold) : null;
  } catch {
    return null;
  }
};

const write = (hold: Hold | null) => {
  try {
    if (hold) window.sessionStorage.setItem(KEY, JSON.stringify(hold));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

/** Seconds left on the hold (0 = expired). Starts a new 15-minute hold when `key` is new. */
export function holdRemainingSeconds(key: string, now: number = Date.now()): number {
  const current = read();
  if (!current || current.key !== key) {
    write({ key, startedAt: now });
    return HOLD_MINUTES * 60;
  }
  return Math.max(0, Math.ceil((current.startedAt + HOLD_MINUTES * 60_000 - now) / 1000));
}

export const clearHold = () => write(null);

/** Restarts the hold (used after the guest chooses to refresh an expired price). */
export function restartHold(key: string) {
  write({ key, startedAt: Date.now() });
}

export const formatCountdown = (seconds: number): string =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

/** Live countdown for a hold identified by `key`. */
export function useHold(key: string) {
  const [seconds, setSeconds] = useState(() => holdRemainingSeconds(key));
  useEffect(() => {
    setSeconds(holdRemainingSeconds(key));
    const id = window.setInterval(() => setSeconds(holdRemainingSeconds(key)), 1000);
    return () => window.clearInterval(id);
  }, [key]);
  return {
    seconds,
    expired: seconds <= 0,
    restart: () => {
      restartHold(key);
      setSeconds(HOLD_MINUTES * 60);
    },
  };
}
