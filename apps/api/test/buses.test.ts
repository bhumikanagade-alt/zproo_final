import type { BusSeatInfo, BusSeatMap, BusTripOffer } from '@zproo/types';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, grantRole, prisma, resetUsers, signUp } from './helpers';

beforeEach(resetUsers);

type Ctx = ReturnType<typeof createTestContext>;

function daysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function searchTrips(ctx: Ctx, query: Record<string, string> = {}): Promise<BusTripOffer[]> {
  const res = await request(ctx.app)
    .get('/api/buses/search')
    .query({ from: 'pune', to: 'mumbai', date: daysAhead(10), ...query })
    .expect(200);
  return res.body.data.trips as BusTripOffer[];
}

async function seatMap(ctx: Ctx, tripId: string): Promise<BusSeatMap> {
  return (await request(ctx.app).get(`/api/buses/${tripId}/seats`).expect(200)).body
    .data as BusSeatMap;
}

const allSeats = (map: BusSeatMap) => map.decks.flatMap((d) => d.seats);
const openSeats = (map: BusSeatMap, ladies = false) =>
  allSeats(map).filter((s) => s.available && s.ladiesOnly === ladies);

/** A trip (Pune → Mumbai, 10 days out) with at least `n` open general seats. */
async function pickTrip(ctx: Ctx, n = 2) {
  for (const trip of await searchTrips(ctx)) {
    const map = await seatMap(ctx, trip.id);
    const seats = openSeats(map);
    if (seats.length >= n) return { trip, map, seats: seats.slice(0, n) };
  }
  throw new Error('No trip with enough seats');
}

const traveller = (seat: BusSeatInfo, i = 0) => ({
  seatNumber: seat.number,
  firstName: ['Amit', 'Priya', 'Kabir'][i] ?? 'Amit',
  lastName: 'Sharma',
  age: [34, 31, 8][i] ?? 30,
  gender: i === 1 ? 'FEMALE' : 'MALE',
});

function book(
  ctx: Ctx,
  token: string,
  trip: BusTripOffer,
  seats: BusSeatInfo[],
  options: {
    key?: string;
    passengers?: object[];
    expectedTotalPaise?: number;
    boardingPointId?: string;
  } = {},
) {
  return request(ctx.app)
    .post('/api/buses/book')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', options.key ?? crypto.randomUUID())
    .send({
      tripId: trip.id,
      boardingPointId: options.boardingPointId ?? trip.boardingPoints[0]?.id,
      droppingPointId: trip.droppingPoints.at(-1)?.id,
      passengers: options.passengers ?? seats.map(traveller),
      contact: { email: 'amit@example.com', phone: '+919876543210' },
      expectedTotalPaise:
        options.expectedTotalPaise ?? seats.reduce((sum, s) => sum + s.pricePaise, 0),
    });
}

describe('GET /api/buses/search', () => {
  it('lists Pune → Mumbai departures in time order with boarding points and prices', async () => {
    const ctx = createTestContext();
    const res = await request(ctx.app)
      .get('/api/buses/search')
      .query({ from: 'pune', to: 'mumbai', date: daysAhead(10) })
      .expect(200);
    expect(res.headers['cache-control']).toBe('private, max-age=60');
    expect(res.body.data).toMatchObject({ from: 'pune', to: 'mumbai', demo: true });
    const trips = res.body.data.trips as BusTripOffer[];
    expect(trips.length).toBeGreaterThanOrEqual(5);
    const times = trips.map((t) => Date.parse(t.departureAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    for (const t of trips) {
      expect(t).toMatchObject({
        from: { code: 'pune', name: 'Pune' },
        to: { code: 'mumbai', name: 'Mumbai' },
      });
      expect(t.boardingPoints[0]?.name).toBe('Swargate');
      expect(t.droppingPoints.length).toBeGreaterThan(1);
      expect(t.seatsAvailable).toBeGreaterThan(0);
      expect(t.seatsAvailable).toBeLessThanOrEqual(t.totalSeats);
      expect(t.fromPaise % 100).toBe(0); // whole rupees
      // Dropping points are reached in order, the last one at arrival.
      expect(t.droppingPoints.at(-1)?.time).toBe(t.arrivalAt);
    }
  });

  it('covers routes across Maharashtra', async () => {
    const ctx = createTestContext();
    for (const [from, to] of [
      ['nagpur', 'amravati'],
      ['kolhapur', 'goa'],
      ['sambhajinagar', 'pune'],
      ['shirdi', 'nashik'],
    ]) {
      expect(
        (await searchTrips(ctx, { from: from as string, to: to as string })).length,
      ).toBeGreaterThan(0);
    }
  });

  it('rejects invalid searches', async () => {
    const ctx = createTestContext();
    const same = await request(ctx.app)
      .get('/api/buses/search')
      .query({ from: 'pune', to: 'pune' })
      .expect(400);
    expect(same.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'query.to' })]),
    );
    await request(ctx.app)
      .get('/api/buses/search')
      .query({ from: 'atlantis', to: 'pune' })
      .expect(400);
  });
});

