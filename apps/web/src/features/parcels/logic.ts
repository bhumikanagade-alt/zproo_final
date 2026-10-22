import {
  CITIES, GST_RATE, HANDLING, PARCEL_TYPES, PIN_PREFIX, SERVICES,
  type ServiceKey,
} from './data';

// ───────────────────────────── Types ─────────────────────────────

export interface ParcelRoute { from: string; to: string; w: string }

/** Form values are kept as strings (they come straight from inputs). */
export interface ParcelDetails {
  sn: string; sm: string; sa: string; sp: string;
  rn: string; rm: string; ra: string; rp: string;
  /** Index into PARCEL_TYPES. */
  type: number;
  val: string;
  l: string; wd: string; hh: string;
  d: string;
  /** Special handling flags, same order as HANDLING. */
  h: number[];
}

export interface PickupSlot { d: string; t: string }

export interface QuoteOption { k: ServiceKey; desc: string; price: number; days: number; off: boolean }
export interface Quote { cw: number; vol: number; opts: QuoteOption[] }

/** A coupon made in Admin → Marketing → Coupons that the server accepted. `discount` is in whole rupees. */
export interface ParcelCoupon { code: string; discount: number }

export interface Charges {
  o: QuoteOption;
  h: [label: string, amount: number][];
  gst: number;
  /** Delivery + handling + GST, before any coupon. This is the amount the coupon is checked against. */
  gross: number;
  /** Coupon discount in rupees (0 when there is none). */
  d: number;
  /** Code of the applied coupon, or null. */
  coupon: string | null;
  tot: number;
}

export interface ParcelBooking {
  id: string;
  title: string;
  sub: string;
  amt: number;
  st: 'Booked' | 'Delivered' | 'Cancelled';
  /** Index into TRACK_STEPS. */
  prog: number;
  svc: string;
  pm?: string;
  /** Admin coupon used on this booking, and what it took off (rupees). */
  coupon?: string;
  disc?: number;
  otp?: string;
  slot?: PickupSlot;
  notify?: number[];
  senderMobile?: string;
  reason?: string;
  rate?: number;
  fb?: string;
  snap?: { f: ParcelRoute; p: ParcelDetails };
}

// ───────────────────────────── Helpers ─────────────────────────────

export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
export const toPaise = (rupees: number) => Math.round(rupees * 100);

export const formatDay = (d: string | number | Date) =>
  new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** Local-date ISO string (YYYY-MM-DD), `n` days from today. */
