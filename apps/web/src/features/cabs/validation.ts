import { findLocation, scheduledTimestamp } from './fare';
import type { RideMode } from './types';

export interface SearchInput {
  pickup: string;
  drop: string;
  date: string;
  time: string;
  passengers: number;
  mode?: RideMode;
  returnDate?: string;
  returnTime?: string;
  rentalHours?: number;
  airportDir?: 'to' | 'from';
}

export type Errors<T extends string> = Partial<Record<T, string>>;
type SearchKey = 'pickup' | 'drop' | 'date' | 'time' | 'passengers' | 'returnDate' | 'returnTime' | 'rentalHours';

const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * True when two locations are the same place: identical after ignoring case, spacing and
 * punctuation ("Pune Station" = "pune  station."), or both resolve to the same saved location
 * ("Shivajinagar" = "Shivajinagar, Pune").
 */
export function isSameLocation(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false;
  if (squash(a) === squash(b)) return true;
  const la = findLocation(a);
  const lb = findLocation(b);
  return Boolean(la && lb && la === lb);
}

const same = isSameLocation;
export const isAirport = (s: string) => /airport/i.test(s);

export function validateSearch(input: SearchInput, now = Date.now()): Errors<SearchKey> {
  const e: Errors<SearchKey> = {};
  const mode = input.mode ?? 'one-way';
  if (!input.pickup.trim()) e.pickup = 'Enter a pickup location';
  if (mode !== 'rental') {
    if (!input.drop.trim()) e.drop = 'Enter a drop-off location';
    if (input.pickup.trim() && input.drop.trim() && same(input.pickup, input.drop))
      e.drop = 'Pickup and drop-off cannot be the same. Please choose a different location.';
  }
  if (mode === 'airport' && input.pickup.trim() && input.drop.trim() && !isAirport(input.pickup) && !isAirport(input.drop))
    e[input.airportDir === 'from' ? 'pickup' : 'drop'] = input.airportDir === 'from' ? 'Pickup must be an airport for “From airport”' : 'Drop-off must be an airport for “To airport”';
  if (!input.date) e.date = 'Choose a date';
  if (!input.time) e.time = 'Choose a time';
  if (input.date && input.time && scheduledTimestamp(input.date, input.time) < now - 60_000)
    e.time = 'Choose a time that has not passed';
  if (!Number.isInteger(input.passengers) || input.passengers < 1 || input.passengers > 6)
    e.passengers = 'Choose 1 to 6 passengers';
  if (mode === 'round-trip') {
    if (!input.returnDate) e.returnDate = 'Choose a return date';
    if (!input.returnTime) e.returnTime = 'Choose a return time';
  }
  if ((mode === 'round-trip' || mode === 'outstation') && input.returnDate && input.date && input.time) {
    const back = scheduledTimestamp(input.returnDate, input.returnTime || '23:59');
    if (back <= scheduledTimestamp(input.date, input.time)) e.returnDate = 'Return must be after the pickup time';
  }
  if (mode === 'rental' && ![2, 4, 8, 12].includes(input.rentalHours ?? 0)) e.rentalHours = 'Choose a rental package';
  return e;
}

/** Indian mobile: optional +91 / 91 / 0 prefix, then 10 digits starting 6-9. */
export function normaliseMobile(raw: string) {
  const digits = raw.replace(/[\s-]/g, '');
  const m = /^(?:\+91|91|0)?([6-9]\d{9})$/.exec(digits);
  return m ? m[1]! : null;
}

/** Live input filter for the mobile field: digits only, max 10, a pasted +91 / 91 / 0 prefix is dropped. */
export function sanitizeMobile(raw: string) {
  const t = raw.trim();
  let d = t.replace(/\D/g, '');
  if (t.startsWith('+91') || (d.length >= 12 && d.startsWith('91')) || (d.length === 11 && d.startsWith('0'))) {
    d = d.startsWith('91') ? d.slice(2) : d.slice(1);
  }
  return d.slice(0, 10);
}

