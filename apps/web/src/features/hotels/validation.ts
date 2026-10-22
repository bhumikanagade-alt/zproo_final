/** Validation for the hotel guest, contact, special-request and payment forms. */
import { validateCard } from '../cabs/validation';

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

// ───────────── Names: letters only (no digits, symbols or punctuation) ─────────────

/** Unicode letters (with combining marks) in words separated by single spaces. */
const NAME_RE = /^\p{L}[\p{L}\p{M}]*(?: \p{L}[\p{L}\p{M}]*)*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const NAME_MAX = 40;
/** Guest name limits on the hotel booking form. */
export const HOTEL_FIRST_NAME_MAX = 20;
export const HOTEL_LAST_NAME_MAX = 15;

/** Live input filter: drops everything except letters and spaces, collapses repeated spaces. */
export function sanitizeName(value: string, max: number = NAME_MAX): string {
  return value
    .replace(/[^\p{L}\p{M} ]/gu, '')
    .replace(/ {2,}/g, ' ')
    .replace(/^ /, '')
    .slice(0, max);
}

/** Returns an error message for a name field, or null when valid. */
export function nameError(value: string, label: string, max: number = NAME_MAX): string | null {
  const v = value.trim();
  if (!v) return `Enter ${label}.`;
  if (/\d/.test(v)) return `${capitalise(label)} cannot contain numbers.`;
  if (!NAME_RE.test(v)) return `${capitalise(label)} can contain letters only.`;
  if ([...v.replace(/[\s\p{M}]/gu, '')].length < 2) return `${capitalise(label)} must have at least 2 letters.`;
  if (v.length > max) return `${capitalise(label)} must be at most ${max} characters.`;
  if (/(\p{L})\1{3,}/iu.test(v)) return `Enter a valid ${label}.`;
  return null;
}

const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const isValidName = (value: string): boolean => nameError(value, 'name') === null;

export const isValidEmail = (value: string): boolean => EMAIL_RE.test(value.trim());

// ───────────── Mobile numbers: digits only, rules per country ─────────────

export interface PhoneCountry {
  /** ISO 3166-1 alpha-2 code; also the flag file name (/assets/flags/xx.png). */
  iso: string;
  name: string;
  /** International dial code without the plus sign. */
  dial: string;
  /** Allowed national-number length (digits, without dial code or leading 0). */
  min: number;
  max: number;
  /** Pattern the national number must match (valid mobile prefixes). */
  pattern: RegExp;
  /** Example shown as placeholder. */
  example: string;
}

const c = (
  iso: string,
  name: string,
  dial: string,
  min: number,
  max: number,
  pattern: RegExp,
  example: string,
): PhoneCountry => ({ iso, name, dial, min, max, pattern, example });

export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  c('IN', 'India', '91', 10, 10, /^[6-9]\d{9}$/, '9876543210'),
  c('AE', 'United Arab Emirates', '971', 9, 9, /^5\d{8}$/, '501234567'),
  c('US', 'United States', '1', 10, 10, /^[2-9]\d{2}[2-9]\d{6}$/, '4155552671'),
  c('GB', 'United Kingdom', '44', 10, 10, /^7\d{9}$/, '7400123456'),
  c('SG', 'Singapore', '65', 8, 8, /^[3689]\d{7}$/, '81234567'),
  c('AU', 'Australia', '61', 9, 9, /^4\d{8}$/, '412345678'),
  c('CA', 'Canada', '1', 10, 10, /^[2-9]\d{2}[2-9]\d{6}$/, '4165551234'),
  c('DE', 'Germany', '49', 10, 11, /^1[5-7]\d{8,9}$/, '15123456789'),
  c('FR', 'France', '33', 9, 9, /^[67]\d{8}$/, '612345678'),
  c('SA', 'Saudi Arabia', '966', 9, 9, /^5\d{8}$/, '512345678'),
  c('QA', 'Qatar', '974', 8, 8, /^[3567]\d{7}$/, '33123456'),
  c('KW', 'Kuwait', '965', 8, 8, /^[569]\d{7}$/, '50012345'),
  c('OM', 'Oman', '968', 8, 8, /^[79]\d{7}$/, '92123456'),
  c('BH', 'Bahrain', '973', 8, 8, /^[36]\d{7}$/, '36001234'),
  c('NP', 'Nepal', '977', 10, 10, /^9[78]\d{8}$/, '9812345678'),
  c('LK', 'Sri Lanka', '94', 9, 9, /^7\d{8}$/, '712345678'),
  c('BD', 'Bangladesh', '880', 10, 10, /^1[3-9]\d{8}$/, '1712345678'),
  c('MY', 'Malaysia', '60', 9, 10, /^1\d{8,9}$/, '123456789'),
  c('TH', 'Thailand', '66', 9, 9, /^[689]\d{8}$/, '812345678'),
  c('ID', 'Indonesia', '62', 9, 12, /^8\d{8,11}$/, '812345678'),
  c('JP', 'Japan', '81', 10, 10, /^[789]0\d{8}$/, '9012345678'),
  c('CN', 'China', '86', 11, 11, /^1[3-9]\d{9}$/, '13812345678'),
  c('IT', 'Italy', '39', 10, 10, /^3\d{9}$/, '3123456789'),
  c('ES', 'Spain', '34', 9, 9, /^[67]\d{8}$/, '612345678'),
  c('NL', 'Netherlands', '31', 9, 9, /^6\d{8}$/, '612345678'),
  c('CH', 'Switzerland', '41', 9, 9, /^7[5-9]\d{7}$/, '781234567'),
  c('NZ', 'New Zealand', '64', 8, 10, /^2\d{7,9}$/, '211234567'),
  c('ZA', 'South Africa', '27', 9, 9, /^[678]\d{8}$/, '821234567'),
];

