import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyFilters, DEFAULT_FILTERS } from './filters';
import { MOCK_BIKES } from './mock/bikes.mock';
import { MOCK_LOCATIONS } from './mock/locations.mock';
import { bikeLinks } from './links';
import { MOCK_REVIEWS } from './mock/reviews.mock';
import { computeQuote } from './pricing';
import { BIKE_NAME_MAX, EXTRAS } from './rules';
import type { RentalSchedule } from './types';
import { amountDueNow } from './pricing';
import { emptyPayment, isDemoDecline, luhnValid, normaliseMobile, sanitizeBikeName, sanitizeCardNumber, sanitizeExpiry, validateCustomer, validatePayment, validateSchedule } from './validation';

/** Fails the test with a clear message instead of using a non-null assertion. */
function must<T>(v: T | null | undefined, what = 'value'): T {
  if (v === null || v === undefined) throw new Error(`Expected ${what} to be defined`);
  return v;
}

const activa = must(MOCK_BIKES.find((b) => b.id === 'honda-activa-6g'), 'Activa'); // ₹70/hr, ₹450/day, min 4h
const sched = (over: Partial<RentalSchedule> = {}): RentalSchedule => ({
  pickupCity: 'Pune',
  pickupLocationId: 'pune-station',
  returnLocationId: 'pune-station',
  pickupDate: '2030-01-10',
  pickupTime: '10:00',
  returnDate: '2030-01-11',
  returnTime: '10:00',
  ...over,
});

describe('mock data', () => {
  it('references only known locations and has 3 images per bike', () => {
    const ids = new Set(MOCK_LOCATIONS.map((l) => l.id));
    for (const b of MOCK_BIKES) {
      expect(b.images).toHaveLength(3);
      for (const l of b.availability.locationIds) expect(ids.has(l)).toBe(true);
    }
  });
});

describe('computeQuote', () => {
  it('charges one day: ₹450 + 18% GST', () => {
    const q = must(computeQuote({ bike: activa, schedule: sched(), extras: [] }), 'quote');
    expect(q.rentalCharge).toBe(450);
    expect(q.tax).toBe(81);
    expect(q.total).toBe(531);
    expect(q.kmIncluded).toBe(100);
  });
  it('applies the minimum billable hours', () => {
    const q = must(computeQuote({ bike: activa, schedule: sched({ returnDate: '2030-01-10', returnTime: '11:00' }), extras: [] }), 'quote');
    expect(q.billableHours).toBe(4);
    expect(q.rentalCharge).toBe(280);
  });
  it('caps leftover hours at one day rate', () => {
    // 1 day 20 hours: 450 + min(20*70, 450) = 900
    const q = must(computeQuote({ bike: activa, schedule: sched({ returnDate: '2030-01-12', returnTime: '06:00' }), extras: [] }), 'quote');
    expect(q.rentalCharge).toBe(900);
  });
  it('gives 5% off at 3 days and 10% off at 7 days', () => {
    const three = must(computeQuote({ bike: activa, schedule: sched({ returnDate: '2030-01-13' }), extras: [] }), 'quote');
    expect(three.rentalCharge).toBe(1350);
    expect(three.discount).toBe(68); // round(67.5)
    const seven = must(computeQuote({ bike: activa, schedule: sched({ returnDate: '2030-01-17' }), extras: [] }), 'quote');
    expect(seven.discount).toBe(315);
  });
  it('adds per-day extras and the one-way fee before tax', () => {
    const helmet = must(EXTRAS.find((x) => x.id === 'helmet'), 'helmet extra');
    const q = must(computeQuote({ bike: activa, schedule: sched({ returnLocationId: 'pune-airport' }), extras: [helmet] }), 'quote');
    expect(q.extrasTotal).toBe(60);
    expect(q.oneWayFee).toBe(150);
    expect(q.subtotal).toBe(450 + 60 + 150);
  });
  it('returns null for a return before the pickup', () => {
    expect(computeQuote({ bike: activa, schedule: sched({ returnDate: '2030-01-09' }), extras: [] })).toBeNull();
  });
});

