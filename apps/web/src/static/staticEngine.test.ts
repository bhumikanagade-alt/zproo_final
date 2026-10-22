import type {
  AuthSession,
  BookingDetails,
  BookingListItem,
  BusSearchResult,
  BusSeatMap,
  FlightSearchResult,
  OtpSent,
  PaymentOrder,
  VerifyOtpResult,
} from '@zproo/types';
import axios, { AxiosError } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStaticDb } from './core';
import { staticAdapter } from './server';

const api = axios.create({ baseURL: '/api', adapter: staticAdapter });
const data = async <T>(p: Promise<{ data: { data: T } }>) => (await p).data.data;
const fail = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    if (err instanceof AxiosError)
      return { status: err.response?.status, body: err.response?.data };
  }
  throw new Error('expected the request to fail');
};

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

async function signUp(phone = '9876543210') {
  const otp = await data<OtpSent>(api.post('/auth/send-otp', { phone }));
  const verified = await data<VerifyOtpResult>(
    api.post('/auth/verify-otp', { phone, otp: otp.devCode }),
  );
  if (verified.status !== 'SIGNUP_REQUIRED') throw new Error('expected signup');
  return data<AuthSession>(
    api.post('/auth/register', {
      signupToken: verified.signupToken,
      fullName: 'Amit Sharma',
      password: 'secret123',
    }),
  );
}

const book = (url: string, body: unknown, key = crypto.randomUUID()) =>
  api.post(url, body, { headers: { 'Idempotency-Key': key } });

beforeEach(() => resetStaticDb());

describe('static engine: accounts', () => {
  it('signs up with OTP, restores the session, and signs in with a password', async () => {
    const session = await signUp();
    expect(session.user).toMatchObject({
      fullName: 'Amit Sharma',
      phone: '+919876543210',
      roles: ['USER'],
    });
    expect((await data<AuthSession>(api.post('/auth/refresh'))).user.id).toBe(session.user.id);

    await api.post('/auth/logout');
    expect((await fail(api.post('/auth/refresh'))).status).toBe(401);
    expect(
      (await fail(api.post('/auth/login', { identifier: '9876543210', password: 'nope' }))).status,
    ).toBe(401);
    const again = await data<AuthSession>(
      api.post('/auth/login', { identifier: '9876543210', password: 'secret123' }),
    );
    expect(again.user.id).toBe(session.user.id);
  });

  it('rejects a wrong code and validates input like the API', async () => {
    await api.post('/auth/send-otp', { phone: '9876543210' });
    const wrong = await fail(api.post('/auth/verify-otp', { phone: '9876543210', otp: '000000' }));
    expect(wrong.body).toMatchObject({ errorCode: 'INVALID_OTP' });
    const bad = await fail(api.post('/auth/send-otp', { phone: '123' }));
    expect(bad.body).toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      details: [{ path: 'body.phone' }],
    });
  });
});