export const DEFAULT_COUNTRY_ISO = 'IN';

export const phoneCountry = (iso: string): PhoneCountry =>
  PHONE_COUNTRIES.find((p) => p.iso === iso) ?? (PHONE_COUNTRIES[0] as PhoneCountry);

export const phoneCountryByName = (name: string): PhoneCountry | undefined =>
  PHONE_COUNTRIES.find((p) => p.name === name);

export const flagSrc = (iso: string): string => `/assets/flags/${iso.toLowerCase()}.png`;

/**
 * Keeps only digits for the given country: removes spaces/symbols/letters, a pasted `+dial`
 * or `00dial` prefix, and a leading trunk `0`, then caps the length.
 */
export function normalisePhone(value: string, iso: string = DEFAULT_COUNTRY_ISO): string {
  const country = phoneCountry(iso);
  let digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+') || digits.length > country.max) {
    if (digits.startsWith(`00${country.dial}`)) digits = digits.slice(2);
    if (digits.startsWith(country.dial) && digits.length > country.max) {
      digits = digits.slice(country.dial.length);
    }
  }
  if (digits.startsWith('0') && digits.length > country.max) digits = digits.slice(1);
  return digits.slice(0, country.max);
}

/** Returns a user-facing error for the mobile number, or null when valid. */
export function phoneError(value: string, iso: string = DEFAULT_COUNTRY_ISO): string | null {
  const country = phoneCountry(iso);
  if (!value.trim()) return 'Enter your mobile number.';
  if (/[^\d\s+()-]/.test(value)) return 'Mobile number can contain digits only.';
  const digits = normalisePhone(value, iso);
  const length = country.min === country.max ? `${country.min}` : `${country.min}–${country.max}`;
  if (digits.length < country.min || digits.length > country.max) {
    return `Enter a valid ${length}-digit mobile number for ${country.name}.`;
  }
  if (/^(\d)\1+$/.test(digits)) return 'Enter a valid mobile number.';
  if (!country.pattern.test(digits)) {
    return `Enter a valid ${country.name} mobile number (e.g. ${country.example}).`;
  }
  return null;
}

export function isValidPhone(value: string, iso: string = DEFAULT_COUNTRY_ISO): boolean {
  return phoneError(value, iso) === null;
}

/** `+91 9876543210` — the form stored with the booking and shown on the ticket. */
export function formatInternationalPhone(value: string, iso: string = DEFAULT_COUNTRY_ISO): string {
  return `+${phoneCountry(iso).dial} ${normalisePhone(value, iso)}`;
}

export interface GuestInput {
  firstName: string;
  lastName: string;
  age: number;
  type: 'ADULT' | 'CHILD';
  gender?: string;
}

export interface ContactInput {
  name: string;
  email: string;
  /** National number (digits) for `country`. */
  phone: string;
  /** Country name from PHONE_COUNTRIES. */
  country: string;
}

export type GuestErrors = FieldErrors<'firstName' | 'lastName' | 'age' | 'gender'>;

