import { describe, expect, it } from 'vitest';
import { advanceStage, cancelBooking, createBooking, rateBooking, simulatePayment } from './bookingLogic';
import { initialDraft } from './store';
import { calcFare, RENTAL_KM_PER_HOUR, cancellationFee, estimateRoute, getVehicle, otpFor, routeFor, subtotalOf, validateCoupon } from './fare';
import { normaliseMobile, sanitizeMobile, sanitizeName, validatePassenger, validateSearch } from './validation';
import { makeQr } from './qr';
import { buildUpiLink } from './upi';
import type { CabBooking } from './types';

const NOW = new Date(2026, 9, 12, 10, 0).getTime();
const base = { pickup: 'Phoenix Mall, Viman Nagar', drop: 'Shivajinagar Railway Station', date: '2026-10-12', time: '18:00', passengers: 1 };

function draft() {
  return { ...initialDraft(), ...base, vehicleId: 'sedan' as const, passenger: { ...initialDraft().passenger, name: 'Asha Rao', mobile: '9876543210' } };
}
const book = (over: Partial<CabBooking> = {}): CabBooking => ({ ...createBooking(draft(), new Set(), NOW), ...over });

describe('search validation', () => {
  it('requires pickup and drop', () => {
    const e = validateSearch({ ...base, pickup: '', drop: '' }, NOW);
    expect(e.pickup).toBeTruthy();
    expect(e.drop).toBeTruthy();
  });
  it('rejects same pickup and drop', () => {
    expect(validateSearch({ ...base, drop: ' phoenix mall, viman nagar ' }, NOW).drop).toMatch(/different/);
  });
  it('rejects past times and accepts a valid search', () => {
    expect(validateSearch({ ...base, time: '08:00' }, NOW).time).toBeTruthy();
    expect(validateSearch(base, NOW)).toEqual({});
  });
});

describe('passenger validation', () => {
  it('normalises Indian mobiles', () => {
    expect(normaliseMobile('+91 98765-43210')).toBe('9876543210');
    expect(normaliseMobile('12345')).toBeNull();
    expect(normaliseMobile('5876543210')).toBeNull();
  });
  it('flags an invalid phone and email', () => {
    const e = validatePassenger({ name: 'A', mobile: '123', email: 'x' });
    expect(Object.keys(e).sort()).toEqual(['email', 'mobile', 'name']);
    expect(validatePassenger({ name: 'Asha Rao', mobile: '9876543210', email: '' })).toEqual({});
  });
});

describe('fare', () => {
  const route = { km: 12.6, minutes: 28 };
  it('is consistent: total = subtotal + taxes - discount', () => {
    const f = calcFare(getVehicle('sedan'), route, 'ZPROO10');
    expect(f.total).toBe(subtotalOf(f) + f.taxes - f.discount);
    expect(f.discount).toBe(10);
  });
  it('recalculates when the vehicle changes', () => {
    expect(calcFare(getVehicle('suv'), route).total).toBeGreaterThan(calcFare(getVehicle('mini'), route).total);
  });
  it('route estimate is deterministic and symmetric inputs differ from none', () => {
    expect(estimateRoute(base.pickup, base.drop)).toEqual(estimateRoute(base.pickup, base.drop));
    expect(estimateRoute('abc', 'xyz')).toEqual(estimateRoute('abc', 'xyz'));
  });
  it('validates coupons', () => {
    expect(validateCoupon('zproo10', 100).ok).toBe(true);
    expect(validateCoupon('NOPE', 100).ok).toBe(false);
    expect(validateCoupon('CAB50', 100).ok).toBe(false);
    expect(validateCoupon('', 100).ok).toBe(false);
    expect(validateCoupon('RIDE15', 100).ok).toBe(true);
    expect(validateCoupon('CAB150', 1000).ok).toBe(false);
    expect(validateCoupon('CAB150', 1600).ok).toBe(true);
    const f = calcFare(getVehicle('premium'), route, 'FIRST20');
    expect(f.discount).toBeLessThanOrEqual(60);
  });
});

describe('admin coupons on a cab fare', () => {
  const v = getVehicle('sedan');
  const r = { km: 12, minutes: 30 };
  it('uses the amount the server gave instead of the built-in lookup', () => {
    const plain = calcFare(v, r);
    const f = calcFare(v, r, 'RIDE20', 40);
    expect(f.discount).toBe(40);
    expect(f.total).toBe(plain.total - 40);
    expect(f.total).toBe(subtotalOf(f) + f.taxes - f.discount);
  });
  it('never takes the total below one rupee and ignores the amount when no coupon is applied', () => {
    const plain = calcFare(v, r);
    expect(calcFare(v, r, 'BIG', 999_999).total).toBe(1);
    expect(calcFare(v, r, null, 40).discount).toBe(0);
    expect(calcFare(v, r, 'ZPROO10', null).discount).toBe(10);
    expect(plain.discount).toBe(0);
  });
  it('carries the discount into the booking', () => {
    const draft = { ...initialDraft(), pickup: 'Pune', drop: 'Mumbai', vehicleId: 'sedan' as const, couponCode: 'RIDE20', couponDiscount: 40 };
    const b = createBooking(draft, new Set(), 0, undefined, 'ZPROO424242');
    expect(b.reference).toBe('ZPROO424242');
    expect(b.couponCode).toBe('RIDE20');
    expect(b.fare.discount).toBe(40);
  });
});

