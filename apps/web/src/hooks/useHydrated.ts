import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False while prerendering and during hydration, true afterwards (and immediately for pages
 * rendered in the browser). Use it to swap in browser-only UI without hydration mismatches.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
