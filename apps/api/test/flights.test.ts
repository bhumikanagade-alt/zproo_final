import type { FlightOffer } from '@zproo/types';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, grantRole, prisma, resetUsers, signUp } from './helpers';

beforeEach(resetUsers);

/** A date comfortably inside the bookable window, as YYYY-MM-DD. */
/** The first Monday at least `days` from today (IST-agnostic: dates are calendar days). */
function nextMonday(days: number): string {
  for (let d = days; ; d += 1) {
    const date = daysAhead(d);
    if (new Date(`${date}T12:00:00Z`).getUTCDay() === 1) return date;
  }
}

function daysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

const adult = {
  type: 'ADULT',
  title: 'MR',
  firstName: 'Amit',
  lastName: 'Sharma',
  gender: 'MALE',
  // Domestic adults travel on a government photo ID (a checksum-valid Aadhaar number).
  identityDocument: { type: 'AADHAAR', number: '234567890124', nationality: 'IN' },
} as const;

type Ctx = ReturnType<typeof createTestContext>;

async function searchOffers(ctx: Ctx, query: Record<string, string> = {}): Promise<FlightOffer[]> {
  const res = await request(ctx.app)
    .get('/api/flights/search')
    .query({ from: 'PNQ', to: 'DEL', date: daysAhead(20), ...query })
    .expect(200);
  return res.body.data.legs[0].offers as FlightOffer[];
}

function book(
  ctx: Ctx,
  token: string,
  offer: FlightOffer,
  options: { key?: string; passengers?: object[]; expectedTotalPaise?: number } = {},
) {
  return request(ctx.app)
    .post('/api/flights/book')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', options.key ?? crypto.randomUUID())
    .send({
      offerIds: [offer.id],
      passengers: options.passengers ?? [adult],
      contact: { email: 'amit@example.com', phone: '+919876543210' },
      expectedTotalPaise: options.expectedTotalPaise ?? offer.totalPaise,
    });
}

/** Signs up, books the cheapest PNQ→DEL fare for one adult and returns the booking. */
async function bookedFlight(ctx: Ctx) {
  const user = await signUp(ctx);
  const [offer] = await searchOffers(ctx);
  if (!offer) throw new Error('No offers');
  const res = await book(ctx, user.accessToken, offer).expect(201);
  return { user, offer, reference: res.body.data.reference as string };
}

async function payWithMock(
  ctx: Ctx,
  token: string,
  reference: string,
  outcome: 'success' | 'failure' = 'success',
) {
  const order = await request(ctx.app)
    .post('/api/payments/create')
    .set('Authorization', `Bearer ${token}`)
    .send({ bookingReference: reference })
    .expect(201);
  return request(ctx.app)
    .post('/api/payments/mock/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({ paymentId: order.body.data.paymentId, outcome })
    .expect(200);
}

describe('GET /api/flights/search', () => {
  it('returns priced, demo-flagged offers sorted by price', async () => {
    const ctx = createTestContext();
    const res = await request(ctx.app)
      .get('/api/flights/search')
      // A Monday: every Pune → Delhi service operates then, so the result has several offers.
      .query({ from: 'PNQ', to: 'DEL', date: nextMonday(20), adults: '2', children: '1' })
      .expect(200);
    expect(res.headers['cache-control']).toBe('private, max-age=60');
    const { data } = res.body;
    expect(data).toMatchObject({
      demo: true,
      cabin: 'ECONOMY',
      passengers: { adults: 2, children: 1, infants: 0 },
    });
    const offers = data.legs[0].offers as FlightOffer[];
    expect(offers.length).toBeGreaterThan(2);
    const totals = offers.map((o) => o.totalPaise);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
    for (const o of offers) {
      expect(o).toMatchObject({ from: { code: 'PNQ' }, to: { code: 'DEL' }, cabin: 'ECONOMY' });
      expect(o.totalPaise).toBe(2 * o.fares.ADULT.totalPaise + o.fares.CHILD.totalPaise);
      expect(o.seatsLeft).toBeGreaterThanOrEqual(3);
    }
  });

  it('includes one-stop connections with layovers', async () => {
    const offers = await searchOffers(createTestContext(), { to: 'SXR' });
    const connection = offers.find((o) => o.stops === 1);
    expect(connection?.segments).toHaveLength(2);
    expect(connection?.layovers[0]?.airport.code).toBe('DEL');
  });

  it('returns both legs for a round trip', async () => {
    const res = await request(createTestContext().app)
      .get('/api/flights/search')
      .query({
        trip: 'ROUND_TRIP',
        from: 'BOM',
        to: 'GOI',
        date: daysAhead(20),
        return: daysAhead(24),
      })
      .expect(200);
    const legs = res.body.data.legs as { from: string; to: string; date: string }[];
    expect(legs.map((l) => `${l.from}-${l.to}@${l.date}`)).toEqual([
      `BOM-GOI@${daysAhead(20)}`,
      `GOI-BOM@${daysAhead(24)}`,
    ]);
  });

  it('rejects invalid searches with field errors', async () => {
    const res = await request(createTestContext().app)
      .get('/api/flights/search')
      .query({ from: 'PNQ', to: 'PNQ', date: daysAhead(20) })
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'query.legs.0.to' })]),
    );
  });

  it('returns no offers for an unserved route', async () => {
    expect(await searchOffers(createTestContext(), { from: 'SXR', to: 'DXB' })).toEqual([]);
  });
});

