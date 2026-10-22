import type {
  BookingDetails,
  TrainClassOption,
  TrainOffer,
  TrainQuote,
  TrainSearchResult,
} from '@zproo/types';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MockTrainProvider,
  TrainProviderTimeoutError,
  resilientTrainProvider,
} from '../src/providers/train';
import type { ProviderBookingRequest, ProviderBookingResult } from '../src/providers/train';
import { createTestContext, grantRole, prisma, resetUsers, signUp } from './helpers';
import { pino } from 'pino';
import { availabilityAt, localDate, presoldCount } from '@zproo/catalog';

beforeEach(resetUsers);

type Ctx = ReturnType<typeof createTestContext>;

function daysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function search(ctx: Ctx, query: Record<string, string> = {}): Promise<TrainSearchResult> {
  const res = await request(ctx.app)
    .get('/api/trains/search')
    .query({ from: 'PUNE', to: 'NDLS', date: daysAhead(12), ...query })
    .expect(200);
  return res.body.data as TrainSearchResult;
}

/** A train and class with at least `n` confirmed berths available (general quota). */
async function pickAvailable(
  ctx: Ctx,
  n = 2,
): Promise<{ train: TrainOffer; option: TrainClassOption }> {
  for (const days of [12, 20, 30, 40]) {
    for (const [from, to] of [
      ['PUNE', 'NDLS'],
      ['CSMT', 'PUNE'],
      ['PUNE', 'SBC'],
    ] as const) {
      const result = await search(ctx, { from, to, date: daysAhead(days) });
      for (const train of result.trains) {
        const option = train.classes.find(
          (c) => c.availability.status === 'AVAILABLE' && (c.availability.count ?? 0) >= n + 2,
        );
        if (option) return { train, option };
      }
    }
  }
  throw new Error('No train with available berths');
}

const passenger = (i = 0, extra: object = {}) => ({
  firstName: ['Amit', 'Priya', 'Kabir', 'Sana'][i] ?? 'Amit',
  lastName: 'Sharma',
  age: [34, 31, 9, 62][i] ?? 30,
  gender: i === 1 ? 'FEMALE' : 'MALE',
  berthPreference: 'NO_PREFERENCE',
  ...extra,
});

async function quote(
  ctx: Ctx,
  train: TrainOffer,
  option: TrainClassOption,
  passengers: number,
): Promise<TrainQuote> {
  const res = await request(ctx.app)
    .post('/api/trains/quote')
    .send({ offerId: train.id, travelClass: option.travelClass, quota: option.quota, passengers })
    .expect(200);
  return res.body.data as TrainQuote;
}

function book(
  ctx: Ctx,
  token: string,
  train: TrainOffer,
  option: TrainClassOption,
  expectedTotalPaise: number,
  options: {
    key?: string;
    passengers?: object[];
    email?: string;
    confirmOnly?: boolean;
    quota?: string;
  } = {},
) {
  return request(ctx.app)
    .post('/api/trains/book')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', options.key ?? crypto.randomUUID())
    .send({
      offerId: train.id,
      travelClass: option.travelClass,
      quota: options.quota ?? option.quota,
      passengers: options.passengers ?? [passenger(0), passenger(1)],
      contact: { email: options.email ?? 'amit@example.com', phone: '+919876543210' },
      confirmOnly: options.confirmOnly ?? false,
      expectedTotalPaise,
    });
}

async function pay(ctx: Ctx, token: string, reference: string) {
  const auth = { Authorization: `Bearer ${token}` };
  const order = await request(ctx.app)
    .post('/api/payments/create')
    .set(auth)
    .send({ bookingReference: reference })
    .expect(201);
  await request(ctx.app)
    .post('/api/payments/mock/complete')
    .set(auth)
    .send({ paymentId: order.body.data.paymentId, outcome: 'success' })
    .expect(200);
  return order.body.data as { amountPaise: number; paymentId: string };
}