describe('computeQuote with an admin coupon', () => {
  const plain = must(computeQuote({ bike: activa, schedule: sched(), extras: [] }));
  it('takes the server-checked amount off the total after GST', () => {
    const q = must(computeQuote({ bike: activa, schedule: sched(), extras: [], coupon: { code: 'BIKE10', discount: 45 } }));
    expect(q.couponCode).toBe('BIKE10');
    expect(q.couponDiscount).toBe(45);
    expect(q.grossTotal).toBe(plain.total);
    expect(q.total).toBe(plain.total - 45);
    // Rental, tax and deposit are untouched.
    expect(q.tax).toBe(plain.tax);
    expect(q.deposit).toBe(plain.deposit);
  });
  it('never takes the total below one rupee and ignores a missing coupon', () => {
    expect(must(computeQuote({ bike: activa, schedule: sched(), extras: [], coupon: { code: 'BIG', discount: 999_999 } })).total).toBe(1);
    const none = must(computeQuote({ bike: activa, schedule: sched(), extras: [], coupon: null }));
    expect(none.total).toBe(plain.total);
    expect(none.couponCode).toBeNull();
    expect(none.couponDiscount).toBe(0);
  });
  it('charges the discounted total now, and nothing now for pay-at-pickup', () => {
    const q = must(computeQuote({ bike: activa, schedule: sched(), extras: [], coupon: { code: 'BIKE10', discount: 45 } }));
    expect(amountDueNow('upi', q)).toBe(plain.total - 45);
    expect(amountDueNow('pay-at-pickup', q)).toBe(0);
  });
});

describe('validateSchedule', () => {
  const now = new Date(2030, 0, 1, 9, 0);
  it('accepts a valid schedule', () => {
    expect(validateSchedule(sched(), 4, now)).toEqual({});
  });
  it('rejects past pickups, short rentals and over-long rentals', () => {
    expect(validateSchedule(sched({ pickupDate: '2029-12-31' }), 4, now).pickupTime).toBeTruthy();
    expect(validateSchedule(sched({ returnDate: '2030-01-10', returnTime: '12:00' }), 4, now).returnTime).toMatch(/Minimum/);
    expect(validateSchedule(sched({ returnDate: '2030-03-20' }), 4, now).returnDate).toMatch(/Maximum/);
    expect(validateSchedule(sched({ returnDate: '2030-01-10', returnTime: '09:00' }), 4, now).returnTime).toMatch(/after/);
  });
  it('requires every field', () => {
    const e = validateSchedule(sched({ pickupLocationId: '', pickupDate: '', returnTime: '' }), 4, now);
    expect(Object.keys(e).sort()).toEqual(['pickupDate', 'pickupLocationId', 'returnTime']);
  });
  it('requires a pickup city', () => {
    expect(validateSchedule(sched({ pickupCity: '' }), 4, now).pickupCity).toMatch(/city/);
  });
  it('city-only mode (search steps) does not ask for the areas yet', () => {
    const e = validateSchedule(sched({ pickupLocationId: '', returnLocationId: '' }), 4, now, { cityOnly: true });
    expect(e).toEqual({});
    expect(validateSchedule(sched({ pickupCity: '', pickupLocationId: '', returnLocationId: '' }), 4, now, { cityOnly: true }).pickupCity).toBeTruthy();
  });
});

describe('pickup cities and areas', () => {
  it('every hub belongs to a city and the cities include Pune, Mumbai, Bengaluru, Delhi and Hyderabad', () => {
    expect(MOCK_LOCATIONS.every((l) => l.city.length > 0)).toBe(true);
    const cities = new Set(MOCK_LOCATIONS.map((l) => l.city));
    for (const c of ['Pune', 'Mumbai', 'Bengaluru', 'Delhi', 'Hyderabad']) expect(cities.has(c)).toBe(true);
  });
  it('filters bikes to those stocked in the chosen city', () => {
    const inMumbai = applyFilters(MOCK_BIKES, { ...DEFAULT_FILTERS, pickupCity: 'Mumbai' }, MOCK_LOCATIONS);
    const mumbaiIds = new Set(MOCK_LOCATIONS.filter((l) => l.city === 'Mumbai').map((l) => l.id));
    expect(inMumbai.length).toBeGreaterThan(0);
    expect(inMumbai.every((b) => b.availability.locationIds.some((id) => mumbaiIds.has(id)))).toBe(true);
  });
  it('shows no bikes for a city without hubs', () => {
    expect(applyFilters(MOCK_BIKES, { ...DEFAULT_FILTERS, pickupCity: 'Atlantis' }, MOCK_LOCATIONS)).toEqual([]);
  });
});

describe('bike name limit', () => {
  it('cuts text to 20 characters and tidies spaces', () => {
    expect(BIKE_NAME_MAX).toBe(20);
    expect(sanitizeBikeName('Royal Enfield Classic 350 Signals')).toHaveLength(20);
    expect(sanitizeBikeName('   Activa    6G')).toBe('Activa 6G');
    expect(sanitizeBikeName('R15')).toBe('R15');
  });
});