describe('GET /api/flights/:offerId', () => {
  it('re-prices an offer for the requested passengers', async () => {
    const ctx = createTestContext();
    const [offer] = await searchOffers(ctx);
    const res = await request(ctx.app)
      .get(`/api/flights/${offer?.id}`)
      .query({ adults: '2' })
      .expect(200);
    expect(res.body.data.id).toBe(offer?.id);
    expect(res.body.data.totalPaise).toBe(2 * (offer?.fares.ADULT.totalPaise ?? 0));
  });

  it('returns 404 for an unknown offer', async () => {
    const res = await request(createTestContext().app)
      .get('/api/flights/mk_nope_20300101_E')
      .expect(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/flights/book', () => {
  it('requires sign-in and an Idempotency-Key', async () => {
    const ctx = createTestContext();
    const [offer] = await searchOffers(ctx);
    await request(ctx.app).post('/api/flights/book').send({}).expect(401);
    const { accessToken } = await signUp(ctx);
    const res = await request(ctx.app)
      .post('/api/flights/book')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ offerIds: [offer?.id] })
      .expect(400);
    expect(res.body.details).toEqual([
      expect.objectContaining({ path: 'headers.idempotency-key' }),
    ]);
  });

  it('holds seats and creates a booking awaiting payment', async () => {
    const ctx = createTestContext();
    const { user, offer, reference } = await bookedFlight(ctx);
    expect(reference).toMatch(/^ZP-\d{4}-[0-9A-Z]{6}$/);

    const res = await request(ctx.app)
      .get(`/api/bookings/${reference}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);
    expect(res.body.data).toMatchObject({
      status: 'PENDING_PAYMENT',
      paymentStatus: 'CREATED',
      price: { totalPaise: offer.totalPaise, feesPaise: 0 },
      passengers: [{ firstName: 'Amit', lastName: 'Sharma', type: 'ADULT' }],
      flights: [{ sequence: 1, pnr: null, offer: { id: offer.id } }],
    });
    expect(Date.parse(res.body.data.holdExpiresAt)).toBeGreaterThan(Date.now() + 14 * 60_000);

    const inventory = await prisma.flightInventory.findFirstOrThrow();
    expect(inventory.sold).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: 'BOOKING_CREATED' } })).toBe(1);
  });

  it('returns the same booking when retried with the same key', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const [offer] = await searchOffers(ctx);
    if (!offer) throw new Error('No offers');
    const key = crypto.randomUUID();
    const [a, b] = await Promise.all([
      book(ctx, accessToken, offer, { key }),
      book(ctx, accessToken, offer, { key }),
    ]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.data.reference).toBe(b.body.data.reference);
    const again = await book(ctx, accessToken, offer, { key }).expect(201);
    expect(again.body.data.reference).toBe(a.body.data.reference);
    expect(await prisma.booking.count()).toBe(1);
    expect((await prisma.flightInventory.findFirstOrThrow()).sold).toBe(1);
  });

  it('refuses when the price the customer saw has changed', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const [offer] = await searchOffers(ctx);
    if (!offer) throw new Error('No offers');
    const res = await book(ctx, accessToken, offer, {
      expectedTotalPaise: offer.totalPaise - 100,
    }).expect(409);
    expect(res.body).toMatchObject({
      errorCode: 'PRICE_CHANGED',
      details: [
        { path: 'body.expectedTotalPaise', message: expect.stringMatching(/^The new total is ₹/) },
      ],
    });
    expect(await prisma.booking.count()).toBe(0);
  });

  it('refuses an offer that does not exist', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const [offer] = await searchOffers(ctx);
    if (!offer) throw new Error('No offers');
    const res = await book(ctx, accessToken, { ...offer, id: 'mk_missing_20300101_E' }).expect(409);
    expect(res.body.errorCode).toBe('OFFER_EXPIRED');
  });

  it('checks passenger ages against the travel date', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const [offer] = await searchOffers(ctx, { children: '1' });
    if (!offer) throw new Error('No offers');
    const child = {
      type: 'CHILD',
      title: 'MSTR',
      firstName: 'Kabir',
      lastName: 'Sharma',
      gender: 'MALE',
      dateOfBirth: '1990-01-01',
    };
    const res = await book(ctx, accessToken, offer, { passengers: [adult, child] }).expect(400);
    expect(res.body.details).toEqual([
      {
        path: 'body.passengers.1.dateOfBirth',
        message: 'On the travel date this passenger is an adult (12+)',
      },
    ]);
  });

  it('requires a valid government ID for every adult on a domestic flight', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const [offer] = await searchOffers(ctx);
    if (!offer) throw new Error('No offers');
    const missing = await book(ctx, accessToken, offer, {
      passengers: [{ ...adult, identityDocument: undefined }],
    }).expect(400);
    expect(missing.body.details).toEqual([
      expect.objectContaining({ path: 'body.passengers.0.identityDocument.type' }),
      expect.objectContaining({
        path: 'body.passengers.0.identityDocument.number',
        message: 'Enter ID number',
      }),
    ]);

    // 234567890123 has a wrong last digit, so the Aadhaar checksum fails.
    const badChecksum = await book(ctx, accessToken, offer, {
      passengers: [
        { ...adult, identityDocument: { type: 'AADHAAR', number: '234567890123', nationality: 'IN' } },
      ],
    }).expect(400);
    expect(badChecksum.body.details).toEqual([
      expect.objectContaining({ path: 'body.passengers.0.identityDocument.number' }),
    ]);

    const foreign = await book(ctx, accessToken, offer, {
      passengers: [
        { ...adult, identityDocument: { type: 'AADHAAR', number: '234567890124', nationality: 'US' } },
      ],
    }).expect(400);
    expect(foreign.body.details).toEqual([
      expect.objectContaining({
        path: 'body.passengers.0.identityDocument.type',
        message: 'Foreign nationals must use a passport on domestic flights',
      }),
    ]);
  });

  it('refuses the same ID number for two travellers', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const [offer] = await searchOffers(ctx, { adults: '2' });
    if (!offer) throw new Error('No offers');
    const res = await book(ctx, accessToken, offer, {
      passengers: [adult, { ...adult, firstName: 'Neha', title: 'MS', gender: 'FEMALE' }],
    }).expect(400);
    expect(res.body.details).toEqual([
      expect.objectContaining({ path: 'body.passengers.0.identityDocument.number' }),
      expect.objectContaining({ path: 'body.passengers.1.identityDocument.number' }),
    ]);
  });

  it('keeps the ID details with the booking', async () => {
    const ctx = createTestContext();
    const { reference } = await bookedFlight(ctx);
    const stored = await prisma.booking.findFirstOrThrow({ where: { reference } });
    expect((stored.metadata as { identityDocuments?: unknown }).identityDocuments).toEqual([
      { type: 'AADHAAR', number: '234567890124', nationality: 'IN' },
    ]);
  });

  it('never oversells when the last seats go at the same time', async () => {
    const ctx = createTestContext();
    const [offer] = await searchOffers(ctx);
    if (!offer) throw new Error('No offers');
    const [, flightId, ymd] = /^mk_([a-z0-9]+)_(\d{8})_E$/.exec(offer.id) ?? [];
    const date = new Date(`${ymd?.slice(0, 4)}-${ymd?.slice(4, 6)}-${ymd?.slice(6)}T00:00:00Z`);
    // Leave exactly one seat on the service.
    await prisma.flightInventory.create({
      data: { flightId: flightId as string, date, cabin: 'ECONOMY', capacity: 10, sold: 9 },
    });

    const users = await Promise.all([signUp(ctx), signUp(ctx), signUp(ctx)]);
    const results = await Promise.all(users.map((u) => book(ctx, u.accessToken, offer)));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect(results.find((r) => r.status === 409)?.body.errorCode).toBe('SOLD_OUT');
    expect((await prisma.flightInventory.findFirstOrThrow()).sold).toBe(10);
  });
});

/** A coupon as the admin panel stores it (Marketing → Coupons). */
async function createCoupon(id: string, code: string, extra: Record<string, unknown> = {}) {
  const day = (n: number) => daysAhead(n);
  await prisma.adminRecord.create({
    data: {
      id,
      collection: 'coupons',
      data: {
        id, code, description: `Test coupon ${code}`, discountType: 'FLAT', value: 7_500, maxDiscountPaise: null,
        minOrderPaise: 0, services: ['FLIGHT'], validFrom: day(-1), validTo: day(30), usageLimit: null, perUserLimit: 1,
        usedCount: 0, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra,
      },
    },
  });
}

describe('flight coupons made in the admin panel', () => {
  const withCode = (ctx: Ctx, token: string, offer: FlightOffer, code: string, expected: number) =>
    request(ctx.app)
      .post('/api/flights/book')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        offerIds: [offer.id],
        passengers: [adult],
        contact: { email: 'amit@example.com', phone: '+919876543210' },
        promoCode: code,
        expectedTotalPaise: expected,
      });

  it('shows a flight coupon to customers, applies it to the booking, charges the discounted total and counts the use', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const [offer] = await searchOffers(ctx);
    if (!offer) throw new Error('No offers');
    const gross = offer.totalPaise;
    await createCoupon('cpn_flight_test', 'FLY75', { usageLimit: 3 });
    await createCoupon('cpn_bus_only', 'BUSONLY', { services: ['BUS'] });

    // Customers see it for flights (not the bus-only one), and the Apply button gets the discount.
    const listed = await request(ctx.app).get('/api/coupons/public').query({ service: 'FLIGHT' }).expect(200);
    expect((listed.body.data as { code: string }[]).map((c) => c.code)).toEqual(['FLY75']);
    const checked = await request(ctx.app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: 'fly75', service: 'FLIGHT', orderPaise: gross })
      .expect(200);
    expect(checked.body.data).toMatchObject({ code: 'FLY75', discountPaise: 7_500 });

    // Refusals say why.
    const unknown = await withCode(ctx, accessToken, offer, 'NOSUCH', gross).expect(400);
    expect(unknown.body.details[0].path).toBe('body.promoCode');
    const wrongService = await withCode(ctx, accessToken, offer, 'BUSONLY', gross).expect(400);
    expect(wrongService.body.details[0]).toMatchObject({ path: 'body.promoCode', message: 'This coupon does not apply to this service' });
    const stale = await withCode(ctx, accessToken, offer, 'FLY75', gross).expect(409); // the total must include the coupon
    expect(stale.body.errorCode).toBe('PRICE_CHANGED');

    const booked = await withCode(ctx, accessToken, offer, 'fly75', gross - 7_500).expect(201);
    expect(booked.body.data.price).toMatchObject({ discountPaise: 7_500, totalPaise: gross - 7_500 });
    const stored = await prisma.booking.findFirstOrThrow({ where: { reference: booked.body.data.reference } });
    expect(stored).toMatchObject({ discountAmountPaise: 7_500, totalAmountPaise: gross - 7_500 });
    expect((stored.metadata as { promoCode?: string }).promoCode).toBe('FLY75');

    // The customer pays the discounted amount.
    const order = await request(ctx.app)
      .post('/api/payments/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bookingReference: booked.body.data.reference })
      .expect(201);
    expect(order.body.data.amountPaise).toBe(gross - 7_500);

    // The admin panel's "Used" column moved, and the customer cannot use it twice.
    const coupon = await prisma.adminRecord.findUniqueOrThrow({ where: { id: 'cpn_flight_test' } });
    expect((coupon.data as { usedCount: number }).usedCount).toBe(1);
    const again = await withCode(ctx, accessToken, offer, 'FLY75', gross - 7_500).expect(400);
    expect(again.body.details[0].message).toMatch(/already used/);
  });

  it('takes a percentage coupon off the total (up to its cap) and honours the minimum order', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const [offer] = await searchOffers(ctx);
    if (!offer) throw new Error('No offers');
    await createCoupon('cpn_flight_pct', 'FLY10', { discountType: 'PERCENT', value: 10, maxDiscountPaise: 50_000 });
    await createCoupon('cpn_flight_big', 'FLYBIG', { minOrderPaise: offer.totalPaise + 100 });

    const tooSmall = await withCode(ctx, accessToken, offer, 'FLYBIG', offer.totalPaise).expect(400);
    expect(tooSmall.body.details[0].message).toMatch(/^Spend at least ₹/);

    const discount = Math.min(Math.floor(offer.totalPaise / 10), 50_000);
    const booked = await withCode(ctx, accessToken, offer, 'FLY10', offer.totalPaise - discount).expect(201);
    expect(booked.body.data.price).toMatchObject({ discountPaise: discount, totalPaise: offer.totalPaise - discount });
  });

  it('refuses a coupon that is switched off or has expired, and one that would cover the whole fare', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const [offer] = await searchOffers(ctx);
    if (!offer) throw new Error('No offers');
    await createCoupon('cpn_off', 'FLYOFF', { active: false });
    await createCoupon('cpn_old', 'FLYOLD', { validFrom: daysAhead(-30), validTo: daysAhead(-2) });
    await createCoupon('cpn_free', 'FLYFREE', { value: offer.totalPaise + 1_000 });

    const off = await withCode(ctx, accessToken, offer, 'FLYOFF', offer.totalPaise).expect(400);
    expect(off.body.details[0].message).toBe('This coupon is not active');
    const old = await withCode(ctx, accessToken, offer, 'FLYOLD', offer.totalPaise).expect(400);
    expect(old.body.details[0].message).toBe('This coupon has expired');
    const free = await withCode(ctx, accessToken, offer, 'FLYFREE', 1).expect(400);
    expect(free.body.details[0].path).toBe('body.promoCode');
    expect(await prisma.booking.count()).toBe(0); // nothing was booked or held
  });

  it('still books at the plain fare when no coupon is sent', async () => {
    const ctx = createTestContext();
    const { reference, offer } = await bookedFlight(ctx);
    const stored = await prisma.booking.findFirstOrThrow({ where: { reference } });
    expect(stored).toMatchObject({ discountAmountPaise: 0, totalAmountPaise: offer.totalPaise });
  });
});

describe('payments', () => {
  it('confirms the booking, issues tickets and serves the e-ticket', async () => {
    const ctx = createTestContext();
    const { user, reference } = await bookedFlight(ctx);
    const auth = { Authorization: `Bearer ${user.accessToken}` };

    await request(ctx.app).get(`/api/bookings/${reference}/ticket.pdf`).set(auth).expect(409);

    const paid = await payWithMock(ctx, user.accessToken, reference);
    expect(paid.body.data).toEqual({ reference, status: 'SUCCESS' });

    const details = await request(ctx.app).get(`/api/bookings/${reference}`).set(auth).expect(200);
    expect(details.body.data).toMatchObject({
      status: 'CONFIRMED',
      paymentStatus: 'SUCCESS',
      holdExpiresAt: null,
    });
    expect(details.body.data.flights[0].pnr).toMatch(/^[A-Z0-9]{6}$/);
    expect(details.body.data.flights[0].tickets).toHaveLength(1);

    const pdf = await request(ctx.app)
      .get(`/api/bookings/${reference}/ticket.pdf`)
      .set(auth)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.headers['content-disposition']).toMatch(/^attachment; filename="ZPROO GO_\d{4}-\d{2}-\d{2}_Ticket\.pdf"$/);
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

    const list = await request(ctx.app).get('/api/bookings').set(auth).expect(200);
    expect(list.body.data).toEqual([
      expect.objectContaining({ reference, status: 'CONFIRMED', title: 'PNQ → DEL' }),
    ]);
  });

  it('reuses the open payment order for the booking', async () => {
    const ctx = createTestContext();
    const { user, reference } = await bookedFlight(ctx);
    const create = () =>
      request(ctx.app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ bookingReference: reference })
        .expect(201);
    const first = await create();
    const second = await create();
    expect(second.body.data.paymentId).toBe(first.body.data.paymentId);
    expect(first.body.data.amountPaise).toBe(
      (await prisma.booking.findFirstOrThrow()).totalAmountPaise,
    );
  });

  it('rejects a forged payment signature', async () => {
    const ctx = createTestContext();
    const { user, reference } = await bookedFlight(ctx);
    const order = await request(ctx.app)
      .post('/api/payments/create')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ bookingReference: reference })
      .expect(201);
    const res = await request(ctx.app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        paymentId: order.body.data.paymentId,
        providerPaymentId: 'pay_forged123',
        signature: 'a'.repeat(64),
      })
      .expect(402);
    expect(res.body.errorCode).toBe('PAYMENT_ERROR');
    expect((await prisma.booking.findFirstOrThrow()).status).toBe('PENDING_PAYMENT');
    expect(await prisma.auditLog.count({ where: { action: 'PAYMENT_SIGNATURE_INVALID' } })).toBe(1);
  });

  it('lets the customer retry after a failed payment', async () => {
    const ctx = createTestContext();
    const { user, reference } = await bookedFlight(ctx);
    const failed = await payWithMock(ctx, user.accessToken, reference, 'failure');
    expect(failed.body.data.status).toBe('FAILED');
    await payWithMock(ctx, user.accessToken, reference);
    expect(
      await prisma.payment.findMany({ select: { status: true }, orderBy: { createdAt: 'asc' } }),
    ).toEqual([{ status: 'FAILED' }, { status: 'SUCCESS' }]);
  });

  it('refuses payment once the seat hold has expired and records the refund due', async () => {
    const ctx = createTestContext();
    const { user, reference } = await bookedFlight(ctx);
    const order = await request(ctx.app)
      .post('/api/payments/create')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ bookingReference: reference })
      .expect(201);
    await prisma.booking.updateMany({ data: { holdExpiresAt: new Date(Date.now() - 1000) } });

    const res = await request(ctx.app)
      .post('/api/payments/mock/complete')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ paymentId: order.body.data.paymentId, outcome: 'success' })
      .expect(409);
    expect(res.body.errorCode).toBe('BOOKING_EXPIRED');
    expect(await prisma.payment.findFirstOrThrow()).toMatchObject({
      status: 'FAILED',
      failureReason: expect.stringMatching(/refund due/),
    });
    await request(ctx.app)
      .post('/api/payments/create')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ bookingReference: reference })
      .expect(409);
  });

  it('cancels expired holds and returns their seats', async () => {
    const ctx = createTestContext();
    await bookedFlight(ctx);
    await prisma.booking.updateMany({ data: { holdExpiresAt: new Date(Date.now() - 1000) } });
    expect(await ctx.services.bookings.expireHolds()).toBe(1);
    expect(await prisma.booking.findFirstOrThrow()).toMatchObject({
      status: 'CANCELLED',
      cancellationReason: 'HOLD_EXPIRED',
    });
    expect((await prisma.flightInventory.findFirstOrThrow()).sold).toBe(0);
    expect(await ctx.services.bookings.expireHolds()).toBe(0);
  });
});

describe('booking access', () => {
  it("hides other users' bookings and payments behind 404", async () => {
    const ctx = createTestContext();
    const { reference } = await bookedFlight(ctx);
    const stranger = await signUp(ctx);
    const auth = { Authorization: `Bearer ${stranger.accessToken}` };
    await request(ctx.app).get(`/api/bookings/${reference}`).set(auth).expect(404);
    await request(ctx.app).get(`/api/bookings/${reference}/ticket.pdf`).set(auth).expect(404);
    await request(ctx.app)
      .post('/api/payments/create')
      .set(auth)
      .send({ bookingReference: reference })
      .expect(404);
    expect((await request(ctx.app).get('/api/bookings').set(auth).expect(200)).body.data).toEqual(
      [],
    );
  });

  it('lets support staff read any booking', async () => {
    const ctx = createTestContext();
    const { reference } = await bookedFlight(ctx);
    const agent = await signUp(ctx);
    await grantRole(agent.body.data.user.id, 'SUPPORT');
    // Refresh so the new access token carries the role.
    const refreshed = await request(ctx.app)
      .post('/api/auth/refresh')
      .set('Cookie', agent.cookie)
      .expect(200);
    const res = await request(ctx.app)
      .get(`/api/bookings/${reference}`)
      .set('Authorization', `Bearer ${refreshed.body.data.accessToken}`)
      .expect(200);
    expect(res.body.data.reference).toBe(reference);
  });

  it('validates the booking reference format', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    await request(ctx.app)
      .get('/api/bookings/not-a-ref')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });
});