describe('static engine: flights', () => {
  it('searches, books, pays and issues tickets', async () => {
    const search = await data<FlightSearchResult>(
      api.get('/flights/search', { params: { from: 'PNQ', to: 'DEL', date: day(20), adults: 1 } }),
    );
    expect(search.demo).toBe(true);
    const [offer] = search.legs[0]?.offers ?? [];
    if (!offer) throw new Error('no offers');
    expect(offer).toMatchObject({ from: { code: 'PNQ' }, to: { code: 'DEL' } });

    expect((await fail(book('/flights/book', {}))).status).toBe(401);
    await signUp();
    const passengers = [
      {
        type: 'ADULT',
        title: 'MR',
        firstName: 'Amit',
        lastName: 'Sharma',
        gender: 'MALE',
        identityDocument: { type: 'AADHAAR', number: '234567890124', nationality: 'IN' },
      },
    ];
    const contact = { email: 'amit@example.com', phone: '9876543210' };
    const changed = await fail(
      book('/flights/book', { offerIds: [offer.id], passengers, contact, expectedTotalPaise: 100 }),
    );
    expect(changed.body).toMatchObject({ errorCode: 'PRICE_CHANGED' });

    const key = crypto.randomUUID();
    const booking = await data<BookingDetails>(
      book(
        '/flights/book',
        { offerIds: [offer.id], passengers, contact, expectedTotalPaise: offer.totalPaise },
        key,
      ),
    );
    expect(booking).toMatchObject({ status: 'PENDING_PAYMENT', serviceType: 'FLIGHT' });
    const retry = await data<BookingDetails>(
      book(
        '/flights/book',
        { offerIds: [offer.id], passengers, contact, expectedTotalPaise: offer.totalPaise },
        key,
      ),
    );
    expect(retry.reference).toBe(booking.reference);

    const order = await data<PaymentOrder>(
      api.post('/payments/create', { bookingReference: booking.reference }),
    );
    expect(order.amountPaise).toBe(offer.totalPaise);
    await api.post('/payments/mock/complete', { paymentId: order.paymentId, outcome: 'failure' });
    const order2 = await data<PaymentOrder>(
      api.post('/payments/create', { bookingReference: booking.reference }),
    );
    await api.post('/payments/mock/complete', { paymentId: order2.paymentId, outcome: 'success' });

    const confirmed = await data<BookingDetails>(api.get(`/bookings/${booking.reference}`));
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.flights[0]?.pnr).toMatch(/^[A-Z0-9]{6}$/);
    const list = await data<BookingListItem[]>(api.get('/bookings'));
    expect(list).toEqual([
      expect.objectContaining({ reference: booking.reference, title: 'PNQ → DEL' }),
    ]);
  });

  it('applies an admin coupon to a flight booking, counts it once and charges the discounted total', async () => {
    const search = await data<FlightSearchResult>(
      api.get('/flights/search', { params: { from: 'PNQ', to: 'DEL', date: day(20), adults: 1 } }),
    );
    // The demo admin data has ZPFLY: 10% off domestic flights (max ₹1,000) on fares above ₹3,000.
    const offer = [...(search.legs[0]?.offers ?? [])].sort((a, b) => b.totalPaise - a.totalPaise)[0];
    if (!offer) throw new Error('no offers');
    expect(offer.totalPaise).toBeGreaterThanOrEqual(300_000);
    await signUp();
    const passengers = [
      {
        type: 'ADULT',
        title: 'MR',
        firstName: 'Amit',
        lastName: 'Sharma',
        gender: 'MALE',
        identityDocument: { type: 'AADHAAR', number: '234567890124', nationality: 'IN' },
      },
    ];
    const contact = { email: 'amit@example.com', phone: '9876543210' };
    const gross = offer.totalPaise;
    const discount = Math.min(Math.floor(gross / 10), 100_000);

    const listed = await data<{ code: string }[]>(api.get('/coupons/public', { params: { service: 'FLIGHT' } }));
    expect(listed.map((c) => c.code)).toContain('ZPFLY');
    const check = await data<{ discountPaise: number }>(
      api.post('/coupons/validate', { code: 'zpfly', service: 'FLIGHT', orderPaise: gross }),
    );
    expect(check.discountPaise).toBe(discount);

    const body = { offerIds: [offer.id], passengers, contact };
    const unknown = await fail(book('/flights/book', { ...body, promoCode: 'NOSUCH', expectedTotalPaise: gross }));
    expect(unknown.body.details[0].path).toBe('body.promoCode');
    const busOnly = await fail(book('/flights/book', { ...body, promoCode: 'BUS150', expectedTotalPaise: gross }));
    expect(busOnly.body.details[0].message).toBe('This coupon does not apply to this service');
    // The total must include the coupon.
    const stale = await fail(book('/flights/book', { ...body, promoCode: 'ZPFLY', expectedTotalPaise: gross }));
    expect(stale.body).toMatchObject({ errorCode: 'PRICE_CHANGED' });

    const booking = await data<BookingDetails>(
      book('/flights/book', { ...body, promoCode: 'ZPFLY', expectedTotalPaise: gross - discount }),
    );
    expect(booking.price).toMatchObject({ discountPaise: discount, totalPaise: gross - discount });
    const order = await data<PaymentOrder>(api.post('/payments/create', { bookingReference: booking.reference }));
    expect(order.amountPaise).toBe(gross - discount);

    // One use per customer.
    const again = await fail(book('/flights/book', { ...body, promoCode: 'ZPFLY', expectedTotalPaise: gross - discount }));
    expect(again.status).toBe(400);
    expect(again.body.details[0].message).toMatch(/already used/);
  });

  it('lets a cab ride use an admin coupon: listed for cabs only, checked, redeemed once, limits hold', async () => {
    // The demo admin data has FIRSTRIDE: 50% off the first cab ride, up to ₹100.
    const cabs = await data<{ code: string }[]>(api.get('/coupons/public', { params: { service: 'CAB' } }));
    expect(cabs.map((c) => c.code)).toContain('FIRSTRIDE');
    const buses = await data<{ code: string }[]>(api.get('/coupons/public', { params: { service: 'BUS' } }));
    expect(buses.map((c) => c.code)).not.toContain('FIRSTRIDE');

    await signUp();
    const check = await data<{ code: string; discountPaise: number }>(
      api.post('/coupons/validate', { code: 'firstride', service: 'CAB', orderPaise: 12_000 }),
    );
    expect(check).toMatchObject({ code: 'FIRSTRIDE', discountPaise: 6_000 });
    const capped = await data<{ discountPaise: number }>(api.post('/coupons/validate', { code: 'FIRSTRIDE', service: 'CAB', orderPaise: 90_000 }));
    expect(capped.discountPaise).toBe(10_000);
    const wrongService = await fail(api.post('/coupons/validate', { code: 'FIRSTRIDE', service: 'BUS', orderPaise: 12_000 }));
    expect(wrongService.status).toBe(400);

    const redeem = (bookingRef: string) => api.post('/coupons/redeem', { code: 'FIRSTRIDE', service: 'CAB', orderPaise: 12_000, bookingRef });
    await data(redeem('ZPROO123456'));
    await data(redeem('ZPROO123456')); // the same ride again counts once
    const second = await fail(redeem('ZPROO654321')); // one use per customer
    expect(second.status).toBe(400);
    expect(second.body.details[0].message).toMatch(/already used/);
  });

  it('lets a bike rental use an admin coupon: listed for bikes only, checked, redeemed once, limits hold', async () => {
    // The demo admin data has BIKE10: 10% off bike rentals (max ₹300) on rentals of ₹500 or more.
    const bikes = await data<{ code: string }[]>(api.get('/coupons/public', { params: { service: 'BIKE' } }));
    expect(bikes.map((c) => c.code)).toContain('BIKE10');
    const cabs = await data<{ code: string }[]>(api.get('/coupons/public', { params: { service: 'CAB' } }));
    expect(cabs.map((c) => c.code)).not.toContain('BIKE10');

    await signUp();
    const check = await data<{ code: string; discountPaise: number }>(
      api.post('/coupons/validate', { code: 'bike10', service: 'BIKE', orderPaise: 100_000 }),
    );
    expect(check).toMatchObject({ code: 'BIKE10', discountPaise: 10_000 });
    const capped = await data<{ discountPaise: number }>(api.post('/coupons/validate', { code: 'BIKE10', service: 'BIKE', orderPaise: 900_000 }));
    expect(capped.discountPaise).toBe(30_000);
    expect((await fail(api.post('/coupons/validate', { code: 'BIKE10', service: 'BIKE', orderPaise: 10_000 }))).status).toBe(400); // below the minimum
    expect((await fail(api.post('/coupons/validate', { code: 'BIKE10', service: 'CAB', orderPaise: 100_000 }))).status).toBe(400); // wrong service

    const redeem = (bookingRef: string) => api.post('/coupons/redeem', { code: 'BIKE10', service: 'BIKE', orderPaise: 100_000, bookingRef });
    await data(redeem('ZB-AAAAAA'));
    await data(redeem('ZB-AAAAAA')); // the same rental again counts once
    const second = await fail(redeem('ZB-BBBBBB')); // one use per customer
    expect(second.status).toBe(400);
    expect(second.body.details[0].message).toMatch(/already used/);
  });

  it('lets a holiday booking use an admin coupon: listed for holidays only, checked, redeemed once, limits hold', async () => {
    // The demo admin data has HOLIDAY10: 10% off holiday packages (max ₹3,000) on bookings of ₹10,000 or more.
    const holidays = await data<{ code: string }[]>(api.get('/coupons/public', { params: { service: 'HOLIDAY' } }));
    expect(holidays.map((c) => c.code)).toContain('HOLIDAY10');
    expect(holidays.map((c) => c.code)).not.toContain('MONSOON25'); // switched off and ended
    const buses = await data<{ code: string }[]>(api.get('/coupons/public', { params: { service: 'BUS' } }));
    expect(buses.map((c) => c.code)).not.toContain('HOLIDAY10');

    await signUp();
    const check = await data<{ code: string; discountPaise: number }>(
      api.post('/coupons/validate', { code: 'holiday10', service: 'HOLIDAY', orderPaise: 3_000_000 }),
    );
    expect(check).toMatchObject({ code: 'HOLIDAY10', discountPaise: 300_000 }); // 10% of ₹30,000, exactly at the cap
    const capped = await data<{ discountPaise: number }>(api.post('/coupons/validate', { code: 'HOLIDAY10', service: 'HOLIDAY', orderPaise: 6_000_000 }));
    expect(capped.discountPaise).toBe(300_000);
    expect((await fail(api.post('/coupons/validate', { code: 'HOLIDAY10', service: 'HOLIDAY', orderPaise: 500_000 }))).status).toBe(400); // below the minimum
    expect((await fail(api.post('/coupons/validate', { code: 'HOLIDAY10', service: 'BUS', orderPaise: 3_000_000 }))).status).toBe(400); // wrong service

    const redeem = (bookingRef: string) => api.post('/coupons/redeem', { code: 'HOLIDAY10', service: 'HOLIDAY', orderPaise: 3_000_000, bookingRef });
    await data(redeem('ZP-HOL-11111'));
    await data(redeem('ZP-HOL-11111')); // the same booking again counts once
    const second = await fail(redeem('ZP-HOL-22222')); // one use per customer
    expect(second.status).toBe(400);
    expect(second.body.details[0].message).toMatch(/already used/);
  });

  it('lets a parcel booking use an admin coupon: listed for parcels only, checked, redeemed once, limits hold', async () => {
    // The demo admin data has PARCEL10 (10%, no minimum) and SHIP20 (20% up to ₹150, on ₹200 or more) for parcels.
    const parcels = await data<{ code: string }[]>(api.get('/coupons/public', { params: { service: 'PARCEL' } }));
    expect(parcels.map((c) => c.code)).toEqual(expect.arrayContaining(['PARCEL10', 'SHIP20']));
    const buses = await data<{ code: string }[]>(api.get('/coupons/public', { params: { service: 'BUS' } }));
    expect(buses.map((c) => c.code)).not.toContain('PARCEL10');

    await signUp();
    const check = (code: string, orderPaise: number, service = 'PARCEL') => api.post('/coupons/validate', { code, service, orderPaise });
    expect(await data<{ code: string; discountPaise: number }>(check('parcel10', 20_900))).toMatchObject({ code: 'PARCEL10', discountPaise: 2_090 });
    expect((await data<{ discountPaise: number }>(check('SHIP20', 100_000))).discountPaise).toBe(15_000); // 20% would be ₹200, capped at ₹150
    expect((await fail(check('SHIP20', 15_000))).status).toBe(400); // below the ₹200 minimum
    expect((await fail(check('SHIP20', 100_000, 'BUS'))).status).toBe(400); // wrong service

    const redeem = (bookingRef: string) => api.post('/coupons/redeem', { code: 'SHIP20', service: 'PARCEL', orderPaise: 30_000, bookingRef });
    await data(redeem('ZPG-PRC-111111'));
    await data(redeem('ZPG-PRC-111111')); // the same booking again counts once
    const second = await fail(redeem('ZPG-PRC-222222')); // one use per customer
    expect(second.status).toBe(400);
    expect(second.body.details[0].message).toMatch(/already used/);

    // Cancelled (or the payment failed): the use is given back, the customer can use the coupon again, and releasing twice is harmless.
    const release = (bookingRef: string) => api.post('/coupons/release', { code: 'SHIP20', bookingRef });
    expect(await data<{ released: boolean }>(release('ZPG-PRC-111111'))).toEqual({ released: true });
    expect(await data<{ released: boolean }>(release('ZPG-PRC-111111'))).toEqual({ released: false });
    expect(await data<{ released: boolean }>(release('ZPG-PRC-999999'))).toEqual({ released: false }); // never used
    await data(redeem('ZPG-PRC-222222')); // allowed again
  });

  it('returns both legs for a round trip', async () => {
    const search = await data<FlightSearchResult>(
      api.get('/flights/search', {
        params: { trip: 'ROUND_TRIP', from: 'BOM', to: 'GOI', date: day(20), return: day(24) },
      }),
    );
    expect(search.legs.map((l) => `${l.from}-${l.to}`)).toEqual(['BOM-GOI', 'GOI-BOM']);
  });
});