describe('validateCustomer', () => {
  const ok = { fullName: 'Asha Patil', mobile: '9876543210', email: 'asha@example.com', licenceNumber: 'MH1220190012345', dateOfBirth: '1995-05-20', address: '12 MG Road, Pune' };
  it('accepts valid details', () => {
    expect(validateCustomer(ok, true, new Date(2030, 0, 1))).toEqual({});
  });
  it('flags each invalid field', () => {
    const e = validateCustomer({ fullName: '', mobile: '12345', email: 'nope', licenceNumber: 'X1', dateOfBirth: '2020-01-01', address: '' }, false, new Date(2030, 0, 1));
    expect(Object.keys(e).sort()).toEqual(['address', 'dateOfBirth', 'email', 'fullName', 'licenceNumber', 'mobile', 'terms']);
  });
  it('normalises Indian mobiles', () => {
    expect(normaliseMobile('+91 98765-43210')).toBe('9876543210');
    expect(normaliseMobile('5876543210')).toBeNull();
  });
});

describe('applyFilters', () => {
  it('searches by name or model', () => {
    expect(applyFilters(MOCK_BIKES, { ...DEFAULT_FILTERS, query: 'classic' }).map((b) => b.id)).toEqual(['royal-enfield-classic-350']);
    expect(applyFilters(MOCK_BIKES, { ...DEFAULT_FILTERS, query: 'zzz' })).toEqual([]);
  });
  it('filters by category, transmission, price and availability', () => {
    expect(applyFilters(MOCK_BIKES, { ...DEFAULT_FILTERS, categories: ['electric'] })).toHaveLength(2);
    expect(applyFilters(MOCK_BIKES, { ...DEFAULT_FILTERS, transmission: 'automatic' }).every((b) => b.transmission === 'automatic')).toBe(true);
    expect(applyFilters(MOCK_BIKES, { ...DEFAULT_FILTERS, maxDailyPrice: 500 }).every((b) => b.pricing.daily <= 500)).toBe(true);
    expect(applyFilters(MOCK_BIKES, { ...DEFAULT_FILTERS, onlyAvailable: true }).some((b) => b.availability.status === 'unavailable')).toBe(false);
  });
  it('filters by pickup location', () => {
    const r = applyFilters(MOCK_BIKES, { ...DEFAULT_FILTERS, pickupLocationId: 'hinjewadi' });
    expect(r.every((b) => b.availability.locationIds.includes('hinjewadi'))).toBe(true);
  });
});

describe('bike images', () => {
  const publicDir = path.resolve(__dirname, '../../../public');
  it('every image referenced by the mock data exists on disk as WebP', () => {
    for (const b of MOCK_BIKES) {
      for (const img of b.images) {
        expect(img.src.endsWith('.webp')).toBe(true);
        expect(existsSync(path.join(publicDir, img.src)), img.src).toBe(true);
      }
    }
  });
  it('the hero banner exists in both sizes', () => {
    for (const size of [1024, 1920]) expect(existsSync(path.join(publicDir, `assets/banners/bike-${size}.webp`))).toBe(true);
  });
});

describe('reviews and links', () => {
  it('reviews only reference known bikes and every bike has at least two', () => {
    const ids = new Set(MOCK_BIKES.map((b) => b.id));
    for (const r of MOCK_REVIEWS) expect(ids.has(r.bikeId)).toBe(true);
    for (const b of MOCK_BIKES) expect(MOCK_REVIEWS.filter((r) => r.bikeId === b.id).length).toBeGreaterThanOrEqual(2);
  });
  it('builds the landing, results, hubs and details URLs', () => {
    expect(bikeLinks.home()).toBe('/bikes');
    expect(bikeLinks.results()).toBe('/bikes/results');
    expect(bikeLinks.results('cat=sports')).toBe('/bikes/results?cat=sports');
    expect(bikeLinks.locations()).toBe('/bikes/locations');
    expect(bikeLinks.details('honda-activa-6g')).toBe('/bikes/honda-activa-6g');
  });
});

describe('category filter used by the landing tiles', () => {
  it('returns only bikes in the chosen category', () => {
    const out = applyFilters(MOCK_BIKES, { ...DEFAULT_FILTERS, categories: ['electric'] });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((b) => b.category === 'electric')).toBe(true);
  });
});

