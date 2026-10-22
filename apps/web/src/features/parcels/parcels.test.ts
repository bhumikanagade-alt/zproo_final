import { describe, expect, it } from 'vitest';
import {
  advance, canCancel, cancelParcel, cityFromPin, computeCharges, computeQuote, createBooking, dayIso, emptyDetails,
  estimateFrom, filterBookings, inr, isMobile, isName, isPin, isUpi, newBookingId, newOtp, partyFieldError, rateParcel, receiptText,
  sanitizeMobile, sanitizeName, sanitizePin, selectedOption, toPaise, validateInfo, validateParties, type ParcelBooking, type ParcelDetails,
} from './logic';

const NOW = new Date(2026, 9, 13, 10, 0).getTime();
const route = { from: 'Pune', to: 'Mumbai', w: '2.5' };
const filled = (): ParcelDetails => ({
  ...emptyDetails(), sn: 'Asha Rao', sm: '9876543210', sa: '12 MG Road, Camp', sp: '411001',
  rn: 'Vikram Shah', rm: '9123456780', ra: '5 Marine Drive, Colaba', rp: '400001', d: 'Laptop',
});
const seq = (...n: number[]) => { let i = 0; return () => n[i++ % n.length]!; };

describe('quote', () => {
  it('prices Pune → Mumbai 2.5 kg like the prototype', () => {
    const q = computeQuote(route, emptyDetails());
    expect(q.cw).toBe(2.5);
    expect(q.vol).toBe(1.8);
    expect(q.opts.map((o) => [o.k, o.price, o.days, o.off])).toEqual([
      ['Standard', 147, 3, false], ['Express', 221, 2, false], ['Same-day', 323, 0, true],
    ]);
  });
  it('charges on volumetric weight when it is larger', () => {
    const q = computeQuote({ ...route, w: '1' }, { ...emptyDetails(), l: '50', wd: '40', hh: '30' });
    expect(q.vol).toBe(12);
    expect(q.cw).toBe(12);
  });
  it('allows same-day only inside one city', () => {
    const q = computeQuote({ from: 'Pune', to: 'Pune', w: '1' }, emptyDetails());
    expect(q.opts.find((o) => o.k === 'Same-day')!.off).toBe(false);
  });
  it('falls back to the first available option', () => {
    const q = computeQuote(route, emptyDetails());
    expect(selectedOption(q, 'Same-day')!.k).toBe('Standard');
    expect(selectedOption(null, 'Standard')).toBeNull();
  });
  it('gives a home-page estimate only for valid weights', () => {
    expect(estimateFrom('Pune', 'Mumbai', 2.5)!.days).toBe(3);
    expect(estimateFrom('Pune', 'Mumbai', 0)).toBeNull();
    expect(estimateFrom('Pune', 'Mumbai', 51)).toBeNull();
  });
});

describe('charges', () => {
  const q = computeQuote(route, emptyDetails());
  it('adds fragile handling and 18% GST', () => {
    const c = computeCharges(q, 'Standard', emptyDetails(), null)!;
    expect(c.h).toEqual([['Fragile', 30]]);
    expect(c.gst).toBe(32);
    expect(c.tot).toBe(209);
  });
  it('prices insurance from the declared value', () => {
    const c = computeCharges(q, 'Standard', { ...emptyDetails(), h: [1, 1, 1], val: '20000' }, null)!;
    expect(c.h).toContainEqual(['Insurance', 240]);
    expect(c.d).toBe(0);
    expect(c.coupon).toBeNull();
    expect(c.tot).toBe(c.gross);
  });
  it('returns null without a quote', () => {
    expect(computeCharges(null, 'Standard', emptyDetails(), null)).toBeNull();
  });
  it('takes an admin coupon off the gross amount (delivery + handling + GST)', () => {
    const c = computeCharges(q, 'Standard', emptyDetails(), { code: 'PARCEL10', discount: 21 })!;
    expect(c.gross).toBe(209);
    expect(c).toMatchObject({ d: 21, coupon: 'PARCEL10', tot: 188 });
  });
  it('never lets a coupon take the total below ₹1', () => {
    const c = computeCharges(q, 'Standard', emptyDetails(), { code: 'BIG', discount: 5000 })!;
    expect(c).toMatchObject({ d: 208, tot: 1 });
  });
  it('ignores a zero or negative coupon amount', () => {
    expect(computeCharges(q, 'Standard', emptyDetails(), { code: 'ZERO', discount: 0 })).toMatchObject({ d: 0, coupon: null, tot: 209 });
    expect(computeCharges(q, 'Standard', emptyDetails(), { code: 'NEG', discount: -5 })).toMatchObject({ d: 0, coupon: null, tot: 209 });
  });
  it('keeps the coupon on the booking, its receipt and the ID it was redeemed against', () => {
    const charges = computeCharges(q, 'Standard', filled(), { code: 'PARCEL10', discount: 21 })!;
    const b = createBooking({
      route, p: filled(), charges, slot: { d: dayIso(1, NOW), t: 'Morning' }, notify: [1, 0], pm: 'UPI',
      existingIds: new Set(), id: 'ZPG-PRC-123456',
    });
    expect(b).toMatchObject({ id: 'ZPG-PRC-123456', coupon: 'PARCEL10', disc: 21, amt: 188 });
    expect(receiptText(b)).toContain('Coupon PARCEL10: -₹21');
  });
});