describe('trip and seat map', () => {
  it('returns the trip and a seat map that agrees with it', async () => {
    const ctx = createTestContext();
    const [trip] = await searchTrips(ctx);
    if (!trip) throw new Error('no trips');
    const detail = await request(ctx.app).get(`/api/buses/${trip.id}`).expect(200);
    expect(detail.body.data).toMatchObject({ id: trip.id, serviceNumber: trip.serviceNumber });

    const res = await request(ctx.app).get(`/api/buses/${trip.id}/seats`).expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const map = res.body.data as BusSeatMap;
    expect(map.maxSeats).toBe(6);
    const seats = allSeats(map);
    expect(seats).toHaveLength(trip.totalSeats);
    expect(seats.filter((s) => s.available)).toHaveLength(trip.seatsAvailable);
    for (const s of seats) {
      expect(s.pricePaise).toBe(s.basePaise + s.taxPaise);
      expect(s.taxPaise > 0).toBe(trip.bus.ac);
    }
    if (trip.bus.type === 'SLEEPER')
      expect(map.decks.map((d) => d.deck)).toEqual(['LOWER', 'UPPER']);
  });

  it('returns 404 for an unknown trip', async () => {
    await request(createTestContext().app).get('/api/buses/bs_nope_20300101/seats').expect(404);
  });
});

describe('POST /api/buses/book', () => {
  it('requires sign-in and an Idempotency-Key', async () => {
    const ctx = createTestContext();
    await request(ctx.app).post('/api/buses/book').send({}).expect(401);
    const { accessToken } = await signUp(ctx);
    const res = await request(ctx.app)
      .post('/api/buses/book')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400);
    expect(res.body.details).toEqual([
      expect.objectContaining({ path: 'headers.idempotency-key' }),
    ]);
  });

  it('holds the chosen seats and creates a booking awaiting payment', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const { trip, seats } = await pickTrip(ctx, 2);
    const res = await book(ctx, accessToken, trip, seats).expect(201);
    const total = seats.reduce((sum, s) => sum + s.pricePaise, 0);
    expect(res.body.data).toMatchObject({
      serviceType: 'BUS',
      status: 'PENDING_PAYMENT',
      price: { totalPaise: total, feesPaise: 0 },
      flights: [],
      bus: {
        seatNumbers: seats.map((s) => s.number),
        boardingPoint: { name: 'Swargate' },
        offer: { id: trip.id },
        pnr: null,
      },
      passengers: [
        { firstName: 'Amit', seatNumber: seats[0]?.number, age: 34, type: 'ADULT' },
        { firstName: 'Priya', seatNumber: seats[1]?.number, gender: 'FEMALE' },
      ],
    });

    // The seats are gone for everyone else.
    const after = await seatMap(ctx, trip.id);
    for (const s of seats)
      expect(allSeats(after).find((x) => x.number === s.number)?.available).toBe(false);
    expect(await prisma.busSeatBooking.count()).toBe(2);
  });

  it('returns the same booking when retried with the same key', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const { trip, seats } = await pickTrip(ctx, 1);
    const key = crypto.randomUUID();
    const [a, b] = await Promise.all([
      book(ctx, accessToken, trip, seats, { key }),
      book(ctx, accessToken, trip, seats, { key }),
    ]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body.data.reference).toBe(b.body.data.reference);
    expect(await prisma.booking.count()).toBe(1);
  });

  it('never sells the same seat twice', async () => {
    const ctx = createTestContext();
    const { trip, seats } = await pickTrip(ctx, 1);
    const users = await Promise.all([signUp(ctx), signUp(ctx), signUp(ctx)]);
    const results = await Promise.all(users.map((u) => book(ctx, u.accessToken, trip, seats)));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect(results.find((r) => r.status === 409)?.body.errorCode).toBe('SEAT_UNAVAILABLE');
    expect(await prisma.busSeatBooking.count()).toBe(1);
  });

  it('keeps ladies-only seats for women', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    for (const trip of await searchTrips(ctx)) {
      const [seat] = openSeats(await seatMap(ctx, trip.id), true);
      if (!seat) continue;
      const male = await book(ctx, accessToken, trip, [seat], {
        passengers: [traveller(seat, 0)],
      }).expect(400);
      expect(male.body.details).toEqual([
        { path: 'body.passengers.0.gender', message: `Seat ${seat.number} is reserved for women` },
      ]);
      await book(ctx, accessToken, trip, [seat], {
        passengers: [{ ...traveller(seat, 1) }],
      }).expect(201);
      return;
    }
    throw new Error('No open ladies-only seat found');
  });

  it('refuses a changed price, an unknown point and duplicate seats', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const { trip, seats } = await pickTrip(ctx, 1);
    const seat = seats[0] as BusSeatInfo;
    const price = await book(ctx, accessToken, trip, seats, {
      expectedTotalPaise: seat.pricePaise - 100,
    }).expect(409);
    expect(price.body.errorCode).toBe('PRICE_CHANGED');
    const point = await book(ctx, accessToken, trip, seats, { boardingPointId: 'nope' }).expect(
      400,
    );
    expect(point.body.details).toEqual([
      { path: 'body.boardingPointId', message: 'Choose a boarding point' },
    ]);
    await book(ctx, accessToken, trip, seats, {
      passengers: [traveller(seat, 0), traveller(seat, 1)],
      expectedTotalPaise: seat.pricePaise * 2,
    }).expect(400);
    expect(await prisma.booking.count()).toBe(0);
  });
});

