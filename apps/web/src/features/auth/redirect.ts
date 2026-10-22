/**
 * Only same-site paths are allowed as post-login destinations, so a crafted
 * `?next=https://evil.example` link cannot bounce users off-site.
 */
export function safeNext(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\'))
    return fallback;
  if (/^\/(login|signup|verify-otp|forgot-password|reset-password)\b/.test(value)) return fallback;
  return value;
}

/** `/login?next=…` link preserving where the user wanted to go. */
export function loginPath(next: string): string {
  return next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/^\+91/, '');
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}