async function details(ctx: Ctx, token: string, reference: string): Promise<BookingDetails> {
  const res = await request(ctx.app)
    .get(`/api/bookings/${reference}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body.data as BookingDetails;
}

/** Books two passengers and pays; returns the confirmed booking. */
async function bookedAndPaid(ctx: Ctx, options: { email?: string } = {}) {
  const { accessToken } = await signUp(ctx);
  const { train, option } = await pickAvailable(ctx);
  const q = await quote(ctx, train, option, 2);
  const res = await book(ctx, accessToken, train, option, q.price.totalPaise, {
    email: options.email,
  }).expect(201);
  const reference = res.body.data.reference as string;
  await pay(ctx, accessToken, reference);
  return { accessToken, reference, train, option, quote: q };
}

describe('GET /api/trains/search', () => {
  it('lists trains with class-wise availability and fares, labelled as demo', async () => {
    const ctx = createTestContext();
    const result = await search(ctx);
    expect(result.demo).toBe(true);
    expect(result.capabilities).toMatchObject({
      provider: 'mock',
      demo: true,
      liveStatus: false,
      idRequired: false,
    });
    expect(result.trains.length).toBeGreaterThan(0);
    for (const train of result.trains) {
      expect(train.trainNumber).toMatch(/^Z\d{4}$/); // invented numbers, never a real train
      expect(train.from.code).toBe('PUNE');
      expect(train.to.code).toBe('NDLS');
      expect(train.stops[0]?.code).toBe('PUNE');
      expect(train.stops.at(-1)?.code).toBe('NDLS');
      for (const c of train.classes) {
        expect(c.availability.label).toMatch(
          /^(AVL \d+|RAC \d+|GNWL \d+|REGRET|CLOSED|NOT OPEN|NOT AVAILABLE)$/,
        );
        expect(c.fare?.totalPaise).toBeGreaterThan(0);
      }
    }
    const times = result.trains.map((t) => Date.parse(t.departureAt));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('filters by class and keeps the quota and passengers in the result', async () => {
    const ctx = createTestContext();
    const result = await search(ctx, { class: '3A', quota: 'GN', passengers: '3' });
    expect(result).toMatchObject({ travelClass: '3A', quota: 'GN', passengers: 3 });
    for (const t of result.trains) expect(t.classes.map((c) => c.travelClass)).toEqual(['3A']);
  });

  it('shows Tatkal as not open until the day before the journey', async () => {
    const ctx = createTestContext();
    const result = await search(ctx, { quota: 'TQ' });
    const options = result.trains.flatMap((t) => t.classes);
    expect(options.length).toBeGreaterThan(0);
    for (const o of options) expect(o.availability.bookable).toBe(false);
  });

  it('rejects invalid searches and unsupported quotas', async () => {
    const ctx = createTestContext();
    const bad = await request(ctx.app)
      .get('/api/trains/search')
      .query({ from: 'PUNE', to: 'PUNE' })
      .expect(400);
    expect(bad.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'query.to' })]),
    );
    await request(ctx.app)
      .get('/api/trains/search')
      .query({ from: 'XXXX', to: 'NDLS' })
      .expect(400);
    await request(ctx.app)
      .get('/api/trains/search')
      .query({ from: 'PUNE', to: 'NDLS', date: '2020-01-01' })
      .expect(400);
    const pt = await request(ctx.app)
      .get('/api/trains/search')
      .query({ from: 'PUNE', to: 'NDLS', quota: 'PT' })
      .expect(400);
    expect(pt.body.details[0].path).toBe('query.quota');
    await request(ctx.app)
      .get('/api/trains/search')
      .query({ from: 'PUNE', to: 'NDLS', quota: 'TQ', passengers: '5' })
      .expect(400);
  });

  it('suggests stations by code, name or city', async () => {
    const ctx = createTestContext();
    const res = await request(ctx.app).get('/api/trains/stations').query({ q: 'pune' }).expect(200);
    expect(res.body.data[0]).toMatchObject({ code: 'PUNE', name: 'Pune Junction' });
    const mumbai = await request(ctx.app)
      .get('/api/trains/stations')
      .query({ q: 'mumbai' })
      .expect(200);
    expect(mumbai.body.data.map((s: { code: string }) => s.code)).toEqual(
      expect.arrayContaining(['CSMT', 'MMCT']),
    );
  });
});

describe('availability and quotes', () => {
  it('refreshes one train live and quotes the total on the server', async () => {
    const ctx = createTestContext();
    const { train, option } = await pickAvailable(ctx);
    const fresh = await request(ctx.app)
      .get(`/api/trains/offers/${train.id}`)
      .query({ quota: 'GN' })
      .expect(200);
    expect(fresh.body.data.id).toBe(train.id);
    const q = await quote(ctx, train, option, 3);
    const fare = option.fare as NonNullable<TrainClassOption['fare']>;
    expect(q.perPassenger).toEqual(fare);
    expect(q.price.totalPaise).toBe(fare.totalPaise * 3);
    expect(q.price.lines[0]).toEqual({
      label: 'Base fare × 3 passengers',
      amountPaise: fare.basePaise * 3,
    });
    expect(q.demo).toBe(true);
  });

  it('returns 404 / 409 for unknown trains', async () => {
    const ctx = createTestContext();
    await request(ctx.app).get('/api/trains/offers/tr_Z9999_20261101_PUNE_NDLS').expect(404);
    await request(ctx.app)
      .post('/api/trains/quote')
      .send({
        offerId: 'tr_Z9999_20261101_PUNE_NDLS',
        travelClass: '3A',
        quota: 'GN',
        passengers: 1,
      })
      .expect(409);
  });

  it('warns before booking RAC or waitlisted tickets, and REGRET cannot be booked', async () => {
    const ctx = createTestContext();
    const provider = new MockTrainProvider(prisma);
    const train = (
      await provider.search({ from: 'PUNE', to: 'NDLS', date: daysAhead(12), quota: 'GN' })
    )[0] as TrainOffer;
    const option = train.classes.find((c) => c.travelClass === 'SL') as TrainClassOption;
    const runDate = new Date(`${train.date}T00:00:00Z`);
    const presold = presoldCount({
      trainNumber: train.trainNumber,
      runDate: train.date,
      travelClass: 'SL',
      quota: 'GN',
      today: localDate(new Date(), 'Asia/Kolkata'),
    });
    /** Sets this deployment's sales so the next seat has the given status. */
    const sellUntil = async (status: string) => {
      let extra = 0;
      while (
        availabilityAt({ travelClass: 'SL', quota: 'GN', sold: presold + extra }).status !== status
      )
        extra += 1;
      await prisma.trainInventory.upsert({
        where: {
          trainNumber_runDate_travelClass_quota: {
            trainNumber: train.trainNumber,
            runDate,
            travelClass: 'SL',
            quota: 'GN',
          },
        },
        create: {
          trainNumber: train.trainNumber,
          runDate,
          travelClass: 'SL',
          quota: 'GN',
          sold: extra,
        },
        update: { sold: extra },
      });
    };
    const quoteNow = async () =>
      (
        await request(ctx.app)
          .post('/api/trains/quote')
          .send({ offerId: train.id, travelClass: option.travelClass, quota: 'GN', passengers: 1 })
          .expect(200)
      ).body.data as TrainQuote;

    await sellUntil('RAC');
    const rac = await quoteNow();
    expect(rac.availability).toMatchObject({ status: 'RAC', label: 'RAC 1', bookable: true });
    expect(rac.warnings.join(' ')).toMatch(/not confirmed/);

    await sellUntil('WAITLIST');
    const wl = await quoteNow();
    expect(wl.availability).toMatchObject({ status: 'WAITLIST', label: 'GNWL 1', bookable: true });
    expect(wl.warnings.join(' ')).toMatch(/NOT a confirmed berth/);

    await sellUntil('REGRET');
    const regret = await quoteNow();
    expect(regret.availability).toMatchObject({ status: 'REGRET', bookable: false });
    const { accessToken } = await signUp(ctx);
    const res = await book(ctx, accessToken, train, option, regret.price.totalPaise * 2).expect(
      409,
    );
    expect(res.body.errorCode).toBe('SOLD_OUT');
  });

  it('books waitlisted passengers with their WL position and never claims a berth', async () => {
    const ctx = createTestContext();
    const provider = new MockTrainProvider(prisma);
    const train = (
      await provider.search({ from: 'PUNE', to: 'NDLS', date: daysAhead(12), quota: 'GN' })
    )[0] as TrainOffer;
    const option = train.classes.find((c) => c.travelClass === 'SL') as TrainClassOption;
    const presold = presoldCount({
      trainNumber: train.trainNumber,
      runDate: train.date,
      travelClass: 'SL',
      quota: 'GN',
      today: localDate(new Date(), 'Asia/Kolkata'),
    });
    let extra = 0;
    while (
      availabilityAt({ travelClass: 'SL', quota: 'GN', sold: presold + extra }).status !==
      'WAITLIST'
    )
      extra += 1;
    await prisma.trainInventory.create({
      data: {
        trainNumber: train.trainNumber,
        runDate: new Date(`${train.date}T00:00:00Z`),
        travelClass: 'SL',
        quota: 'GN',
        sold: extra,
      },
    });
    const { accessToken } = await signUp(ctx);
    const q = await quote(ctx, train, option, 2);
    const confirmOnly = await book(ctx, accessToken, train, option, q.price.totalPaise, {
      confirmOnly: true,
    }).expect(409);
    expect(confirmOnly.body.message).toMatch(/Confirmed berths are not available/);
    const reference = (await book(ctx, accessToken, train, option, q.price.totalPaise).expect(201))
      .body.data.reference as string;
    await pay(ctx, accessToken, reference);
    const b = await details(ctx, accessToken, reference);
    expect(b.status).toBe('CONFIRMED');
    expect(b.train?.passengers.map((p) => [p.status, p.bookingStatus, p.coach])).toEqual([
      ['WAITLIST', 'GNWL 1', null],
      ['WAITLIST', 'GNWL 2', null],
    ]);
    const list = await request(ctx.app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body.data[0].statusLabel).toBe('Booked · GNWL 1');
  });
});

describe('POST /api/trains/book', () => {
  it('requires sign-in and an Idempotency-Key', async () => {
    const ctx = createTestContext();
    await request(ctx.app).post('/api/trains/book').send({}).expect(401);
    const { accessToken } = await signUp(ctx);
    const res = await request(ctx.app)
      .post('/api/trains/book')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400);
    expect(res.body.details[0].path).toBe('headers.idempotency-key');
  });

  it('creates a booking awaiting payment with a server-calculated fare', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const { train, option } = await pickAvailable(ctx);
    const q = await quote(ctx, train, option, 2);
    const res = await book(ctx, accessToken, train, option, q.price.totalPaise).expect(201);
    const b = res.body.data as BookingDetails;
    expect(b).toMatchObject({
      serviceType: 'TRAIN',
      status: 'PENDING_PAYMENT',
      paymentStatus: 'CREATED',
    });
    expect(b.price.totalPaise).toBe(q.price.totalPaise);
    expect(b.train).toMatchObject({
      travelClass: option.travelClass,
      quota: 'GN',
      reservationStatus: 'PENDING',
      pnr: null,
      provider: 'mock',
    });
    expect(b.train?.passengers).toHaveLength(2);
    expect(b.passengers.map((p) => p.firstName)).toEqual(['Amit', 'Priya']);
    // Nothing is reserved before payment.
    expect(await prisma.trainInventory.count()).toBe(0);
  });

  it('applies a coupon made in the admin panel, counts it, and keeps refunds within what was paid', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const { train, option } = await pickAvailable(ctx);
    const q = await quote(ctx, train, option, 2);
    const gross = q.price.totalPaise;
    const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    await prisma.adminRecord.create({
      data: {
        id: 'cpn_train_test',
        collection: 'coupons',
        data: {
          id: 'cpn_train_test', code: 'TRAIN75', description: 'Rs 75 off train tickets', discountType: 'FLAT', value: 7_500,
          maxDiscountPaise: null, minOrderPaise: 0, services: ['TRAIN'], validFrom: day(-1), validTo: day(30),
          usageLimit: 3, perUserLimit: 1, usedCount: 0, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        },
      },
    });
    const withCode = (code: string, expected: number) =>
      request(ctx.app)
        .post('/api/trains/book')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          offerId: train.id, travelClass: option.travelClass, quota: option.quota, passengers: [passenger(0), passenger(1)],
          contact: { email: 'amit@example.com', phone: '+919876543210' }, confirmOnly: false, promoCode: code, expectedTotalPaise: expected,
        });

    const unknown = await withCode('NOSUCH', gross).expect(400);
    expect(unknown.body.details[0].path).toBe('body.promoCode');
    await withCode('TRAIN75', gross).expect(409); // the total must include the coupon
    const b = (await withCode('train75', gross - 7_500).expect(201)).body.data as BookingDetails;
    expect(b.price).toMatchObject({ discountPaise: 7_500, totalPaise: gross - 7_500 });
    // The passengers' refundable fares add up to what was paid for the fares, not the undiscounted amount.
    expect(b.train?.passengers.reduce((sum, p) => sum + p.farePaise, 0)).toBe(q.perPassenger.totalPaise * 2 - 7_500);

    const coupon = await prisma.adminRecord.findUniqueOrThrow({ where: { id: 'cpn_train_test' } });
    expect((coupon.data as { usedCount: number }).usedCount).toBe(1);
    await withCode('TRAIN75', gross - 7_500).expect(400); // one use per customer
  });

  it('returns the same booking when retried with the same key', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const { train, option } = await pickAvailable(ctx);
    const q = await quote(ctx, train, option, 2);
    const key = crypto.randomUUID();
    const [a, b] = await Promise.all([
      book(ctx, accessToken, train, option, q.price.totalPaise, { key }),
      book(ctx, accessToken, train, option, q.price.totalPaise, { key }),
    ]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.data.reference).toBe(b.body.data.reference);
    expect(await prisma.booking.count()).toBe(1);
  });

  it('refuses a changed price, invalid passengers and quota rules', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const { train, option } = await pickAvailable(ctx);
    const q = await quote(ctx, train, option, 2);
    const changed = await book(ctx, accessToken, train, option, q.price.totalPaise - 100).expect(
      409,
    );
    expect(changed.body.errorCode).toBe('PRICE_CHANGED');

    const young = await book(ctx, accessToken, train, option, q.price.totalPaise, {
      passengers: [passenger(0), passenger(1, { age: 3 })],
    }).expect(400);
    expect(young.body.details[0].path).toBe('body.passengers.1.age');

    const ladies = await book(ctx, accessToken, train, option, q.price.totalPaise, {
      quota: 'LD',
    }).expect(400);
    expect(ladies.body.details.map((d: { path: string }) => d.path)).toContain(
      'body.passengers.0.gender',
    );

    const seatClass = ['CC', 'EC', '2S'].includes(option.travelClass);
    const badBerth = await book(ctx, accessToken, train, option, q.price.totalPaise, {
      passengers: [
        passenger(0, { berthPreference: seatClass ? 'MIDDLE' : 'WINDOW' }),
        passenger(1),
      ],
    }).expect(400);
    expect(badBerth.body.details[0].path).toBe('body.passengers.0.berthPreference');
    expect(await prisma.booking.count()).toBe(0);
  });

  it('refuses classes that cannot be booked now', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const { train } = await pickAvailable(ctx);
    const tq = (
      await request(ctx.app)
        .get(`/api/trains/offers/${train.id}`)
        .query({ quota: 'TQ' })
        .expect(200)
    ).body.data as TrainOffer;
    const option = tq.classes.find((c) => c.fare) as TrainClassOption;
    const res = await book(ctx, accessToken, tq, option, (option.fare?.totalPaise ?? 1) * 2).expect(
      409,
    );
    expect(res.body.errorCode).toBe('SOLD_OUT');
  });
});

describe('payment, reservation and PNR', () => {
  it('confirms only after the provider issues a PNR, then serves the e-ticket', async () => {
    const ctx = createTestContext();
    const { accessToken, reference, quote: q } = await bookedAndPaid(ctx);
    const b = await details(ctx, accessToken, reference);
    expect(b).toMatchObject({ status: 'CONFIRMED', paymentStatus: 'SUCCESS' });
    expect(b.train?.reservationStatus).toBe('BOOKED');
    expect(b.train?.pnr).toMatch(/^ZD\d{8}$/);
    expect(b.train?.passengers.map((p) => p.status)).toEqual(['CONFIRMED', 'CONFIRMED']);
    expect(b.train?.passengers[0]?.bookingStatus).toMatch(/^CNF\/[A-Z]\d+\/\d+\//);
    expect(b.price.totalPaise).toBe(q.price.totalPaise);
    expect(ctx.email.sent.at(-1)?.subject).toMatch(/^\[DEMO\] Train ticket booked — PNR ZD\d{8}$/);

    const pdf = await request(ctx.app)
      .get(`/api/bookings/${reference}/ticket.pdf`)
      .set('Authorization', `Bearer ${accessToken}`)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

    const list = await request(ctx.app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body.data).toEqual([
      expect.objectContaining({
        reference,
        serviceType: 'TRAIN',
        status: 'CONFIRMED',
        statusLabel: 'Booked · Confirmed',
        title: expect.stringContaining('→'),
      }),
    ]);
    expect(await prisma.trainInventory.aggregate({ _sum: { sold: true } })).toMatchObject({
      _sum: { sold: 2 },
    });
  });

  it('refunds in full when the railway refuses after payment', async () => {
    const ctx = createTestContext();
    const {
      accessToken,
      reference,
      quote: q,
    } = await bookedAndPaid(ctx, { email: 'amit+railfail@example.com' });
    const b = await details(ctx, accessToken, reference);
    expect(b).toMatchObject({ status: 'REFUNDED', paymentStatus: 'REFUNDED' });
    expect(b.train).toMatchObject({ reservationStatus: 'FAILED', pnr: null });
    expect(b.train?.failureReason).toMatch(/declined/);
    expect(b.train?.refunds).toEqual([
      expect.objectContaining({
        amountPaise: q.price.totalPaise,
        status: 'COMPLETED',
        gatewayReference: expect.stringMatching(/^mockrfnd_/),
      }),
    ]);
    // A ticket is never served for it.
    await request(ctx.app)
      .get(`/api/bookings/${reference}/ticket.pdf`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);
  });

  it('keeps a paid booking PROCESSING until the provider answers, then reconciles it', async () => {
    const ctx = createTestContext();
    const { accessToken, reference } = await bookedAndPaid(ctx, {
      email: 'amit+railpending@example.com',
    });
    const pending = await details(ctx, accessToken, reference);
    expect(pending).toMatchObject({ status: 'PROCESSING', paymentStatus: 'SUCCESS' });
    expect(pending.train).toMatchObject({ reservationStatus: 'PENDING', pnr: null });
    expect(pending.train?.providerReference).toMatch(/^MOCKTXN-/);
    await request(ctx.app)
      .get(`/api/bookings/${reference}/ticket.pdf`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);

    const refreshed = await request(ctx.app)
      .post(`/api/trains/bookings/${reference}/refresh`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(refreshed.body.data.status).toBe('CONFIRMED');
    expect(refreshed.body.data.train.pnr).toMatch(/^ZD\d{8}$/);
  });

  it('stays PROCESSING when the provider times out, and the reconciliation job finishes it', async () => {
    let calls = 0;
    class Flaky extends MockTrainProvider {
      override async book(req: ProviderBookingRequest): Promise<ProviderBookingResult> {
        calls += 1;
        if (calls === 1) throw new TrainProviderTimeoutError('book', 15_000);
        return super.book(req);
      }
    }
    const provider = resilientTrainProvider(new Flaky(prisma), {
      timeoutMs: 2000,
      retries: 2,
      logger: pino({ level: 'silent' }),
      backoffMs: 1,
    });
    const ctx = createTestContext({ providers: { trains: provider } });
    const { accessToken, reference } = await bookedAndPaid(ctx);
    expect((await details(ctx, accessToken, reference)).status).toBe('PROCESSING');
    expect(calls).toBe(1); // bookings are never retried blindly
    await prisma.trainBooking.updateMany({
      data: { lastCheckedAt: new Date(Date.now() - 120_000) },
    });
    expect(await ctx.services.trainReservations.reconcilePending()).toBe(1);
    const done = await details(ctx, accessToken, reference);
    expect(done.status).toBe('CONFIRMED');
    expect(done.train?.pnr).toMatch(/^ZD/);
    expect(calls).toBe(2);
  });

  it("hides other users' train bookings, but not from support", async () => {
    const ctx = createTestContext();
    const { reference } = await bookedAndPaid(ctx);
    const other = await signUp(ctx);
    await request(ctx.app)
      .get(`/api/bookings/${reference}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(404);
    await request(ctx.app)
      .post(`/api/trains/bookings/${reference}/refresh`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(404);
    await request(ctx.app)
      .post(`/api/trains/bookings/${reference}/cancel`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ passengerIds: ['x'] })
      .expect(404);
    const agent = await signUp(ctx);
    await grantRole(agent.body.data.user.id, 'SUPPORT');
    const refreshed = await request(ctx.app)
      .post('/api/auth/refresh')
      .set('Cookie', agent.cookie)
      .expect(200);
    const staff = `Bearer ${refreshed.body.data.accessToken}`;
    await request(ctx.app)
      .get(`/api/bookings/${reference}`)
      .set('Authorization', staff)
      .expect(200);
    await request(ctx.app)
      .post(`/api/trains/bookings/${reference}/refresh`)
      .set('Authorization', staff)
      .expect(200);
    // Support can look, but only the owner cancels.
    await request(ctx.app)
      .post(`/api/trains/bookings/${reference}/cancel`)
      .set('Authorization', staff)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ passengerIds: ['x'] })
      .expect(404);
  });
});

