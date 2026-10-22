import { COUPONS, LOCATIONS, VEHICLES } from './data';
import type {
  CabBooking,
  Coupon,
  FareBreakdown,
  RouteEstimate,
  Vehicle,
  VehicleId,
} from './types';

export const PLATFORM_FEE = 10;
export const TAX_RATE = 0.05;
export const CANCEL_FEE = 30;
/** Rides cancelled more than this many minutes before pickup are free to cancel. */
export const FREE_CANCEL_MINUTES = 30;

export const getVehicle = (id: VehicleId): Vehicle => {
  const v = VEHICLES.find((x) => x.id === id);
  if (!v) throw new Error(`Unknown vehicle ${id}`);
  return v;
};

const norm = (s: string) => s.trim().toLowerCase();

export function findLocation(text: string) {
  const t = norm(text);
  if (!t) return undefined;
  return LOCATIONS.find((l) => norm(l.name) === t) ?? LOCATIONS.find((l) => norm(`${l.name}, ${l.area}`) === t);
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Deterministic, simulated route estimate (not real road routing). Known places use straight-line
 * distance x 1.3; free-text places fall back to a stable pseudo-distance so results never flicker.
 */
export function estimateRoute(pickup: string, drop: string): RouteEstimate {
  const a = findLocation(pickup);
  const b = findLocation(drop);
  let km: number;
  if (a && b) km = Math.max(1, haversineKm(a, b) * 1.3);
  else km = 3 + (hash(`${norm(pickup)}>${norm(drop)}`) % 280) / 10;
  km = Math.round(km * 10) / 10;
  return { km, minutes: Math.max(5, Math.round((km / 27) * 60)) };
}

export const routeKey = (d: { pickup: string; drop: string }) => `${norm(d.pickup)}>${norm(d.drop)}`;

export const RENTAL_KM_PER_HOUR = 12;
export const RENTAL_PACKAGES = [2, 4, 8, 12] as const;
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Distance/time used for fares. Real road distance when the map has measured it for these exact places,
 * else the local estimate. Round trips are billed both ways plus one hour of waiting; hourly rentals are
 * billed on the package (hours and the kilometres included per hour), not on pickup/drop.
 */
export function routeFor(d: {
  pickup: string; drop: string; routeInfo?: { key: string; km: number; minutes: number } | null;
  mode?: import('./types').RideMode; rentalHours?: number | undefined;
}): RouteEstimate {
  if (d.mode === 'rental') {
    const h = d.rentalHours ?? 4;
    return { km: h * RENTAL_KM_PER_HOUR, minutes: h * 60 };
  }
  const r = d.routeInfo;
  const one = r && r.key === routeKey(d) ? { km: r.km, minutes: r.minutes } : estimateRoute(d.pickup, d.drop);
  if (d.mode === 'round-trip') return { km: round1(one.km * 2), minutes: one.minutes * 2 + 60 };
  return one;
}

/** 4-digit ride OTP the passenger shares with the driver to start the trip. Stable per booking. */
export function otpFor(reference: string) {
  return String(1000 + (hash(`otp:${reference}`) % 9000));
}

export function validateCoupon(
  code: string,
  subtotal: number,
): { ok: true; coupon: Coupon } | { ok: false; reason: string } {
  const c = code.trim().toUpperCase();
  if (!c) return { ok: false, reason: 'Enter a coupon code' };
  const coupon = COUPONS.find((x) => x.code === c);
  if (!coupon) return { ok: false, reason: 'This coupon code is not valid' };
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal)
    return { ok: false, reason: `Valid on fares of ₹${coupon.minSubtotal} or more` };
  return { ok: true, coupon };
}

export function couponDiscount(coupon: Coupon, subtotal: number) {
  const raw = coupon.kind === 'flat' ? coupon.value : Math.round((subtotal * coupon.value) / 100);
  return Math.min(raw, coupon.maxDiscount ?? raw, subtotal);
}

/** Single source of truth for every fare shown in the flow. */
export function calcFare(
  vehicle: Vehicle,
  route: RouteEstimate,
  couponCode?: string | null,
  /**
   * Whole rupees taken off by a coupon made in the admin panel (already checked by the server against this fare).
   * When given, it replaces the built-in code lookup; it never takes the total below ₹1.
   */
  adminDiscount?: number | null,
): FareBreakdown {
  const base = vehicle.baseFare;
  const distance = Math.round(vehicle.perKm * route.km);
  const time = Math.round(vehicle.perMin * route.minutes);
  const subtotal = base + distance + time + PLATFORM_FEE;
  const taxes = Math.round(subtotal * TAX_RATE);
  let discount = 0;
  if (couponCode && typeof adminDiscount === 'number') {
    discount = Math.max(0, Math.min(Math.floor(adminDiscount), subtotal + taxes - 1));
  } else if (couponCode) {
    const r = validateCoupon(couponCode, subtotal);
    if (r.ok) discount = couponDiscount(r.coupon, subtotal);
  }
  return { base, distance, time, platform: PLATFORM_FEE, taxes, discount, total: subtotal + taxes - discount };
}

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const subtotalOf = (f: FareBreakdown) => f.base + f.distance + f.time + f.platform;

export function canCancel(b: Pick<CabBooking, 'status'>) {
  return b.status === 'upcoming';
}

export function cancellationFee(b: Pick<CabBooking, 'status' | 'scheduledAt' | 'fare'>, now = Date.now()) {
  if (!canCancel(b)) return 0;
  const minutesLeft = (b.scheduledAt - now) / 60_000;
  return minutesLeft > FREE_CANCEL_MINUTES ? 0 : Math.min(CANCEL_FEE, b.fare.total);
}

export function generateReference(existing: ReadonlySet<string>, rand: () => number = Math.random) {
  for (let i = 0; i < 1000; i += 1) {
    const ref = `ZPROO${String(100000 + Math.floor(rand() * 900000))}`;
    if (!existing.has(ref)) return ref;
  }
  throw new Error('Could not generate a unique booking reference');
}

export function scheduledTimestamp(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0).getTime();
}

export function formatWhen(date: string, time: string) {
  const d = new Date(scheduledTimestamp(date, time));
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · ${time}`;
}
