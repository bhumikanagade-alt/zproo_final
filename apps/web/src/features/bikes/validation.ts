import { BANKS, BIKE_NAME_MAX, DEMO_DECLINE, RULES } from './rules';
import { validateCard } from '../cabs/validation';
import { earliestPickup, parseLocal } from './dates';
import type { CustomerDetails, PaymentMethod, RentalSchedule } from './types';

export type Errors<K extends string> = Partial<Record<K, string>>;

export type ScheduleKey = 'pickupCity' | 'pickupLocationId' | 'returnLocationId' | 'pickupDate' | 'pickupTime' | 'returnDate' | 'returnTime';
export type CustomerKey = keyof CustomerDetails | 'terms';

/**
 * Validates the pickup city, pickup/return areas and dates. `now` is injectable for tests.
 * `cityOnly` is used by the search steps (landing, results, details), where only the city is
 * chosen; the areas (hubs) are picked on the rental details page.
 */
export function validateSchedule(s: RentalSchedule, minHours: number, now = new Date(), opts: { cityOnly?: boolean } = {}): Errors<ScheduleKey> {
  const e: Errors<ScheduleKey> = {};
  if (!s.pickupCity) e.pickupCity = 'Choose a pickup city';
  if (!opts.cityOnly) {
    if (!s.pickupLocationId) e.pickupLocationId = 'Choose a pickup area';
    if (!s.returnLocationId) e.returnLocationId = 'Choose a return area';
  }
  if (!s.pickupDate) e.pickupDate = 'Choose a pickup date';
  if (!s.pickupTime) e.pickupTime = 'Choose a pickup time';
  if (!s.returnDate) e.returnDate = 'Choose a return date';
  if (!s.returnTime) e.returnTime = 'Choose a return time';

  const start = s.pickupDate && s.pickupTime ? parseLocal(s.pickupDate, s.pickupTime) : null;
  const end = s.returnDate && s.returnTime ? parseLocal(s.returnDate, s.returnTime) : null;
  if (s.pickupDate && s.pickupTime && !start) e.pickupDate = 'Enter a valid pickup date';
  if (s.returnDate && s.returnTime && !end) e.returnDate = 'Enter a valid return date';

  if (start && !e.pickupDate && start.getTime() < earliestPickup(now).getTime() - 1) {
    e.pickupTime = `Pickup must be at least ${RULES.leadTimeHours} hours from now`;
  }
  if (start && end) {
    const hours = (end.getTime() - start.getTime()) / 3_600_000;
    if (hours <= 0) e.returnTime = 'Return must be after the pickup time';
    else if (hours < minHours) e.returnTime = `Minimum rental is ${minHours} hours`;
    else if (hours > RULES.maxDays * 24) e.returnDate = `Maximum rental is ${RULES.maxDays} days`;
  }
  return e;
}

/** Indian mobile: optional +91 / 91 / 0 prefix, then 10 digits starting 6-9. */
export function normaliseMobile(raw: string): string | null {
  const m = /^(?:\+91|91|0)?([6-9]\d{9})$/.exec(raw.replace(/[\s-]/g, ''));
  return m?.[1] ?? null;
}

export function sanitizeMobile(raw: string): string {
  const t = raw.trim();
  let d = t.replace(/\D/g, '');
  if (t.startsWith('+91') || (d.length >= 12 && d.startsWith('91')) || (d.length === 11 && d.startsWith('0'))) {
    d = d.startsWith('91') ? d.slice(2) : d.slice(1);
  }
  return d.slice(0, 10);
}

/** Bike name / model search text: no leading spaces, single spaces, at most BIKE_NAME_MAX characters. */
export const sanitizeBikeName = (raw: string) => raw.replace(/^\s+/, '').replace(/\s{2,}/g, ' ').slice(0, BIKE_NAME_MAX);

