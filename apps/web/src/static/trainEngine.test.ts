import type {
  AuthSession,
  BookingDetails,
  BookingListItem,
  OtpSent,
  PaymentOrder,
  TrainCancellationQuote,
  TrainClassOption,
  TrainOffer,
  TrainQuote,
  TrainSearchResult,
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
const withKey = (key = crypto.randomUUID()) => ({ headers: { 'Idempotency-Key': key } });

async function signUp(phone = '9876543210') {
  const otp = await data<OtpSent>(api.post('/auth/send-otp', { phone }));
  const verified = await data<VerifyOtpResult>(
    api.post('/auth/verify-otp', { phone, otp: otp.devCode }),
  );
  if (verified.status !== 'SIGNUP_REQUIRED') throw new Error('expected signup');
  return data<AuthSession>(
    api.post('/auth/register', { signupToken: verified.signupToken, fullName: 'Amit Sharma' }),
  );
}

async function available(n = 2): Promise<{ train: TrainOffer; option: TrainClassOption }> {
  for (const d of [12, 20, 30, 40]) {
    const result = await data<TrainSearchResult>(
      api.get('/trains/search', { params: { from: 'PUNE', to: 'NDLS', date: day(d) } }),
    );
    for (const train of result.trains) {
      const option = train.classes.find(
        (c) => c.availability.status === 'AVAILABLE' && (c.availability.count ?? 0) >= n + 2,
      );
      if (option) return { train, option };
    }
  }
  throw new Error('no available train');
}

const passengers = [
  {
    firstName: 'Amit',
    lastName: 'Sharma',
    age: 34,
    gender: 'MALE',
    berthPreference: 'NO_PREFERENCE',
  },
  {
    firstName: 'Priya',
    lastName: 'Sharma',
    age: 31,
    gender: 'FEMALE',
    berthPreference: 'NO_PREFERENCE',
  },
];

async function bookAndPay(email = 'amit@example.com') {
  const { train, option } = await available();
  const quote = await data<TrainQuote>(
    api.post('/trains/quote', {
      offerId: train.id,
      travelClass: option.travelClass,
      quota: 'GN',
      passengers: 2,
    }),
  );
  const booking = await data<BookingDetails>(
    api.post(
      '/trains/book',
      {
        offerId: train.id,
        travelClass: option.travelClass,
        quota: 'GN',
        passengers,
        contact: { email, phone: '9876543210' },
        expectedTotalPaise: quote.price.totalPaise,
      },
      withKey(),
    ),
  );
  const order = await data<PaymentOrder>(
    api.post('/payments/create', { bookingReference: booking.reference }),
  );
  await api.post('/payments/mock/complete', { paymentId: order.paymentId, outcome: 'success' });
  return { booking, quote, train, option };
}

beforeEach(() => resetStaticDb());

describe('static engine: trains', () => {
  it('searches the demo network with class-wise availability, labelled as demo', async () => {
    const result = await data<TrainSearchResult>(
      api.get('/trains/search', {
        params: { from: 'PUNE', to: 'NDLS', date: day(12), quota: 'GN', passengers: 2 },
      }),
    );
    expect(result).toMatchObject({
      demo: true,
      quota: 'GN',
      passengers: 2,
      capabilities: { liveStatus: false },
    });
    expect(result.trains.length).toBeGreaterThan(0);
    expect(result.trains[0]?.trainNumber).toMatch(/^Z\d{4}$/);
    const bad = await fail(api.get('/trains/search', { params: { from: 'PUNE', to: 'PUNE' } }));
    expect(bad.body).toMatchObject({ errorCode: 'VALIDATION_ERROR' });
    const pt = await fail(
      api.get('/trains/search', { params: { from: 'PUNE', to: 'NDLS', quota: 'PT' } }),
    );
    expect(pt.body.details[0].path).toBe('query.quota');
  });

  it('books after payment with a demo PNR and shows the train in My Bookings', async () => {
    await signUp();
    const { booking, quote } = await bookAndPay();
    expect(booking).toMatchObject({ status: 'PENDING_PAYMENT', serviceType: 'TRAIN' });
    expect(booking.price.totalPaise).toBe(quote.price.totalPaise);
    const after = await data<BookingDetails>(api.get(`/bookings/${booking.reference}`));
    expect(after).toMatchObject({ status: 'CONFIRMED', paymentStatus: 'SUCCESS' });
    expect(after.train?.pnr).toMatch(/^ZD\d{8}$/);
    expect(after.train?.passengers.every((p) => p.status === 'CONFIRMED')).toBe(true);
    const list = await data<BookingListItem[]>(api.get('/bookings'));
    expect(list[0]).toMatchObject({ serviceType: 'TRAIN', statusLabel: 'Booked · Confirmed' });
  });

  it('returns the same booking for a retried request and refuses a changed price', async () => {
    await signUp();
    const { train, option } = await available();
    const quote = await data<TrainQuote>(
      api.post('/trains/quote', {
        offerId: train.id,
        travelClass: option.travelClass,
        quota: 'GN',
        passengers: 2,
      }),
    );
    const body = {
      offerId: train.id,
      travelClass: option.travelClass,
      quota: 'GN',
      passengers,
      contact: { email: 'amit@example.com', phone: '9876543210' },
      expectedTotalPaise: quote.price.totalPaise,
    };
    const key = crypto.randomUUID();
    const a = await data<BookingDetails>(api.post('/trains/book', body, withKey(key)));
    const b = await data<BookingDetails>(api.post('/trains/book', body, withKey(key)));
    expect(a.reference).toBe(b.reference);
    const changed = await fail(
      api.post('/trains/book', { ...body, expectedTotalPaise: 1 }, withKey()),
    );
    expect(changed.body).toMatchObject({ errorCode: 'PRICE_CHANGED' });
  });

  it('applies an admin coupon to a train booking, counts it once, and never refunds more than was paid', async () => {
    await signUp();
    const { train, option } = await available();
    const quote = await data<TrainQuote>(
      api.post('/trains/quote', { offerId: train.id, travelClass: option.travelClass, quota: 'GN', passengers: 2 }),
    );
    const gross = quote.price.totalPaise;
    // The demo admin data has TRAIN50: Rs 50 off train tickets, one use per customer.
    const listed = await data<{ code: string }[]>(api.get('/coupons/public', { params: { service: 'TRAIN' } }));
    expect(listed.map((c) => c.code)).toContain('TRAIN50');
    const check = await data<{ discountPaise: number }>(
      api.post('/coupons/validate', { code: 'train50', service: 'TRAIN', orderPaise: gross }),
    );
    expect(check.discountPaise).toBe(5_000);

    const body = {
      offerId: train.id,
      travelClass: option.travelClass,
      quota: 'GN',
      passengers,
      contact: { email: 'amit@example.com', phone: '9876543210' },
    };
    const unknown = await fail(api.post('/trains/book', { ...body, promoCode: 'NOSUCH', expectedTotalPaise: gross }, withKey()));
    expect(unknown.body.details[0].path).toBe('body.promoCode');
    // The total must include the coupon.
    const stale = await fail(api.post('/trains/book', { ...body, promoCode: 'TRAIN50', expectedTotalPaise: gross }, withKey()));
    expect(stale.body).toMatchObject({ errorCode: 'PRICE_CHANGED' });

    const booking = await data<BookingDetails>(
      api.post('/trains/book', { ...body, promoCode: 'TRAIN50', expectedTotalPaise: gross - 5_000 }, withKey()),
    );
    expect(booking.price.discountPaise).toBe(5_000);
    expect(booking.price.totalPaise).toBe(gross - 5_000);
    // Each passenger's refundable fare shrinks by their share, so the shares add up to what was paid.
    expect(booking.train?.passengers.reduce((sum, p) => sum + p.farePaise, 0)).toBe(quote.perPassenger.totalPaise * 2 - 5_000);
    // One use per customer.
    const again = await fail(api.post('/trains/book', { ...body, promoCode: 'TRAIN50', expectedTotalPaise: gross - 5_000 }, withKey()));
    expect(again.status).toBe(400);
  });

  it('refunds in full when the (simulated) railway refuses', async () => {
    await signUp();
    const { booking } = await bookAndPay('amit+railfail@example.com');
    const after = await data<BookingDetails>(api.get(`/bookings/${booking.reference}`));
    expect(after).toMatchObject({ status: 'REFUNDED', paymentStatus: 'REFUNDED' });
    expect(after.train?.reservationStatus).toBe('FAILED');
    expect(after.train?.refunds[0]).toMatchObject({
      amountPaise: after.price.totalPaise,
      status: 'COMPLETED',
    });
  });

  it('keeps a pending reservation PROCESSING until a status refresh', async () => {
    await signUp();
    const { booking } = await bookAndPay('amit+railpending@example.com');
    expect((await data<BookingDetails>(api.get(`/bookings/${booking.reference}`))).status).toBe(
      'PROCESSING',
    );
    const refreshed = await data<BookingDetails>(
      api.post(`/trains/bookings/${booking.reference}/refresh`),
    );
    expect(refreshed.status).toBe('CONFIRMED');
    expect(refreshed.train?.pnr).toMatch(/^ZD/);
  });

  it('cancels one passenger, then the rest, refunding what the rules allow', async () => {
    await signUp();
    const { booking } = await bookAndPay();
    const [first, second] = booking.passengers;
    const quote = await data<TrainCancellationQuote>(
      api.post(`/trains/bookings/${booking.reference}/cancellation-quote`, {
        passengerIds: [first?.id],
      }),
    );
    expect(quote.eligible).toBe(true);
    const key = crypto.randomUUID();
    const partial = await data<BookingDetails>(
      api.post(
        `/trains/bookings/${booking.reference}/cancel`,
        { passengerIds: [first?.id] },
        withKey(key),
      ),
    );
    expect(partial).toMatchObject({ status: 'CONFIRMED', paymentStatus: 'PARTIALLY_REFUNDED' });
    expect(partial.train?.reservationStatus).toBe('PARTIALLY_CANCELLED');
    // Same key: no second refund.
    const again = await data<BookingDetails>(
      api.post(
        `/trains/bookings/${booking.reference}/cancel`,
        { passengerIds: [first?.id] },
        withKey(key),
      ),
    );
    expect(again.train?.refunds).toHaveLength(1);
    const rest = await data<BookingDetails>(
      api.post(
        `/trains/bookings/${booking.reference}/cancel`,
        { passengerIds: [second?.id] },
        withKey(),
      ),
    );
    expect(rest.status).toBe('REFUNDED');
    expect(rest.train?.reservationStatus).toBe('CANCELLED');
    expect(rest.train?.refunds).toHaveLength(2);
  });

  it('reports live status as unsupported instead of inventing data', async () => {
    const live = await data<{ supported: boolean; stations: unknown[] }>(
      api.get('/trains/Z2101/live-status', { params: { date: day(1) } }),
    );
    expect(live).toMatchObject({ supported: false, stations: [] });
  });
});