/** Live input filter for names: letters (any language), spaces, apostrophe, hyphen and dot only. */
export function sanitizeName(raw: string) {
  return raw.replace(/[^\p{L}\p{M}\s.'’-]/gu, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ').slice(0, 60);
}

const NAME_RE = /^\p{L}[\p{L}\p{M}\s.'’-]*$/u;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export function validatePassenger(p: { name: string; mobile: string; email: string }): Errors<'name' | 'mobile' | 'email'> {
  const e: Errors<'name' | 'mobile' | 'email'> = {};
  const name = p.name.trim();
  if (name.length < 2) e.name = 'Enter the passenger’s full name';
  else if (!NAME_RE.test(name)) e.name = 'Name can only contain letters and spaces, no numbers';
  if (!p.mobile.trim()) e.mobile = 'Enter a mobile number';
  else if (/[^\d\s+-]/.test(p.mobile)) e.mobile = 'Mobile number can only contain digits';
  else if (!normaliseMobile(p.mobile)) e.mobile = 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9';
  const email = p.email.trim();
  if (email && (email.length > 254 || email.includes('..') || !EMAIL_RE.test(email))) e.email = 'Enter a valid email address, e.g. name@example.com';
  return e;
}

// ───────────── Card details (demo: validated only, never sent or stored) ─────────────

export interface CardInput { number: string; expiry: string; cvv: string }
export type CardErrors = Errors<'number' | 'expiry' | 'cvv'>;

export interface CardBrand { name: string; lengths: number[]; cvv: number; groups: number[] }

/** Detects the card network from the leading digits (null when it is not a supported card). */
export function detectCardBrand(raw: string): CardBrand | null {
  const d = raw.replace(/\D/g, '');
  if (/^3[47]/.test(d)) return { name: 'American Express', lengths: [15], cvv: 4, groups: [4, 6, 5] };
  if (/^(3[689]|30[0-5]|3095)/.test(d)) return { name: 'Diners Club', lengths: [14], cvv: 3, groups: [4, 6, 4] };
  if (/^4/.test(d)) return { name: 'Visa', lengths: [13, 16], cvv: 3, groups: [4, 4, 4, 4] };
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/.test(d)) return { name: 'Mastercard', lengths: [16], cvv: 3, groups: [4, 4, 4, 4] };
  if (/^(60|65|81|82|508|64[4-9])/.test(d)) return { name: 'RuPay / Discover', lengths: [16], cvv: 3, groups: [4, 4, 4, 4] };
  if (/^(50|5[6-9]|6)/.test(d)) return { name: 'Maestro', lengths: [12, 13, 14, 15, 16, 17, 18, 19], cvv: 3, groups: [4, 4, 4, 4, 4] };
  return null;
}

/** Live filter: digits only, limited to the card type's length and grouped the way it is printed. */
export function sanitizeCardNumber(raw: string) {
  const brand = detectCardBrand(raw);
  const d = raw.replace(/\D/g, '').slice(0, brand ? Math.max(...brand.lengths) : 19);
  if (!brand) return d.replace(/(\d{4})(?=\d)/g, '$1 ');
  const parts: string[] = [];
  let i = 0;
  for (const g of brand.groups) { if (i >= d.length) break; parts.push(d.slice(i, i + g)); i += g; }
  return parts.join(' ');
}

/** Live filter: digits only, month limited to 01-12, auto-inserts the slash (MM/YY). */
export function sanitizeExpiry(raw: string) {
  let d = raw.replace(/\D/g, '');
  if (d.length >= 1 && Number(d[0]) > 1) d = `0${d}`; // 2-9 can only be a single-digit month
  if (d.length >= 2) {
    const mm = Number(d.slice(0, 2));
    if (mm === 0 || mm > 12) d = d[0]! + d.slice(2); // drop an impossible second digit
  }
  d = d.slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** Live filter: digits only; 4 digits for American Express, otherwise 3. */
export function sanitizeCvv(raw: string, cardNumber = '') {
  return raw.replace(/\D/g, '').slice(0, detectCardBrand(cardNumber)?.cvv ?? 3);
}

function passesLuhn(digits: string) {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (dbl) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    dbl = !dbl;
  }
  return digits.length > 0 && sum % 10 === 0;
}

export function validateCard(c: CardInput, now: Date = new Date()): CardErrors {
  const e: CardErrors = {};
  const digits = c.number.replace(/\s/g, '');
  const brand = detectCardBrand(digits);
  if (!digits) e.number = 'Enter your card number';
  else if (!/^\d+$/.test(digits)) e.number = 'Card number can only contain digits';
  else if (!brand) e.number = 'Enter a valid Visa, Mastercard, RuPay or American Express card number';
  else if (!brand.lengths.includes(digits.length)) {
    const L = brand.lengths;
    e.number = `${brand.name} card numbers have ${L.length > 2 ? `${L[0]} to ${L[L.length - 1]}` : L.join(' or ')} digits`;
  } else if (!passesLuhn(digits)) e.number = 'This card number is not valid. Check the digits';
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(c.expiry.trim());
  if (!c.expiry.trim()) e.expiry = 'Enter the expiry date';
  else if (!m) e.expiry = 'Use the MM/YY format, e.g. 08/29';
  else {
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    const cy = now.getFullYear();
    const cm = now.getMonth() + 1;
    if (year < cy || (year === cy && month < cm)) e.expiry = 'This card has expired';
    else if (year > cy + 20) e.expiry = 'Enter a valid expiry year';
  }
  const need = brand?.cvv ?? 3;
  if (!c.cvv) e.cvv = 'Enter the CVV';
  else if (!new RegExp(`^\\d{${need}}$`).test(c.cvv)) e.cvv = need === 4 ? 'American Express CVV is 4 digits' : 'CVV must be 3 digits';
  return e;
}