export const sanitizeName = (raw: string) =>
  raw.replace(/[^\p{L}\p{M}\s.'’-]/gu, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ').slice(0, 60);

/** Indian driving licence: 2-letter state code, 2-digit RTO, then year + serial (e.g. MH12 20190012345). */
export const sanitizeLicence = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
const LICENCE_RE = /^[A-Z]{2}\d{2}(?:19|20)\d{2}\d{7}$/;
const NAME_RE = /^\p{L}[\p{L}\p{M}\s.'’-]*$/u;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export function ageOn(dob: string, now = new Date()): number | null {
  const d = parseLocal(dob, '00:00');
  if (!d) return null;
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthday = now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function validateCustomer(c: CustomerDetails, acceptedTerms: boolean, now = new Date()): Errors<CustomerKey> {
  const e: Errors<CustomerKey> = {};
  const name = c.fullName.trim();
  if (name.length < 2) e.fullName = 'Enter your full name as on your licence';
  else if (!NAME_RE.test(name)) e.fullName = 'Name can only contain letters and spaces';

  if (!c.mobile.trim()) e.mobile = 'Enter a mobile number';
  else if (!normaliseMobile(c.mobile)) e.mobile = 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9';

  const email = c.email.trim();
  if (!email) e.email = 'Enter your email address';
  else if (email.length > 254 || email.includes('..') || !EMAIL_RE.test(email)) e.email = 'Enter a valid email, e.g. name@example.com';

  if (!c.dateOfBirth) e.dateOfBirth = 'Enter your date of birth';
  else {
    const age = ageOn(c.dateOfBirth, now);
    if (age === null) e.dateOfBirth = 'Enter a valid date of birth';
    else if (age < RULES.minRiderAge) e.dateOfBirth = `Riders must be at least ${RULES.minRiderAge} years old`;
    else if (age > 90) e.dateOfBirth = 'Enter a valid date of birth';
  }

  if (!c.licenceNumber) e.licenceNumber = 'Enter your driving licence number';
  else if (!LICENCE_RE.test(c.licenceNumber)) e.licenceNumber = 'Use the format MH1220190012345 (state, RTO, year, serial)';

  if (c.address.trim().length < 8) e.address = 'Enter your current address (at least 8 characters)';
  if (!acceptedTerms) e.terms = 'Please accept the rental terms to continue';
  return e;
}

/* ───────────── Payment (demo: validated in the browser only, never stored or sent) ───────────── */

export interface PaymentFields {
  upiId: string;
  cardNumber: string;
  cardName: string;
  expiry: string; // MM/YY
  cvv: string;
  bank: string;
}
export type PaymentKey = keyof PaymentFields;
export const emptyPayment: PaymentFields = { upiId: '', cardNumber: '', cardName: '', expiry: '', cvv: '', bank: '' };

/** Live card filters shared with the cab, hotel and parcel payment forms. */
export { sanitizeCardNumber, sanitizeExpiry, sanitizeCvv } from '../cabs/validation';

export function luhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

const UPI_RE = /^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$/;

export function validatePayment(method: PaymentMethod, f: PaymentFields, now = new Date()): Errors<PaymentKey> {
  const e: Errors<PaymentKey> = {};
  if (method === 'upi') {
    const id = f.upiId.trim();
    if (!id) e.upiId = 'Enter your UPI ID';
    else if (!UPI_RE.test(id)) e.upiId = 'Enter a valid UPI ID, e.g. name@okaxis';
  }
  if (method === 'card') {
    // Network, length, Luhn checksum, expiry and brand-aware CVV (Amex 4 digits, others 3).
    const c = validateCard({ number: f.cardNumber, expiry: f.expiry, cvv: f.cvv }, now);
    if (c.number) e.cardNumber = c.number;
    if (f.cardName.trim().length < 2) e.cardName = 'Enter the name on the card';
    else if (!NAME_RE.test(f.cardName.trim())) e.cardName = 'Name can only contain letters and spaces';
    if (c.expiry) e.expiry = c.expiry;
    if (c.cvv) e.cvv = c.cvv;
  }
  if (method === 'netbanking' && !(BANKS as readonly string[]).includes(f.bank)) e.bank = 'Choose your bank';
  return e;
}

/** Demo switch: these inputs simulate a declined payment. */
export function isDemoDecline(method: PaymentMethod, f: PaymentFields): boolean {
  if (method === 'card') return f.cardNumber.replace(/\s/g, '') === DEMO_DECLINE.card;
  if (method === 'upi') return f.upiId.trim().toLowerCase() === DEMO_DECLINE.upi;
  return false;
}