describe('static engine: buses', () => {
  it('holds seats for the booking, releases them on expiry, and confirms on payment', async () => {
    const search = await data<BusSearchResult>(
      api.get('/buses/search', { params: { from: 'pune', to: 'mumbai', date: day(10) } }),
    );
    expect(search.trips.length).toBeGreaterThan(3);
    const trip = search.trips[0];
    if (!trip) throw new Error('no trips');
    expect(trip.boardingPoints[0]?.name).toBe('Swargate');

    const map = await data<BusSeatMap>(api.get(`/buses/${trip.id}/seats`));
    const seat = map.decks.flatMap((d) => d.seats).find((s) => s.available && !s.ladiesOnly);
    if (!seat) throw new Error('no seat');

    await signUp();
    const body = {
      tripId: trip.id,
      boardingPointId: trip.boardingPoints[0]?.id,
      droppingPointId: trip.droppingPoints.at(-1)?.id,
      passengers: [
        { seatNumber: seat.number, firstName: 'Rohan', lastName: 'Patil', age: 30, gender: 'MALE' },
      ],
      contact: { email: 'rohan@example.com', phone: '9876543210' },
      expectedTotalPaise: seat.pricePaise,
    };
    const booking = await data<BookingDetails>(book('/buses/book', body));
    expect(booking.bus).toMatchObject({
      seatNumbers: [seat.number],
      boardingPoint: { name: 'Swargate' },
    });

    const held = await data<BusSeatMap>(api.get(`/buses/${trip.id}/seats`));
    expect(
      held.decks.flatMap((d) => d.seats).find((s) => s.number === seat.number)?.available,
    ).toBe(false);
    expect((await fail(book('/buses/book', body))).body).toMatchObject({
      errorCode: 'SEAT_UNAVAILABLE',
    });

    const order = await data<PaymentOrder>(
      api.post('/payments/create', { bookingReference: booking.reference }),
    );
    await api.post('/payments/mock/complete', { paymentId: order.paymentId, outcome: 'success' });
    const confirmed = await data<BookingDetails>(api.get(`/bookings/${booking.reference}`));
    expect(confirmed.bus?.pnr).toMatch(new RegExp(`^${trip.operator.code}\\d{7}$`));
  });

  it('applies bus coupons during booking without reporting a false price change', async () => {
    await signUp('9876543211');
    const search = await data<BusSearchResult>(
      api.get('/buses/search', { params: { from: 'pune', to: 'mumbai', date: day(12) } }),
    );
    const trip = search.trips[0];
    if (!trip) throw new Error('no coupon trip');

    const map = await data<BusSeatMap>(api.get(`/buses/${trip.id}/seats`));
    const seat = map.decks.flatMap((d) => d.seats).find((s) => s.available && !s.ladiesOnly);
    if (!seat) throw new Error('no coupon seat');

    const discount = Math.floor(seat.pricePaise * 0.10);
    const booking = await data<BookingDetails>(
      book('/buses/book', {
        tripId: trip.id,
        boardingPointId: trip.boardingPoints[0]?.id,
        droppingPointId: trip.droppingPoints.at(-1)?.id,
        passengers: [
          { seatNumber: seat.number, firstName: 'Rohan', lastName: 'Patil', age: 30, gender: 'MALE' },
        ],
        contact: { email: 'rohan@example.com', phone: '9876543211' },
        promoCode: 'ZPROO10',
        expectedTotalPaise: seat.pricePaise - discount,
      }),
    );

    expect(booking.price.discountPaise).toBe(discount);
    expect(booking.price.totalPaise).toBe(seat.pricePaise - discount);
  });

  it('keeps ladies-only seats for women', async () => {
    await signUp();
    const search = await data<BusSearchResult>(
      api.get('/buses/search', { params: { from: 'pune', to: 'mumbai', date: day(10) } }),
    );
    for (const trip of search.trips) {
      const map = await data<BusSeatMap>(api.get(`/buses/${trip.id}/seats`));
      const seat = map.decks.flatMap((d) => d.seats).find((s) => s.available && s.ladiesOnly);
      if (!seat) continue;
      const res = await fail(
        book('/buses/book', {
          tripId: trip.id,
          boardingPointId: trip.boardingPoints[0]?.id,
          droppingPointId: trip.droppingPoints[0]?.id,
          passengers: [
            {
              seatNumber: seat.number,
              firstName: 'Amit',
              lastName: 'Patil',
              age: 30,
              gender: 'MALE',
            },
          ],
          contact: { email: 'amit@example.com', phone: '9876543210' },
          expectedTotalPaise: seat.pricePaise,
        }),
      );
      expect(res.body).toMatchObject({
        details: [
          {
            path: 'body.passengers.0.gender',
            message: `Seat ${seat.number} is reserved for women`,
          },
        ],
      });
      return;
    }
    throw new Error('no ladies seat found');
  });
});