/** Returns errors per guest index (guests without errors are absent). */
export function validateGuests(
  guests: readonly GuestInput[],
  expected: { adults: number; children: number },
  options: { requireGender?: boolean } = {},
): { byIndex: Record<number, GuestErrors>; general: string | null } {
  const byIndex: Record<number, GuestErrors> = {};
  let general: string | null = null;
  const adults = guests.filter((g) => g.type === 'ADULT').length;
  const children = guests.filter((g) => g.type === 'CHILD').length;
  if (adults !== expected.adults || children !== expected.children) {
    general = `Guest list must have ${expected.adults} adult${expected.adults === 1 ? '' : 's'}${expected.children ? ` and ${expected.children} child${expected.children === 1 ? '' : 'ren'}` : ''}.`;
  }

  guests.forEach((guest, index) => {
    const errors: GuestErrors = {};
    const firstError = nameError(guest.firstName, 'first name', HOTEL_FIRST_NAME_MAX);
    if (firstError) errors.firstName = firstError;
    const lastError = nameError(guest.lastName, 'last name', HOTEL_LAST_NAME_MAX);
    if (lastError) errors.lastName = lastError;
    if (!Number.isInteger(guest.age)) errors.age = 'Enter a valid age.';
    else if (guest.type === 'ADULT' && (guest.age < 18 || guest.age > 120))
      errors.age = 'Adults must be 18 or older.';
    else if (guest.type === 'CHILD' && (guest.age < 0 || guest.age > 12))
      errors.age = 'Children must be 0–12 years.';
    if (options.requireGender && !guest.gender) errors.gender = 'Select gender.';
    if (Object.keys(errors).length) byIndex[index] = errors;
  });
  return { byIndex, general };
}

export type ContactErrors = FieldErrors<'name' | 'email' | 'phone' | 'country'>;

export function validateContact(contact: ContactInput): ContactErrors {
  const errors: ContactErrors = {};
  const fullName = nameError(contact.name, 'full name');
  if (fullName) errors.name = fullName;
  else if (contact.name.trim().split(' ').length < 2) errors.name = 'Enter first and last name.';
  if (!contact.email.trim()) errors.email = 'Enter your email address.';
  else if (!isValidEmail(contact.email)) errors.email = 'Enter a valid email address.';
  const country = phoneCountryByName(contact.country);
  if (!contact.country.trim() || !country) errors.country = 'Select your country.';
  const phone = phoneError(contact.phone, country?.iso ?? DEFAULT_COUNTRY_ISO);
  if (phone) errors.phone = phone;
  return errors;
}

export const COUNTRIES: readonly string[] = PHONE_COUNTRIES.map((p) => p.name);

export const SPECIAL_REQUESTS = [
  { id: 'early-check-in', label: 'Early check-in' },
  { id: 'late-check-out', label: 'Late check-out' },
  { id: 'high-floor', label: 'High floor' },
  { id: 'low-floor', label: 'Lower floor' },
  { id: 'extra-bed', label: 'Extra bed' },
  { id: 'airport-transfer', label: 'Airport transfer' },
  { id: 'anniversary', label: 'Anniversary' },
  { id: 'birthday', label: 'Birthday' },
] as const;

export type SpecialRequestId = (typeof SPECIAL_REQUESTS)[number]['id'];

export const SPECIAL_REQUEST_NOTE_MAX = 250;

export const SPECIAL_REQUEST_DISCLAIMER = 'Requests are subject to hotel availability.';

export function validateSpecialRequests(note: string): string | null {
  if (note.length > SPECIAL_REQUEST_NOTE_MAX)
    return `Keep your note under ${SPECIAL_REQUEST_NOTE_MAX} characters.`;
  return null;
}

export const specialRequestLabel = (id: string): string =>
  SPECIAL_REQUESTS.find((r) => r.id === id)?.label ?? id;

// ───────────── Payment (demo gateway: nothing is charged or stored) ─────────────

export type PaymentMethod = 'upi' | 'card' | 'netbanking';

export interface PaymentInput {
  method: PaymentMethod;
  upi: string;
  card: { number: string; expiry: string; cvv: string };
  bank: string;
}

export const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank'] as const;

export const isValidUpi = (value: string): boolean => /^[\w.-]{2,}@[a-zA-Z][\w-]{1,}$/.test(value.trim());

/** Luhn checksum. Exported for a real gateway; the demo flow only checks the 16 digits. */
export function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (Number.isNaN(n)) return false;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

export function isValidExpiry(value: string, now: Date = new Date()): boolean {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return year > currentYear || (year === currentYear && month >= currentMonth);
}

/** Returns a single user-facing message, or null when the payment details are valid. */
export function validatePayment(input: PaymentInput, now: Date = new Date()): string | null {
  if (input.method === 'upi') {
    return isValidUpi(input.upi) ? null : 'Enter a valid UPI ID, for example name@upi.';
  }
  if (input.method === 'card') {
    // Full card check: network, length, Luhn checksum, expiry and brand-aware CVV.
    const errors = validateCard(input.card, now);
    return errors.number ?? errors.expiry ?? errors.cvv ?? null;
  }
  return input.bank ? null : 'Select your bank to continue.';
}