export const dayIso = (n = 0, now = Date.now()) => {
  const d = new Date(now + n * 864e5);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const cityFromPin = (pin: string): string | null => (pin.length >= 3 ? (PIN_PREFIX[pin.slice(0, 3)] ?? null) : null);

// ───────────────────────────── Validation ─────────────────────────────

/** Indian mobile: exactly 10 digits, first digit 7, 8 or 9 (the +91 country code is shown separately). */
export const isMobile = (v: string) => /^[789]\d{9}$/.test(v);
/** Letters (any language), spaces and . ' - only. At least 2 letters, no digits or symbols. */
export const isName = (v: string) => /^\p{L}[\p{L} .'-]*$/u.test(v) && (v.match(/\p{L}/gu)?.length ?? 0) >= 2 && v.length <= 60;
/** At least 8 characters, contains a letter, and is not just digits/punctuation. */
export const isAddress = (v: string) => v.trim().length >= 8 && v.trim().length <= 150 && /\p{L}/u.test(v);
export const isPin = (v: string) => /^[1-9]\d{5}$/.test(v);
export const isUpi = (v: string) => /^[\w.-]+@\w+$/.test(v);
export const isWeight = (v: string | number) => Number(v) > 0 && Number(v) <= 50;
export const isDim = (v: string | number) => Number(v) > 0 && Number(v) <= 150;

// ── Input sanitisers: used while typing so the wrong kind of character never lands in the field. ──

/** Keep only letters, spaces and . ' - (no numbers or symbols). */
export const sanitizeName = (v: string) => v.replace(/[^\p{L} .'-]/gu, '').replace(/^[^\p{L}]+/u, '').replace(/\s{2,}/g, ' ').slice(0, 60);
/**
 * Keep only digits, max 10. A pasted "+91 98765 43210", "91…" (12 digits) or "0…" (11 digits) has the
 * country code / trunk zero removed, because "+91" is already shown in front of the field.
 */
export function sanitizeMobile(v: string): string {
  let d = v.replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  else if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
}
export const sanitizePin = (v: string) => v.replace(/\D/g, '').slice(0, 6);
export const sanitizeAddress = (v: string) => v.replace(/[^\p{L}\p{N} ,./#()'&:\-\n]/gu, '').replace(/\s{2,}/g, ' ').slice(0, 150);
export const MOBILE_ERROR = 'Enter correct mobile number';

export type FieldErrors = Record<string, string>;
export type PartyField = 'sn' | 'sm' | 'sa' | 'sp' | 'rn' | 'rm' | 'ra' | 'rp';

/** Error message for one sender/receiver field, or '' when valid. */
export function partyFieldError(k: PartyField, raw: string): string {
  const v = raw.trim();
  const who = k[0] === 's' ? 'sender' : 'receiver';
  switch (k) {
    case 'sn': case 'rn':
      if (!v) return `Enter the ${who} name`;
      if (/[^\p{L} .'-]/u.test(v)) return 'Name can contain letters only (no numbers or symbols)';
      if (!isName(v)) return 'Enter the full name (at least 2 letters)';
      return '';
    case 'sm': case 'rm':
      return isMobile(v) ? '' : MOBILE_ERROR;
    case 'sa': case 'ra':
      if (!v) return `Enter the full ${k === 'sa' ? 'pickup' : 'delivery'} address`;
      if (v.length < 8) return 'Address is too short (at least 8 characters)';
      if (!/\p{L}/u.test(v)) return 'Address must include house / street name, not only numbers';
      return '';
    case 'sp': case 'rp':
      if (!v) return 'Enter the 6-digit pincode';
      if (/\D/.test(v)) return 'Pincode can contain digits only';
      if (v.length !== 6) return 'Pincode must be exactly 6 digits';
      return isPin(v) ? '' : 'Enter correct pincode (cannot start with 0)';
  }
}

export function validateParties(p: ParcelDetails): FieldErrors {
  const e: FieldErrors = {};
  (['sn', 'sm', 'sa', 'sp', 'rn', 'rm', 'ra', 'rp'] as const).forEach((k) => {
    const m = partyFieldError(k, p[k]);
    if (m) e[k] = m;
  });
  return e;
}

export function validateInfo(f: ParcelRoute, p: ParcelDetails, slot: PickupSlot, now = Date.now()): FieldErrors {
  const e: FieldErrors = {};
  if (!isWeight(f.w)) e.pw = 'Enter a weight between 0.1 and 50 kg';
  if (!isDim(p.l)) e.pl = '1 to 150 cm';
  if (!isDim(p.wd)) e.pwd = '1 to 150 cm';
  if (!isDim(p.hh)) e.ph = '1 to 150 cm';
  if (!(slot.d >= dayIso(0, now) && slot.d <= dayIso(7, now))) e.pdt = 'Choose a date within the next 7 days';
  if (p.d.trim().length < 3) e.pd = 'Describe what is inside the package';
  return e;
}

// ───────────────────────────── Pricing (mock rate service) ─────────────────────────────

/** Pure rate calculation. Replace with a real courier-rate API response when available. */
export function computeQuote(f: ParcelRoute, p: Pick<ParcelDetails, 'l' | 'wd' | 'hh'>): Quote {
  const i = CITIES.indexOf(f.from as (typeof CITIES)[number]);
  const j = CITIES.indexOf(f.to as (typeof CITIES)[number]);
  const same = i === j;
  const zone = same ? 1 : 2 + (Math.abs(i - j) % 3);
  const vol = (Number(p.l) * Number(p.wd) * Number(p.hh)) / 5000;
  const cw = Math.max(Number(f.w), vol);
  const base = Math.round(40 + cw * 26 + zone * 14);
  return {
    cw: +cw.toFixed(2),
    vol: +vol.toFixed(2),
    opts: SERVICES.map((s) => ({
      k: s.k,
      desc: s.desc,
      price: Math.round(base * s.m),
      days: s.k === 'Same-day' ? 0 : Math.max(1, zone - (s.k === 'Express' ? 1 : 0)),
      off: s.k === 'Same-day' && !same,
    })),
  };
}

/** Simulated network call. Add `?fail` to the URL to see the error state (Retry then succeeds). */
let rateServiceRecovered = false;
export const markRateServiceRecovered = () => { rateServiceRecovered = true; };
export async function fetchQuote(f: ParcelRoute, p: ParcelDetails, delayMs = 650): Promise<Quote> {
  await new Promise((r) => setTimeout(r, delayMs));
  if (typeof location !== 'undefined' && /fail/.test(location.search) && !rateServiceRecovered) {
    throw new Error('Rate service unavailable');
  }
  return computeQuote(f, p);
}

/** The service the customer picked, falling back to the first one that is available. */
export const selectedOption = (q: Quote | null | undefined, svc: string): QuoteOption | null =>
  q ? (q.opts.find((o) => o.k === svc && !o.off) ?? q.opts.find((o) => !o.off) ?? null) : null;

/**
 * Charges for the chosen service. `coupon` is a coupon the server has already accepted (see `useParcelCoupon`); its
 * discount comes off the gross amount (delivery + handling + GST) and the total never goes below ₹1.
 */
export function computeCharges(q: Quote | null | undefined, svc: string, p: ParcelDetails, coupon: ParcelCoupon | null): Charges | null {
  const o = selectedOption(q, svc);
  if (!o) return null;
  const h = HANDLING
    .map((x, i): [string, number] | null =>
      p.h[i] ? (i === 1 ? ['Insurance', Math.round(40 + (Number(p.val) || 0) * 0.01)] : [x[0].split(' -')[0]!, x[1]]) : null)
    .filter((x): x is [string, number] => !!x && x[1] > 0);
  const sub = o.price + h.reduce((a, x) => a + x[1], 0);
  const gst = Math.round(sub * GST_RATE);
  const gross = sub + gst;
  const d = coupon ? Math.max(0, Math.min(Math.floor(coupon.discount), gross - 1)) : 0;
  return { o, h, gst, gross, d, coupon: coupon && d > 0 ? coupon.code : null, tot: gross - d };
}

// ───────────────────────────── Bookings ─────────────────────────────

export function newBookingId(existing: Set<string>, rand: () => number = Math.random): string {
  let id: string;
  do id = 'ZPG-PRC-' + Math.floor(1e5 + rand() * 9e5); while (existing.has(id));
  return id;
}
export const newOtp = (rand: () => number = Math.random) => String(Math.floor(1e3 + rand() * 9e3));

export function createBooking(args: {
  route: ParcelRoute; p: ParcelDetails; charges: Charges; slot: PickupSlot; notify: number[]; pm: string;
  existingIds: Set<string>; rand?: () => number;
  /** Booking ID chosen earlier (the coupon use is recorded against it). A new one is made when missing. */
  id?: string;
}): ParcelBooking {
  const { route, p, charges, slot, notify, pm, existingIds, rand, id } = args;
  return {
    id: id ?? newBookingId(existingIds, rand),
    title: `${route.from} → ${route.to}`,
    sub: `${PARCEL_TYPES[p.type]} · ${route.w} kg · to ${p.rn}`,
    amt: charges.tot,
    ...(charges.coupon ? { coupon: charges.coupon, disc: charges.d } : {}),
    st: 'Booked',
    prog: 0,
    svc: charges.o.k,
    pm,
    otp: newOtp(rand),
    slot: { ...slot },
    notify: [...notify],
    senderMobile: p.sm,
    snap: { f: { ...route }, p: JSON.parse(JSON.stringify(p)) as ParcelDetails },
  };
}

export const canCancel = (b: ParcelBooking) => b.st === 'Booked' && b.prog < 2;
export const isActive = (b: ParcelBooking) => b.st === 'Booked';

export function advance(b: ParcelBooking): ParcelBooking {
  if (b.st !== 'Booked' || b.prog >= 4) return b;
  const prog = b.prog + 1;
  return { ...b, prog, st: prog === 4 ? 'Delivered' : b.st };
}
export const cancelParcel = (b: ParcelBooking, reason: string): ParcelBooking => ({ ...b, st: 'Cancelled', reason });
export const rateParcel = (b: ParcelBooking, stars: number, fb: string): ParcelBooking => ({ ...b, rate: stars, fb });

export function receiptText(b: ParcelBooking): string {
  return `ZPROO GO PARCEL RECEIPT\nID: ${b.id}\n${b.title}\n${b.sub}\nService: ${b.svc}\n${b.coupon ? `Coupon ${b.coupon}: -${inr(b.disc ?? 0)}\n` : ''}Paid: ${inr(b.amt)}\n(Sample receipt - mock data)`;
}

export function filterBookings(list: ParcelBooking[], tab: 'Active' | 'Delivered' | 'Cancelled', query: string): ParcelBooking[] {
  const q = query.trim().toLowerCase();
  return list.filter((b) => (tab === 'Active' ? b.st === 'Booked' : b.st === tab) && (!q || (b.id + b.title + b.sub).toLowerCase().includes(q)));
}

/** Rough "from" price shown on the home page before the full quote. */
export function estimateFrom(from: string, to: string, w: number): { price: number; days: number } | null {
  if (!(w > 0 && w <= 50)) return null;
  const i = CITIES.indexOf(from as (typeof CITIES)[number]);
  const j = CITIES.indexOf(to as (typeof CITIES)[number]);
  const z = i === j ? 1 : 2 + (Math.abs(i - j) % 3);
  return { price: 40 + w * 26 + z * 14, days: z };
}

export const SEED_BOOKINGS: ParcelBooking[] = [
  { id: 'ZPG-PRC-482113', title: 'Delhi → Jaipur', sub: 'Documents · 0.5 kg', amt: 118, st: 'Delivered', prog: 4, svc: 'Standard' },
];

export const emptyDetails = (): ParcelDetails => ({
  sn: '', sm: '', sa: '', sp: '', rn: '', rm: '', ra: '', rp: '',
  type: 2, val: '', l: '30', wd: '20', hh: '15', d: '', h: [1, 0, 1],
});
