import { useEffect, useState } from 'react';

/**
 * False on the server and during hydration, then true once the browser is idle (or after
 * `timeoutMs`). Lets non-essential UI (menus, popups) load after the page is interactive, while
 * the first client render still matches the prerendered HTML.
 */
export function useIdleReady(timeoutMs = 2500): [boolean, () => void] {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: timeoutMs });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), Math.min(timeoutMs, 1200));
    return () => window.clearTimeout(t);
  }, [ready, timeoutMs]);
  return [ready, () => setReady(true)];
}