describe('booking flow links', () => {
  it('builds the booking, review, confirmation and bookings URLs', () => {
    expect(bikeLinks.book('honda-activa-6g')).toBe('/bikes/honda-activa-6g/book');
    expect(bikeLinks.review('honda-activa-6g')).toBe('/bikes/honda-activa-6g/review');
    expect(bikeLinks.payment('honda-activa-6g')).toBe('/bikes/honda-activa-6g/payment');
    expect(bikeLinks.confirmation('ZB-ABC234')).toBe('/bikes/confirmation/ZB-ABC234');
    expect(bikeLinks.bookings()).toBe('/bikes/bookings');
  });
});

describe('checkout validation', () => {
  const rider = { fullName: 'Rohan Deshmukh', mobile: '9876543210', email: 'rohan@example.com', licenceNumber: 'MH1220190012345', dateOfBirth: '1995-05-20', address: '12 FC Road, Shivajinagar, Pune' };

  it('only asks for the terms checkbox on the review step', () => {
    expect(validateCustomer(rider, true)).toEqual({});
    expect(validateCustomer(rider, false)).toEqual({ terms: 'Please accept the rental terms to continue' });
  });

  it('prices the selected add-ons into the booking total', () => {
    const extras = EXTRAS.filter((x) => x.id === 'helmet');
    const base = must(computeQuote({ bike: activa, schedule: sched(), extras: [] }), 'base quote');
    const withHelmet = must(computeQuote({ bike: activa, schedule: sched(), extras }), 'quote with helmet');
    expect(withHelmet.extrasTotal).toBe(60);
    expect(withHelmet.total).toBeGreaterThan(base.total);
  });
});

describe('demo payment', () => {
  const now = new Date(2026, 9, 13); // Oct 2026
  const card = { ...emptyPayment, cardNumber: '4242 4242 4242 4242', cardName: 'Rohan Deshmukh', expiry: '08/29', cvv: '123' };

  it('validates UPI, card and net banking inputs', () => {
    expect(validatePayment('upi', { ...emptyPayment, upiId: 'rohan@okaxis' }, now)).toEqual({});
    expect(validatePayment('upi', { ...emptyPayment, upiId: 'rohan' }, now).upiId).toBeDefined();
    expect(validatePayment('card', card, now)).toEqual({});
    expect(validatePayment('netbanking', emptyPayment, now).bank).toBeDefined();
    expect(validatePayment('netbanking', { ...emptyPayment, bank: 'HDFC Bank' }, now)).toEqual({});
    expect(validatePayment('pay-at-pickup', emptyPayment, now)).toEqual({});
  });

  it('rejects bad card numbers, expired cards and short CVVs', () => {
    expect(luhnValid('4242424242424242')).toBe(true);
    expect(luhnValid('4242424242424241')).toBe(false);
    expect(validatePayment('card', { ...card, cardNumber: '4242 4242 4242 4241' }, now).cardNumber).toBeDefined();
    expect(validatePayment('card', { ...card, expiry: '09/26' }, now).expiry).toBe('This card has expired');
    expect(validatePayment('card', { ...card, expiry: '10/26' }, now).expiry).toBeUndefined();
    expect(validatePayment('card', { ...card, expiry: '13/29' }, now).expiry).toBeDefined();
    expect(validatePayment('card', { ...card, cvv: '12' }, now).cvv).toBeDefined();
  });

  it('formats card number and expiry as the rider types', () => {
    expect(sanitizeCardNumber('4242a4242 42424242')).toBe('4242 4242 4242 4242');
    expect(sanitizeExpiry('0829')).toBe('08/29');
    expect(sanitizeExpiry('08')).toBe('08');
  });

  it('flags only the documented demo inputs as declined', () => {
    expect(isDemoDecline('card', { ...card, cardNumber: '4000 0000 0000 0002' })).toBe(true);
    expect(isDemoDecline('card', card)).toBe(false);
    expect(isDemoDecline('upi', { ...emptyPayment, upiId: 'FAIL@upi' })).toBe(true);
    expect(isDemoDecline('upi', { ...emptyPayment, upiId: 'rohan@okaxis' })).toBe(false);
  });

  it('charges the rental now online and nothing now for pay-at-pickup', () => {
    const q = must(computeQuote({ bike: activa, schedule: sched(), extras: [] }), 'quote');
    expect(amountDueNow('upi', q)).toBe(q.total);
    expect(amountDueNow('card', q)).toBe(q.total);
    expect(amountDueNow('pay-at-pickup', q)).toBe(0);
  });
});