describe('validation', () => {
  it('accepts a complete sender and receiver', () => {
    expect(validateParties(filled())).toEqual({});
  });
  it('flags every bad field', () => {
    expect(Object.keys(validateParties(emptyDetails())).sort()).toEqual(['ra', 'rm', 'rn', 'rp', 'sa', 'sm', 'sn', 'sp']);
  });
  it('validates mobile, pin and UPI', () => {
    expect(isMobile('5876543210')).toBe(false);
    expect(isMobile('9876543210')).toBe(true);
    expect(isPin('011001')).toBe(false);
    expect(isPin('411001')).toBe(true);
    expect(isUpi('amit@okicici')).toBe(true);
    expect(isUpi('amit')).toBe(false);
  });
  it('mobile must be 10 digits starting with 7, 8 or 9', () => {
    expect(isMobile('7012345678')).toBe(true);
    expect(isMobile('8012345678')).toBe(true);
    expect(isMobile('6012345678')).toBe(false);
    expect(isMobile('987654321')).toBe(false);
    expect(isMobile('98765432100')).toBe(false);
    expect(isMobile('98765abcde')).toBe(false);
    expect(partyFieldError('sm', '5876543210')).toBe('Enter correct mobile number');
    expect(partyFieldError('rm', '98765')).toBe('Enter correct mobile number');
    expect(partyFieldError('rm', '')).toBe('Enter correct mobile number');
  });
  it('sanitises mobile input and strips a pasted country code', () => {
    expect(sanitizeMobile('98a76-54321 0')).toBe('9876543210');
    expect(sanitizeMobile('+91 98765 43210')).toBe('9876543210');
    expect(sanitizeMobile('919876543210')).toBe('9876543210');
    expect(sanitizeMobile('09876543210')).toBe('9876543210');
    expect(sanitizeMobile('9112345678')).toBe('9112345678');
  });
  it('names accept letters only', () => {
    expect(isName('Asha Rao')).toBe(true);
    expect(isName("D'Souza-Pinto Jr.")).toBe(true);
    expect(isName('Asha123')).toBe(false);
    expect(isName('A')).toBe(false);
    expect(isName('12345')).toBe(false);
    expect(sanitizeName('Asha 12 R@o')).toBe('Asha Ro');
    expect(sanitizeName('  9Asha')).toBe('Asha');
    expect(partyFieldError('sn', 'Asha9')).toMatch(/letters only/);
    expect(partyFieldError('rn', '')).toBe('Enter the receiver name');
  });
  it('pincode: 6 digits, no leading zero, digits only', () => {
    expect(sanitizePin('41-10a01 99')).toBe('411001');
    expect(partyFieldError('sp', '41100')).toMatch(/exactly 6 digits/);
    expect(partyFieldError('sp', '011001')).toMatch(/cannot start with 0/);
    expect(partyFieldError('rp', '40a001')).toMatch(/digits only/);
  });
  it('address needs 8+ characters and some letters', () => {
    expect(partyFieldError('sa', '12345678')).toMatch(/not only numbers/);
    expect(partyFieldError('sa', '12 MG')).toMatch(/too short/);
    expect(partyFieldError('ra', '')).toBe('Enter the full delivery address');
    expect(partyFieldError('ra', '5 Marine Drive')).toBe('');
  });
  it('validates weight, size, pickup date and description', () => {
    const ok = validateInfo(route, filled(), { d: dayIso(1, NOW), t: 'x' }, NOW);
    expect(ok).toEqual({});
    const bad = validateInfo({ ...route, w: '80' }, { ...filled(), l: '0', d: ' ' }, { d: dayIso(-1, NOW), t: 'x' }, NOW);
    expect(Object.keys(bad).sort()).toEqual(['pd', 'pdt', 'pl', 'pw']);
    expect(validateInfo(route, filled(), { d: dayIso(8, NOW), t: 'x' }, NOW).pdt).toBeTruthy();
  });
  it('detects the city from a PIN prefix', () => {
    expect(cityFromPin('411045')).toBe('Pune');
    expect(cityFromPin('999999')).toBeNull();
    expect(cityFromPin('41')).toBeNull();
  });
});

