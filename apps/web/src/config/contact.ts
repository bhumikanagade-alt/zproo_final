/**
 * Single source of truth for customer-facing contact details.
 *
 * The support phone number is read from VITE_SUPPORT_PHONE (see .env.example) so only the
 * verified customer-support number is ever shown. While it is not set the number is simply
 * left out, and email + the contact form remain available.
 */
export const SUPPORT_EMAIL = 'support@zproo.com';
export const CAREER_EMAIL = 'career@zproo.com';
export const COMPANY_NAME = 'zproo EV Pvt Ltd';
export const SUPPORT_HOURS = '24×7 for booking help';

const rawPhone = (import.meta.env.VITE_SUPPORT_PHONE ?? '').trim();

/** Display form, e.g. "+91 98765 43210" (exactly what was configured). */
export const SUPPORT_PHONE: string | null = rawPhone || null;

/** `tel:` link: digits and a leading plus only. */
export const SUPPORT_PHONE_HREF: string | null = rawPhone
  ? `tel:${rawPhone.replace(/[^\d+]/g, '')}`
  : null;

/** Placeholder number shown on the Help page while no real VITE_SUPPORT_PHONE is configured. */
export const DUMMY_SUPPORT_PHONE = '+91 98765 43210';

/** Optional form endpoint (e.g. Formspree). Without it, forms open the visitor's email app instead. */
export const FORM_ENDPOINT: string | null = (import.meta.env.VITE_FORM_ENDPOINT ?? '').trim() || null;
