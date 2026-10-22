/**
 * Hand-off between checkout pages and the Offers page.
 *
 * Checkout "Apply" buttons send the visitor to `/offers?service=…&returnTo=/path`. The Offers page lets them
 * copy a code (remembered here for the trip back), and the checkout page pre-fills it in its coupon box.
 */
const KEY = 'zproo:copiedCoupon';

export function offersUrl(service: string, returnTo: string, label = 'checkout'): string {
  const q = new URLSearchParams({ service, returnTo, label });
  return `/offers?${q.toString()}`;
}

/** Only same-site, absolute paths are allowed as a return target (no `//host` or full URLs). */
export function safeReturnPath(v: string | null): string | null {
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return null;
  return v;
}

export function rememberCopiedCoupon(code: string) {
  try { sessionStorage.setItem(KEY, code); } catch { /* storage unavailable: the code is still on the clipboard */ }
}

export function peekCopiedCoupon(): string | null {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}

export function clearCopiedCoupon() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