describe('bus payment, ticket and expiry', () => {
  it('confirms on payment, issues a PNR and serves the e-ticket', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const auth = { Authorization: `Bearer ${accessToken}` };
    const { trip, seats } = await pickTrip(ctx, 1);
    const reference = (await book(ctx, accessToken, trip, seats).expect(201)).body.data
      .reference as string;

    const order = await request(ctx.app)
      .post('/api/payments/create')
      .set(auth)
      .send({ bookingReference: reference })
      .expect(201);
    expect(order.body.data.amountPaise).toBe(seats[0]?.pricePaise);
    await request(ctx.app)
      .post('/api/payments/mock/complete')
      .set(auth)
      .send({ paymentId: order.body.data.paymentId, outcome: 'success' })
      .expect(200);

    const details = await request(ctx.app).get(`/api/bookings/${reference}`).set(auth).expect(200);
    expect(details.body.data).toMatchObject({ status: 'CONFIRMED', paymentStatus: 'SUCCESS' });
    expect(details.body.data.bus.pnr).toMatch(new RegExp(`^${trip.operator.code}\\d{7}$`));

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
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

    const list = await request(ctx.app).get('/api/bookings').set(auth).expect(200);
    expect(list.body.data).toEqual([
      expect.objectContaining({
        reference,
        serviceType: 'BUS',
        title: 'Pune → Mumbai',
        status: 'CONFIRMED',
      }),
    ]);
  });

  it('releases the seats when the hold expires', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const { trip, seats } = await pickTrip(ctx, 2);
    await book(ctx, accessToken, trip, seats).expect(201);
    await prisma.booking.updateMany({ data: { holdExpiresAt: new Date(Date.now() - 1000) } });
    expect(await ctx.services.bookings.expireHolds()).toBe(1);
    expect(await prisma.busSeatBooking.count()).toBe(0);
    const after = await seatMap(ctx, trip.id);
    for (const s of seats)
      expect(allSeats(after).find((x) => x.number === s.number)?.available).toBe(true);
  });

  it("hides other users' bus bookings, but not from support", async () => {
    const ctx = createTestContext();
    const owner = await signUp(ctx);
    const { trip, seats } = await pickTrip(ctx, 1);
    const reference = (await book(ctx, owner.accessToken, trip, seats).expect(201)).body.data
      .reference as string;
    const stranger = await signUp(ctx);
    await request(ctx.app)
      .get(`/api/bookings/${reference}`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .expect(404);
    const agent = await signUp(ctx);
    await grantRole(agent.body.data.user.id, 'SUPPORT');
    const refreshed = await request(ctx.app)
      .post('/api/auth/refresh')
      .set('Cookie', agent.cookie)
      .expect(200);
    await request(ctx.app)
      .get(`/api/bookings/${reference}`)
      .set('Authorization', `Bearer ${refreshed.body.data.accessToken}`)
      .expect(200);
  });
});
