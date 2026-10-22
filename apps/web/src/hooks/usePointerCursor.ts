import { useEffect } from 'react';
import { useLocation } from 'react-router';

const CLASS = 'pointer-cursor';
const MODULE_PREFIXES = ['/hotels', '/cabs', '/rides'];

/** Always shows the pointer (mouse hand) cursor on clickable elements while the calling page is mounted. */
export function usePointerCursor(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    document.documentElement.classList.add(CLASS);
    return () => document.documentElement.classList.remove(CLASS);
  }, [enabled]);
}

/** Layout-level: enables the pointer cursor on every hotel and cab page (including their booking flows). */
export function useModulePointerCursor() {
  const { pathname } = useLocation();
  usePointerCursor(MODULE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)));
}