describe('route and otp', () => {
  it('uses the measured road distance only for the matching places', () => {
    const d = { pickup: 'A', drop: 'B', routeInfo: { key: 'a>b', km: 9.9, minutes: 21 } };
    expect(routeFor(d)).toEqual({ km: 9.9, minutes: 21 });
    expect(routeFor({ ...d, drop: 'C' })).toEqual(estimateRoute('A', 'C'));
  });
  it('gives a stable 4-digit OTP per booking', () => {
    expect(otpFor('ZPROO123456')).toMatch(/^\d{4}$/);
    expect(otpFor('ZPROO123456')).toBe(otpFor('ZPROO123456'));
  });
});

describe('booking lifecycle', () => {
  it('creates unique references and an upcoming booking', () => {
    const a = book();
    const refs = new Set([a.reference]);
    expect(a.reference).toMatch(/^ZPROO\d{6}$/);
    expect(createBooking(draft(), refs, NOW).reference).not.toBe(a.reference);
    expect(a.status).toBe('upcoming');
    expect(a.fare.total).toBe(calcFare(getVehicle('sedan'), a.route).total);
  });
  it('refuses to book without a vehicle', () => {
    expect(() => createBooking({ ...draft(), vehicleId: null }, new Set(), NOW)).toThrow();
  });
  it('cancels an eligible booking, free when far ahead and with a fee when close', () => {
    const far = book({ scheduledAt: NOW + 3 * 3_600_000 });
    expect(cancellationFee(far, NOW)).toBe(0);
    const near = book({ scheduledAt: NOW + 10 * 60_000 });
    expect(cancellationFee(near, NOW)).toBe(30);
    const c = cancelBooking(near, 'Change of plans', '', NOW);
    expect(c.status).toBe('cancelled');
    expect(c.cancellation?.fee).toBe(30);
  });
  it('cannot cancel completed, ongoing or cancelled rides', () => {
    for (const status of ['completed', 'ongoing', 'cancelled'] as const)
      expect(() => cancelBooking(book({ status }), 'x', '', NOW)).toThrow();
  });
  it('advances through tracking stages and completes consistently', () => {
    let b = book();
    for (let i = 0; i < 8; i += 1) b = advanceStage(b);
    expect(b.stage).toBe('completed');
    expect(b.status).toBe('completed');
    expect(rateBooking(b, 5, 'Great').rating?.stars).toBe(5);
    expect(() => rateBooking(book(), 5, '')).toThrow();
  });
  it('simulated payment resolves to the chosen outcome', async () => {
    for (const o of ['success', 'failed', 'cancelled'] as const) expect(await simulatePayment(o, 0)).toBe(o);
  });
});


describe('passenger input filters', () => {
  it('names drop digits and symbols', () => { expect(sanitizeName('Asha 123 Rao@#')).toBe('Asha Rao'); expect(sanitizeName("D'Souza-Rao")).toBe("D'Souza-Rao"); });
  it('mobile keeps 10 digits and drops +91 prefix', () => {
    expect(sanitizeMobile('98ab76-54 3210')).toBe('9876543210');
    expect(sanitizeMobile('+91 98765 43210')).toBe('9876543210');
    expect(sanitizeMobile('919876543210')).toBe('9876543210');
    expect(sanitizeMobile('98765432109999')).toBe('9876543210');
    expect(sanitizeMobile('9123456789')).toBe('9123456789');
  });
  it('rejects numbers in names and bad emails', () => {
    expect(validatePassenger({ name: 'Asha9', mobile: '9876543210', email: '' }).name).toBeTruthy();
    expect(validatePassenger({ name: 'Asha', mobile: '9876543210', email: 'a@b' }).email).toBeTruthy();
    expect(validatePassenger({ name: 'Asha', mobile: '9876543210', email: 'a@b.co' })).toEqual({});
  });
});

describe('UPI QR', () => {
  it('builds a link and a square matrix', () => {
    const link = buildUpiLink({ amount: 250, note: 'Zproo Go cab ride' });
    expect(link).toContain('pa=nakshtra25k@okicici');
    expect(link).toContain('am=250.00');
    const m = makeQr(link);
    expect(m.length).toBe(m[0]!.length);
  });
});

describe('ride modes', () => {
  const base = { pickup: 'Pune Airport', drop: 'Mumbai CSMT', date: '2099-01-01', time: '10:00', passengers: 2 };
  it('round trip bills both ways and needs a return', () => {
    const one = routeFor({ pickup: 'Pune Airport', drop: 'Mumbai CSMT', mode: 'one-way' });
    const two = routeFor({ pickup: 'Pune Airport', drop: 'Mumbai CSMT', mode: 'round-trip' });
    expect(two.km).toBeCloseTo(one.km * 2, 0);
    expect(validateSearch({ ...base, mode: 'round-trip' }, 0).returnDate).toBeTruthy();
    expect(validateSearch({ ...base, mode: 'round-trip', returnDate: '2099-01-02', returnTime: '18:00' }, 0)).toEqual({});
    expect(validateSearch({ ...base, mode: 'round-trip', returnDate: '2098-12-31', returnTime: '18:00' }, 0).returnDate).toBeTruthy();
  });
  it('rental uses the package and needs no drop', () => {
    expect(routeFor({ pickup: 'A', drop: 'A', mode: 'rental', rentalHours: 8 })).toEqual({ km: 8 * RENTAL_KM_PER_HOUR, minutes: 480 });
    expect(validateSearch({ ...base, drop: '', mode: 'rental', rentalHours: 4 }, 0)).toEqual({});
  });
  it('airport transfer needs an airport on the right side', () => {
    expect(validateSearch({ ...base, pickup: 'Koregaon Park', drop: 'Mumbai CSMT', mode: 'airport', airportDir: 'to' }, 0).drop).toBeTruthy();
    expect(validateSearch({ ...base, pickup: 'Koregaon Park', drop: 'Pune Airport', mode: 'airport', airportDir: 'to' }, 0)).toEqual({});
  });
});