describe('cancellation and refunds', () => {
  it('quotes, cancels one passenger, refunds the rest of the fare, then cancels the rest', async () => {
    const ctx = createTestContext();
    const { accessToken, reference } = await bookedAndPaid(ctx);
    const auth = { Authorization: `Bearer ${accessToken}` };
    const b = await details(ctx, accessToken, reference);
    const [first, second] = b.passengers;

    const q = await request(ctx.app)
      .post(`/api/trains/bookings/${reference}/cancellation-quote`)
      .set(auth)
      .send({ passengerIds: [first?.id] })
      .expect(200);
    expect(q.body.data).toMatchObject({ eligible: true, demo: true });
    expect(q.body.data.chargesPaise).toBeGreaterThan(0);
    expect(q.body.data.refundPaise).toBe(q.body.data.farePaise - q.body.data.chargesPaise);

    const key = crypto.randomUUID();
    const partial = await request(ctx.app)
      .post(`/api/trains/bookings/${reference}/cancel`)
      .set(auth)
      .set('Idempotency-Key', key)
      .send({ passengerIds: [first?.id] })
      .expect(200);
    const p = partial.body.data as BookingDetails;
    expect(p.status).toBe('CONFIRMED');
    expect(p.paymentStatus).toBe('PARTIALLY_REFUNDED');
    expect(p.train?.reservationStatus).toBe('PARTIALLY_CANCELLED');
    expect(p.train?.passengers.map((x) => x.status)).toEqual(['CANCELLED', 'CONFIRMED']);
    expect(p.train?.refunds).toEqual([
      expect.objectContaining({ amountPaise: q.body.data.refundPaise, status: 'COMPLETED' }),
    ]);

    // Retrying the same request does not cancel or refund twice.
    await request(ctx.app)
      .post(`/api/trains/bookings/${reference}/cancel`)
      .set(auth)
      .set('Idempotency-Key', key)
      .send({ passengerIds: [first?.id] })
      .expect(200);
    expect(await prisma.refund.count()).toBe(1);
    expect(await prisma.trainCancellation.count()).toBe(1);

    // The cancelled passenger cannot be cancelled again.
    const again = await request(ctx.app)
      .post(`/api/trains/bookings/${reference}/cancel`)
      .set(auth)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ passengerIds: [first?.id] })
      .expect(409);
    expect(again.body.errorCode).toBe('INVALID_STATE');

    const rest = await request(ctx.app)
      .post(`/api/trains/bookings/${reference}/cancel`)
      .set(auth)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ passengerIds: [second?.id] })
      .expect(200);
    expect(rest.body.data).toMatchObject({
      status: 'REFUNDED',
      paymentStatus: 'PARTIALLY_REFUNDED',
    });
    expect(rest.body.data.train.reservationStatus).toBe('CANCELLED');
    expect(await prisma.trainInventory.aggregate({ _sum: { sold: true } })).toMatchObject({
      _sum: { sold: 0 },
    });
  });

  it('refuses cancellation after the chart is prepared', async () => {
    const ctx = createTestContext();
    const { accessToken, reference } = await bookedAndPaid(ctx);
    await prisma.trainBooking.updateMany({
      data: { departureAt: new Date(Date.now() + 60 * 60_000) },
    });
    const b = await details(ctx, accessToken, reference);
    const q = await request(ctx.app)
      .post(`/api/trains/bookings/${reference}/cancellation-quote`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ passengerIds: [b.passengers[0]?.id] })
      .expect(200);
    expect(q.body.data).toMatchObject({ eligible: false });
    expect(q.body.data.reason).toMatch(/chart/);
  });

  it('cannot cancel a booking that is not booked yet', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const { train, option } = await pickAvailable(ctx);
    const q = await quote(ctx, train, option, 2);
    const created = (await book(ctx, accessToken, train, option, q.price.totalPaise).expect(201))
      .body.data as BookingDetails;
    const res = await request(ctx.app)
      .post(`/api/trains/bookings/${created.reference}/cancel`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ passengerIds: [created.passengers[0]?.id] })
      .expect(409);
    expect(res.body.message).toMatch(/PNR/);
  });
});

describe('live status', () => {
  it('says plainly that live status needs a provider (no invented data)', async () => {
    const ctx = createTestContext();
    const res = await request(ctx.app)
      .get('/api/trains/Z2101/live-status')
      .query({ date: daysAhead(1) })
      .expect(200);
    expect(res.body.data).toMatchObject({
      supported: false,
      stations: [],
      delayMinutes: null,
      lastUpdatedAt: null,
    });
  });
});