describe('bookings', () => {
  const q = computeQuote(route, emptyDetails());
  const make = (over: Partial<ParcelBooking> = {}): ParcelBooking => ({
    ...createBooking({
      route, p: filled(), charges: computeCharges(q, 'Standard', filled(), null)!, slot: { d: dayIso(1, NOW), t: 'Morning' },
      notify: [1, 0], pm: 'UPI', existingIds: new Set(), rand: seq(0.5),
    }), ...over,
  });
  it('creates a booked parcel with id, otp and a snapshot for "book again"', () => {
    const b = make();
    expect(b.id).toMatch(/^ZPG-PRC-\d{6}$/);
    expect(b.otp).toMatch(/^\d{4}$/);
    expect(b).toMatchObject({ st: 'Booked', prog: 0, svc: 'Standard', amt: 209, title: 'Pune → Mumbai', senderMobile: '9876543210' });
    expect(b.snap!.p.rn).toBe('Vikram Shah');
  });
  it('never reuses an existing id', () => {
    const taken = new Set(['ZPG-PRC-550000']);
    expect(newBookingId(taken, seq(0.5, 0.6))).toBe('ZPG-PRC-640000');
    expect(newOtp(seq(0))).toBe('1000');
  });
  it('moves through the tracking stages and ends as Delivered', () => {
    let b = make();
    for (let i = 0; i < 4; i++) b = advance(b);
    expect(b).toMatchObject({ prog: 4, st: 'Delivered' });
    expect(advance(b)).toBe(b);
  });
  it('can be cancelled only before pickup completes', () => {
    expect(canCancel(make())).toBe(true);
    expect(canCancel(make({ prog: 2 }))).toBe(false);
    expect(canCancel(make({ st: 'Cancelled' }))).toBe(false);
    expect(cancelParcel(make(), 'Wrong address')).toMatchObject({ st: 'Cancelled', reason: 'Wrong address' });
    expect(advance(cancelParcel(make(), 'x')).prog).toBe(0);
  });
  it('stores a rating', () => {
    expect(rateParcel(make(), 5, 'Quick')).toMatchObject({ rate: 5, fb: 'Quick' });
  });
  it('filters by tab and search text', () => {
    const list = [make({ id: 'A1' }), make({ id: 'B2', st: 'Delivered', prog: 4 }), make({ id: 'C3', st: 'Cancelled' })];
    expect(filterBookings(list, 'Active', '').map((b) => b.id)).toEqual(['A1']);
    expect(filterBookings(list, 'Delivered', 'b2').map((b) => b.id)).toEqual(['B2']);
    expect(filterBookings(list, 'Cancelled', 'nomatch')).toEqual([]);
  });
  it('writes a plain-text receipt', () => {
    expect(receiptText(make({ id: 'ZPG-PRC-123456' }))).toContain('ID: ZPG-PRC-123456');
  });
});

describe('money', () => {
  it('formats rupees and converts to paise', () => {
    expect(inr(209)).toBe('₹209');
    expect(inr(1234567)).toBe('₹12,34,567');
    expect(toPaise(209.5)).toBe(20950);
  });
});
