import { FORM_ENDPOINT } from '@/config/contact';

export type SubmitResult = { mode: 'sent' } | { mode: 'email' };

/**
 * Sends a contact/career form. With a configured endpoint the message is POSTed there;
 * otherwise the visitor's default email app opens with everything pre-filled, so the
 * form always works without a server.
 */
export async function submitForm(args: {
  to: string;
  subject: string;
  fields: Record<string, string>;
}): Promise<SubmitResult> {
  if (FORM_ENDPOINT) {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ subject: args.subject, ...args.fields }),
    });
    if (!res.ok) throw new Error('We could not send your message. Please try again or email us directly.');
    return { mode: 'sent' };
  }
  const body = Object.entries(args.fields)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  window.location.href = `mailto:${args.to}?subject=${encodeURIComponent(args.subject)}&body=${encodeURIComponent(body)}`;
  return { mode: 'email' };
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isPhone = (v: string) => {
  const t = v.trim();
  if (!/^\+?[\d\s-]{10,15}$/.test(t)) return false;
  return !/^(\d)\1+$/.test(t.replace(/\D/g, '')); // reject 9999999999-style numbers
};

/** Name: letters and single spaces only (no digits or symbols), at least 2 letters. */
export const sanitizeContactName = (raw: string) => raw.replace(/[^A-Za-z ]/g, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
export const isLettersName = (v: string) => /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(v.trim()) && v.replace(/[^A-Za-z]/g, '').length >= 2;

/** Strict email: one @, a real domain with a dot, no double dots, no leading/trailing dot. */
export const isStrictEmail = (v: string) => {
  const t = v.trim();
  return t.length <= 254 && !t.includes('..') && /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/.test(t);
};

/** Phone: digits only, at most 10 (a pasted +91 / 91 prefix is dropped). */
export const sanitizeContactPhone = (raw: string) => {
  let d = raw.replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('91')) d = d.slice(2);
  return d.slice(0, 10);
};
/** Exactly 10 digits, starting 6-9, and not a fake like 0000000000, 9999999999 or 9898989898. */
export const isTenDigitMobile = (v: string) =>
  /^[6-9]\d{9}$/.test(v) && !/^(\d)\1{9}$/.test(v) && !/^(\d\d)\1{4}$/.test(v) && !/(\d)\1{6,}/.test(v);
