import type { RoleName } from '@prisma/client';
import type { BusSeatInfo, BusSeatMap, BusTripOffer } from '@zproo/types';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, grantRole, prisma, refreshCookie, resetUsers, signUp } from './helpers';

beforeEach(resetUsers);

type Ctx = ReturnType<typeof createTestContext>;
const daysAhead = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function staff(ctx: Ctx, role: RoleName, fullName = 'Staff Member') {
  const { cookie, body } = await signUp(ctx, { fullName });
  await grantRole(body.data.user.id, role);
  const res = await request(ctx.app).post('/api/auth/refresh').set('Cookie', cookie).expect(200);
  expect(refreshCookie(res)).toBeDefined();
  return { token: res.body.data.accessToken as string, id: body.data.user.id as string };
}

/** Books and pays for one Pune → Mumbai bus seat as a new customer. */
async function paidBusBooking(ctx: Ctx) {
  const { accessToken, body } = await signUp(ctx, { fullName: 'Ananya Iyer' });
  const auth = { Authorization: `Bearer ${accessToken}` };
  const trips = (await request(ctx.app).get('/api/buses/search').query({ from: 'pune', to: 'mumbai', date: daysAhead(12) }).expect(200)).body.data
    .trips as BusTripOffer[];
  for (const trip of trips) {
    const map = (await request(ctx.app).get(`/api/buses/${trip.id}/seats`).expect(200)).body.data as BusSeatMap;
    const seat = map.decks.flatMap((d) => d.seats).find((s) => s.available && !s.ladiesOnly) as BusSeatInfo | undefined;
    if (!seat) continue;
    const reference = (
      await request(ctx.app)
        .post('/api/buses/book')
        .set(auth)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          tripId: trip.id,
          boardingPointId: trip.boardingPoints[0]?.id,
          droppingPointId: trip.droppingPoints.at(-1)?.id,
          passengers: [{ seatNumber: seat.number, firstName: 'Ananya', lastName: 'Iyer', age: 29, gender: 'FEMALE' }],
          contact: { email: 'ananya@example.com', phone: '+919876543210' },
          expectedTotalPaise: seat.pricePaise,
        })
        .expect(201)
    ).body.data.reference as string;
    const order = await request(ctx.app).post('/api/payments/create').set(auth).send({ bookingReference: reference }).expect(201);
    await request(ctx.app).post('/api/payments/mock/complete').set(auth).send({ paymentId: order.body.data.paymentId, outcome: 'success' }).expect(200);
    return { reference, userId: body.data.user.id as string, amount: seat.pricePaise, trip, token: accessToken };
  }
  throw new Error('No open seat');
}

describe('admin panel API', () => {
  it('shows the dashboard, bookings, payments and the customer', async () => {
    const ctx = createTestContext();
    const booking = await paidBusBooking(ctx);
    const { token } = await staff(ctx, 'ADMIN', 'Ops Admin');
    const auth = { Authorization: `Bearer ${token}` };

    const dash = (await request(ctx.app).get('/api/admin/dashboard?days=7').set(auth).expect(200)).body.data;
    expect(dash.kpis).toMatchObject({ bookings: 1, revenuePaise: booking.amount, totalUsers: 2 });
    expect(dash.series).toHaveLength(7);
    expect(dash.byService).toEqual([{ service: 'BUS', bookings: 1, revenuePaise: booking.amount }]);

    const list = (await request(ctx.app).get('/api/admin/bookings').query({ search: 'ananya' }).set(auth).expect(200)).body.data;
    expect(list).toMatchObject({ total: 1, summary: { totalPaise: booking.amount, byStatus: { CONFIRMED: 1 } } });
    expect(list.items[0]).toMatchObject({ reference: booking.reference, title: 'Pune → Mumbai', customerName: 'Ananya Iyer', source: 'live' });

    const detail = (await request(ctx.app).get(`/api/admin/bookings/${booking.reference}`).set(auth).expect(200)).body.data;
    expect(detail.passengers[0].name).toContain('Ananya');
    expect(detail.payments[0]).toMatchObject({ status: 'SUCCESS', amountPaise: booking.amount });

    const payments = (await request(ctx.app).get('/api/admin/payments').set(auth).expect(200)).body.data;
    expect(payments.summary).toMatchObject({ capturedPaise: booking.amount, successRatePct: 100 });

    const user = (await request(ctx.app).get(`/api/admin/users/${booking.userId}`).set(auth).expect(200)).body.data;
    expect(user.stats).toEqual({ bookings: 1, spentPaise: booking.amount, cancelled: 0 });
  });

  it('cancels a paid booking, frees the seat and refunds through the gateway', async () => {
    const ctx = createTestContext();
    const booking = await paidBusBooking(ctx);
    const { token } = await staff(ctx, 'ADMIN');
    const auth = { Authorization: `Bearer ${token}` };

    const cancelled = (
      await request(ctx.app).post(`/api/admin/bookings/${booking.reference}/cancel`).set(auth).send({ reason: 'Bus breakdown', refund: true }).expect(200)
    ).body.data;
    expect(cancelled.status).toBe('REFUND_PENDING');
    expect(cancelled.refunds).toEqual([expect.objectContaining({ status: 'REQUESTED', amountPaise: booking.amount })]);
    expect(await prisma.busSeatBooking.count()).toBe(0);
    await request(ctx.app).post(`/api/admin/bookings/${booking.reference}/cancel`).set(auth).send({ reason: 'again', refund: true }).expect(409);

    const refunds = (await request(ctx.app).get('/api/admin/refunds').set(auth).expect(200)).body.data;
    expect(refunds.summary).toMatchObject({ pendingCount: 1, pendingPaise: booking.amount });
    const processed = (
      await request(ctx.app).patch(`/api/admin/refunds/${refunds.items[0].id}`).set(auth).send({ status: 'PROCESSING' }).expect(200)
    ).body.data;
    expect(processed.status).toBe('COMPLETED');
    const after = (await request(ctx.app).get(`/api/admin/bookings/${booking.reference}`).set(auth).expect(200)).body.data;
    expect(after).toMatchObject({ status: 'REFUNDED', paymentStatus: 'REFUNDED' });

    const audit = (await request(ctx.app).get('/api/admin/audit').set(auth).expect(200)).body.data;
    expect(audit.items.map((e: { action: string }) => e.action)).toEqual(expect.arrayContaining(['booking.cancel', 'refund.processing']));
  });

  it('suspends users (signing them out) and only super admins change roles', async () => {
    const ctx = createTestContext();
    const customer = await signUp(ctx, { fullName: 'Kabir Shah' });
    const admin = await staff(ctx, 'ADMIN');
    const auth = { Authorization: `Bearer ${admin.token}` };
    const id = customer.body.data.user.id as string;

    await request(ctx.app).patch(`/api/admin/users/${id}/status`).set(auth).send({ status: 'SUSPENDED', reason: 'Fraud check' }).expect(200);
    await request(ctx.app).post('/api/auth/refresh').set('Cookie', customer.cookie).expect(401);
    await request(ctx.app).patch(`/api/admin/users/${admin.id}/status`).set(auth).send({ status: 'SUSPENDED' }).expect(409);
    await request(ctx.app).put(`/api/admin/users/${id}/roles`).set(auth).send({ roles: ['SUPPORT'] }).expect(403);

    const sup = await staff(ctx, 'SUPER_ADMIN', 'Root');
    const roles = (
      await request(ctx.app).put(`/api/admin/users/${id}/roles`).set('Authorization', `Bearer ${sup.token}`).send({ roles: ['USER', 'SUPPORT'] }).expect(200)
    ).body.data.roles;
    expect(roles.sort()).toEqual(['SUPPORT', 'USER']);
  });

  it('manages coupons with validation and conflicts', async () => {
    const ctx = createTestContext();
    const { token } = await staff(ctx, 'ADMIN');
    const auth = { Authorization: `Bearer ${token}` };
    const coupon = { code: 'diwali25', description: 'Diwali sale', discountType: 'PERCENT', value: 25, validFrom: daysAhead(0), validTo: daysAhead(20) };
    const created = (await request(ctx.app).post('/api/admin/coupons').set(auth).send(coupon).expect(201)).body.data;
    expect(created).toMatchObject({ code: 'DIWALI25', usedCount: 0, active: true });
    await request(ctx.app).post('/api/admin/coupons').set(auth).send(coupon).expect(409);
    const bad = await request(ctx.app).post('/api/admin/coupons').set(auth).send({ ...coupon, code: 'X1', value: 150 }).expect(400);
    expect(bad.body.details.map((d: { path: string }) => d.path)).toEqual(expect.arrayContaining(['body.code', 'body.value']));
    const updated = (await request(ctx.app).patch(`/api/admin/coupons/${created.id}`).set(auth).send({ active: false }).expect(200)).body.data;
    expect(updated).toMatchObject({ code: 'DIWALI25', active: false });
    await request(ctx.app).delete(`/api/admin/coupons/${created.id}`).set(auth).expect(200);
    expect((await request(ctx.app).get('/api/admin/coupons').set(auth).expect(200)).body.data).toEqual([]);
  });

  it("shows a customer's bus cancellation in the admin panel", async () => {
    const ctx = createTestContext();
    const booking = await paidBusBooking(ctx);
    const { token } = await staff(ctx, 'ADMIN');
    const admin = { Authorization: `Bearer ${token}` };
    const customer = { Authorization: `Bearer ${booking.token}` };

    await request(ctx.app)
      .post(`/api/buses/bookings/${booking.reference}/cancel`)
      .set(customer)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ reason: 'Plans changed' })
      .expect(200);

    const detail = (await request(ctx.app).get(`/api/admin/bookings/${booking.reference}`).set(admin).expect(200)).body.data;
    expect(['REFUND_PENDING', 'REFUNDED']).toContain(detail.status);
    expect(detail.refunds).toHaveLength(1);
    expect(detail.refunds[0].reason).toContain('cancelled by customer');
    const labels = (detail.timeline as { label: string }[]).map((t) => t.label).join(' | ');
    expect(labels).toContain('by customer — Plans changed');
    expect(labels).toContain('Refund of');

    // The refund also shows on the admin Refunds page.
    const refunds = (await request(ctx.app).get('/api/admin/refunds').set(admin).expect(200)).body.data.items as { bookingReference: string }[];
    expect(refunds.some((r) => r.bookingReference === booking.reference)).toBe(true);
  });

  it('lets customers see and use an admin coupon end to end', async () => {
    const ctx = createTestContext();
    const { token } = await staff(ctx, 'ADMIN');
    const admin = { Authorization: `Bearer ${token}` };
    const created = (
      await request(ctx.app)
        .post('/api/admin/coupons')
        .set(admin)
        .send({ code: 'bus50', description: 'Rs 50 off buses', discountType: 'FLAT', value: 5_000, services: ['BUS'], validFrom: daysAhead(-1), validTo: daysAhead(20), usageLimit: 5, perUserLimit: 1 })
        .expect(201)
    ).body.data;

    // Anyone can see live coupons for a service; usage counts stay private.
    const listed = (await request(ctx.app).get('/api/coupons/public').query({ service: 'BUS' }).expect(200)).body.data as { code: string }[];
    expect(listed.map((c) => c.code)).toContain('BUS50');
    expect(listed.find((c) => c.code === 'BUS50')).not.toHaveProperty('usedCount');
    const flightList = (await request(ctx.app).get('/api/coupons/public').query({ service: 'FLIGHT' }).expect(200)).body.data as { code: string }[];
    expect(flightList.map((c) => c.code)).not.toContain('BUS50');

    // A customer checks the code against a real bus fare.
    const { accessToken } = await signUp(ctx, { fullName: 'Ananya Iyer' });
    const auth = { Authorization: `Bearer ${accessToken}` };
    const trips = (await request(ctx.app).get('/api/buses/search').query({ from: 'pune', to: 'mumbai', date: daysAhead(12) }).expect(200)).body.data.trips as BusTripOffer[];
    let picked: { trip: BusTripOffer; seats: BusSeatInfo[] } | undefined;
    for (const trip of trips) {
      const map = (await request(ctx.app).get(`/api/buses/${trip.id}/seats`).expect(200)).body.data as BusSeatMap;
      const seats = map.decks.flatMap((d) => d.seats).filter((x) => x.available && !x.ladiesOnly);
      if (seats.length >= 2) {
        picked = { trip, seats };
        break;
      }
    }
    if (!picked) throw new Error('No open seats');
    const [first, second] = picked.seats as [BusSeatInfo, BusSeatInfo];
    const check = (code: string, service = 'BUS') => request(ctx.app).post('/api/coupons/validate').set(auth).send({ code, service, orderPaise: first.pricePaise });
    expect((await check('bus50').expect(200)).body.data).toMatchObject({ code: 'BUS50', discountPaise: 5_000 });
    await check('nosuchcode').expect(400);
    await check('bus50', 'FLIGHT').expect(400);
    await request(ctx.app).post('/api/coupons/validate').send({ code: 'bus50', service: 'BUS', orderPaise: first.pricePaise }).expect(401);

    const book = (seat: BusSeatInfo) =>
      request(ctx.app)
        .post('/api/buses/book')
        .set(auth)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          tripId: picked.trip.id,
          boardingPointId: picked.trip.boardingPoints[0]?.id,
          droppingPointId: picked.trip.droppingPoints.at(-1)?.id,
          passengers: [{ seatNumber: seat.number, firstName: 'Ananya', lastName: 'Iyer', age: 29, gender: 'FEMALE' }],
          contact: { email: 'ananya@example.com', phone: '+919876543210' },
          promoCode: 'BUS50',
          expectedTotalPaise: seat.pricePaise - 5_000,
        });
    const booked = (await book(first).expect(201)).body.data;
    expect(booked.price.discountPaise).toBe(5_000);

    // The admin panel's "Used" count moved, and the one-use-per-customer limit now blocks a second use.
    const after = (await request(ctx.app).get('/api/admin/coupons').set(admin).expect(200)).body.data as { id: string; usedCount: number }[];
    expect(after.find((c) => c.id === created.id)?.usedCount).toBe(1);
    await book(second).expect(400);
  });

  it('lets a hotel stay use an admin coupon: list, check, redeem once, limits hold', async () => {
    const ctx = createTestContext();
    const { token } = await staff(ctx, 'ADMIN');
    const admin = { Authorization: `Bearer ${token}` };
    const created = (
      await request(ctx.app)
        .post('/api/admin/coupons')
        .set(admin)
        .send({ code: 'stay12', description: '12% off hotel stays', discountType: 'PERCENT', value: 12, maxDiscountPaise: 200_000, minOrderPaise: 500_000, services: ['HOTEL'], validFrom: daysAhead(-1), validTo: daysAhead(20), usageLimit: 2, perUserLimit: 1 })
        .expect(201)
    ).body.data;

    // Customers see it for hotels only.
    const hotels = (await request(ctx.app).get('/api/coupons/public').query({ service: 'HOTEL' }).expect(200)).body.data as { code: string }[];
    expect(hotels.map((c) => c.code)).toContain('STAY12');
    const buses = (await request(ctx.app).get('/api/coupons/public').query({ service: 'BUS' }).expect(200)).body.data as { code: string }[];
    expect(buses.map((c) => c.code)).not.toContain('STAY12');

    const { accessToken } = await signUp(ctx, { fullName: 'Kavya Rao' });
    const auth = { Authorization: `Bearer ${accessToken}` };
    const check = (orderPaise: number, service = 'HOTEL') => request(ctx.app).post('/api/coupons/validate').set(auth).send({ code: 'stay12', service, orderPaise });
    expect((await check(1_000_000).expect(200)).body.data).toMatchObject({ code: 'STAY12', discountPaise: 120_000 });
    expect((await check(5_000_000).expect(200)).body.data).toMatchObject({ discountPaise: 200_000 }); // capped
    await check(100_000).expect(400); // below the minimum order
    await check(1_000_000, 'BUS').expect(400); // not valid on buses

    // The stay is completed in the browser, which then reports the use.
    const redeem = (bookingRef: string, orderPaise = 1_000_000) => request(ctx.app).post('/api/coupons/redeem').set(auth).send({ code: 'stay12', service: 'HOTEL', orderPaise, bookingRef });
    await request(ctx.app).post('/api/coupons/redeem').send({ code: 'stay12', service: 'HOTEL', orderPaise: 1_000_000, bookingRef: 'ZPH-2026-AAAAAA' }).expect(401);
    expect((await redeem('ZPH-2026-AAAAAA').expect(200)).body.data).toMatchObject({ code: 'STAY12', discountPaise: 120_000 });
    // Sending the same booking again does not count twice.
    await redeem('ZPH-2026-AAAAAA').expect(200);
    const after = (await request(ctx.app).get('/api/admin/coupons').set(admin).expect(200)).body.data as { id: string; usedCount: number }[];
    expect(after.find((c) => c.id === created.id)?.usedCount).toBe(1);
    // One use per customer: a different stay is refused.
    await redeem('ZPH-2026-BBBBBB').expect(400);
  });

  it('lets a cab ride use an admin coupon: list, check, redeem once, limits hold', async () => {
    const ctx = createTestContext();
    const { token } = await staff(ctx, 'ADMIN');
    const admin = { Authorization: `Bearer ${token}` };
    const created = (
      await request(ctx.app)
        .post('/api/admin/coupons')
        .set(admin)
        .send({ code: 'ride20', description: '20% off cab rides', discountType: 'PERCENT', value: 20, maxDiscountPaise: 10_000, minOrderPaise: 15_000, services: ['CAB'], validFrom: daysAhead(-1), validTo: daysAhead(20), usageLimit: 2, perUserLimit: 1 })
        .expect(201)
    ).body.data;

    // Customers see it for cabs only, without signing in.
    const cabs = (await request(ctx.app).get('/api/coupons/public').query({ service: 'CAB' }).expect(200)).body.data as { code: string }[];
    expect(cabs.map((c) => c.code)).toContain('RIDE20');
    const hotels = (await request(ctx.app).get('/api/coupons/public').query({ service: 'HOTEL' }).expect(200)).body.data as { code: string }[];
    expect(hotels.map((c) => c.code)).not.toContain('RIDE20');

    const { accessToken } = await signUp(ctx, { fullName: 'Isha Menon' });
    const auth = { Authorization: `Bearer ${accessToken}` };
    const check = (orderPaise: number, service = 'CAB') => request(ctx.app).post('/api/coupons/validate').set(auth).send({ code: 'ride20', service, orderPaise });
    expect((await check(30_000).expect(200)).body.data).toMatchObject({ code: 'RIDE20', discountPaise: 6_000 });
    expect((await check(90_000).expect(200)).body.data).toMatchObject({ discountPaise: 10_000 }); // capped
    await check(5_000).expect(400); // below the minimum order
    await check(30_000, 'HOTEL').expect(400); // not valid on hotels

    // The ride is completed in the browser, which then reports the use.
    const redeem = (bookingRef: string) => request(ctx.app).post('/api/coupons/redeem').set(auth).send({ code: 'ride20', service: 'CAB', orderPaise: 30_000, bookingRef });
    expect((await redeem('ZPROO111111').expect(200)).body.data).toMatchObject({ code: 'RIDE20', discountPaise: 6_000 });
    await redeem('ZPROO111111').expect(200); // the same ride again does not count twice
    const after = (await request(ctx.app).get('/api/admin/coupons').set(admin).expect(200)).body.data as { id: string; usedCount: number }[];
    expect(after.find((c) => c.id === created.id)?.usedCount).toBe(1);
    await redeem('ZPROO222222').expect(400); // one use per customer
  });

  it('lets a bike rental use an admin coupon: list, check, redeem once, limits hold', async () => {
    const ctx = createTestContext();
    const { token } = await staff(ctx, 'ADMIN');
    const admin = { Authorization: `Bearer ${token}` };
    const created = (
      await request(ctx.app)
        .post('/api/admin/coupons')
        .set(admin)
        .send({ code: 'bike15', description: '15% off bike rentals', discountType: 'PERCENT', value: 15, maxDiscountPaise: 30_000, minOrderPaise: 50_000, services: ['BIKE'], validFrom: daysAhead(-1), validTo: daysAhead(20), usageLimit: 2, perUserLimit: 1 })
        .expect(201)
    ).body.data;

    // Customers see it for bikes only, without signing in.
    const bikes = (await request(ctx.app).get('/api/coupons/public').query({ service: 'BIKE' }).expect(200)).body.data as { code: string }[];
    expect(bikes.map((c) => c.code)).toContain('BIKE15');
    const cabs = (await request(ctx.app).get('/api/coupons/public').query({ service: 'CAB' }).expect(200)).body.data as { code: string }[];
    expect(cabs.map((c) => c.code)).not.toContain('BIKE15');

    const { accessToken } = await signUp(ctx, { fullName: 'Rohan Desai' });
    const auth = { Authorization: `Bearer ${accessToken}` };
    const check = (orderPaise: number, service = 'BIKE') => request(ctx.app).post('/api/coupons/validate').set(auth).send({ code: 'bike15', service, orderPaise });
    expect((await check(100_000).expect(200)).body.data).toMatchObject({ code: 'BIKE15', discountPaise: 15_000 });
    expect((await check(500_000).expect(200)).body.data).toMatchObject({ discountPaise: 30_000 }); // capped
    await check(10_000).expect(400); // below the minimum order
    await check(100_000, 'CAB').expect(400); // not valid on cabs

    // The rental is completed in the browser, which then reports the use.
    const redeem = (bookingRef: string) => request(ctx.app).post('/api/coupons/redeem').set(auth).send({ code: 'bike15', service: 'BIKE', orderPaise: 100_000, bookingRef });
    expect((await redeem('ZB-111111').expect(200)).body.data).toMatchObject({ code: 'BIKE15', discountPaise: 15_000 });
    await redeem('ZB-111111').expect(200); // the same rental again does not count twice
    const after = (await request(ctx.app).get('/api/admin/coupons').set(admin).expect(200)).body.data as { id: string; usedCount: number }[];
    expect(after.find((c) => c.id === created.id)?.usedCount).toBe(1);
    await redeem('ZB-222222').expect(400); // one use per customer
  });

  it('lets a holiday booking use an admin coupon: list, check, redeem once, limits hold', async () => {
    const ctx = createTestContext();
    const { token } = await staff(ctx, 'ADMIN');
    const admin = { Authorization: `Bearer ${token}` };
    const created = (
      await request(ctx.app)
        .post('/api/admin/coupons')
        .set(admin)
        .send({ code: 'holi12', description: '12% off holiday packages', discountType: 'PERCENT', value: 12, maxDiscountPaise: 400_000, minOrderPaise: 1_000_000, services: ['HOLIDAY'], validFrom: daysAhead(-1), validTo: daysAhead(20), usageLimit: 2, perUserLimit: 1 })
        .expect(201)
    ).body.data;

    // Customers see it on the holidays page without signing in, and not on other services.
    const holidays = (await request(ctx.app).get('/api/coupons/public').query({ service: 'HOLIDAY' }).expect(200)).body.data as { code: string }[];
    expect(holidays.map((c) => c.code)).toContain('HOLI12');
    const buses = (await request(ctx.app).get('/api/coupons/public').query({ service: 'BUS' }).expect(200)).body.data as { code: string }[];
    expect(buses.map((c) => c.code)).not.toContain('HOLI12');

    const { accessToken } = await signUp(ctx, { fullName: 'Isha Kulkarni' });
    const auth = { Authorization: `Bearer ${accessToken}` };
    const check = (orderPaise: number, service = 'HOLIDAY') => request(ctx.app).post('/api/coupons/validate').set(auth).send({ code: 'holi12', service, orderPaise });
    expect((await check(2_000_000).expect(200)).body.data).toMatchObject({ code: 'HOLI12', discountPaise: 240_000 });
    expect((await check(5_000_000).expect(200)).body.data).toMatchObject({ discountPaise: 400_000 }); // capped
    await check(500_000).expect(400); // below the minimum order
    await check(2_000_000, 'BUS').expect(400); // not valid on buses

    // The booking is completed in the browser, which then reports the use.
    const redeem = (bookingRef: string) => request(ctx.app).post('/api/coupons/redeem').set(auth).send({ code: 'holi12', service: 'HOLIDAY', orderPaise: 2_000_000, bookingRef });
    expect((await redeem('ZP-HOL-11111').expect(200)).body.data).toMatchObject({ code: 'HOLI12', discountPaise: 240_000 });
    await redeem('ZP-HOL-11111').expect(200); // the same booking again does not count twice
    const after = (await request(ctx.app).get('/api/admin/coupons').set(admin).expect(200)).body.data as { id: string; usedCount: number }[];
    expect(after.find((c) => c.id === created.id)?.usedCount).toBe(1);
    await redeem('ZP-HOL-22222').expect(400); // one use per customer
  });

  it('lets a parcel booking use an admin coupon: list, check, redeem once, limits hold', async () => {
    const ctx = createTestContext();
    const { token } = await staff(ctx, 'ADMIN');
    const admin = { Authorization: `Bearer ${token}` };
    const created = (
      await request(ctx.app)
        .post('/api/admin/coupons')
        .set(admin)
        .send({ code: 'ship15', description: '15% off parcels', discountType: 'PERCENT', value: 15, maxDiscountPaise: 20_000, minOrderPaise: 10_000, services: ['PARCEL'], validFrom: daysAhead(-1), validTo: daysAhead(20), usageLimit: 2, perUserLimit: 1 })
        .expect(201)
    ).body.data;

    // Customers see it on the parcel pages without signing in, and not on other services.
    const parcels = (await request(ctx.app).get('/api/coupons/public').query({ service: 'PARCEL' }).expect(200)).body.data as { code: string }[];
    expect(parcels.map((c) => c.code)).toContain('SHIP15');
    const buses = (await request(ctx.app).get('/api/coupons/public').query({ service: 'BUS' }).expect(200)).body.data as { code: string }[];
    expect(buses.map((c) => c.code)).not.toContain('SHIP15');

    const { accessToken } = await signUp(ctx, { fullName: 'Isha Kulkarni' });
    const auth = { Authorization: `Bearer ${accessToken}` };
    const check = (orderPaise: number, service = 'PARCEL') => request(ctx.app).post('/api/coupons/validate').set(auth).send({ code: 'ship15', service, orderPaise });
    expect((await check(20_900).expect(200)).body.data).toMatchObject({ code: 'SHIP15', discountPaise: 3_135 });
    expect((await check(500_000).expect(200)).body.data).toMatchObject({ discountPaise: 20_000 }); // capped
    await check(5_000).expect(400); // below the minimum order
    await check(20_900, 'BUS').expect(400); // not valid on buses

    // The parcel booking is completed in the browser, which then reports the use.
    const redeem = (bookingRef: string) => request(ctx.app).post('/api/coupons/redeem').set(auth).send({ code: 'ship15', service: 'PARCEL', orderPaise: 20_900, bookingRef });
    expect((await redeem('ZPG-PRC-111111').expect(200)).body.data).toMatchObject({ code: 'SHIP15', discountPaise: 3_135 });
    await redeem('ZPG-PRC-111111').expect(200); // the same booking again does not count twice
    const after = (await request(ctx.app).get('/api/admin/coupons').set(admin).expect(200)).body.data as { id: string; usedCount: number }[];
    expect(after.find((c) => c.id === created.id)?.usedCount).toBe(1);
    await redeem('ZPG-PRC-222222').expect(400); // one use per customer

    // Cancelled (or the payment failed): only the customer who used it can give the use back.
    const release = (bookingRef: string, bearer = auth) => request(ctx.app).post('/api/coupons/release').set(bearer).send({ code: 'ship15', bookingRef });
    const other = await signUp(ctx, { fullName: 'Rohan Patil' });
    expect((await release('ZPG-PRC-111111', { Authorization: `Bearer ${other.accessToken}` }).expect(200)).body.data).toEqual({ released: false });
    expect((await release('ZPG-PRC-111111').expect(200)).body.data).toEqual({ released: true });
    expect((await release('ZPG-PRC-111111').expect(200)).body.data).toEqual({ released: false }); // twice does nothing
    const released = (await request(ctx.app).get('/api/admin/coupons').set(admin).expect(200)).body.data as { id: string; usedCount: number }[];
    expect(released.find((c) => c.id === created.id)?.usedCount).toBe(0);
    await redeem('ZPG-PRC-222222').expect(200); // the customer can use it again
  });

  it('runs support tickets end to end', async () => {
    const ctx = createTestContext();
    const { token } = await staff(ctx, 'SUPPORT', 'Agent Smith');
    const auth = { Authorization: `Bearer ${token}` };
    const ticket = (
      await request(ctx.app)
        .post('/api/admin/tickets')
        .set(auth)
        .send({ subject: 'Refund delayed', customerName: 'Meera Nair', customerEmail: 'meera@example.com', message: 'Still waiting for my refund' })
        .expect(201)
    ).body.data;
    expect(ticket).toMatchObject({ number: expect.stringMatching(/^ZT-\d+$/), status: 'OPEN' });
    const replied = (await request(ctx.app).post(`/api/admin/tickets/${ticket.id}/messages`).set(auth).send({ body: 'Looking into it' }).expect(200)).body.data;
    expect(replied).toMatchObject({ status: 'IN_PROGRESS', assignee: 'Agent Smith' });
    const resolved = (await request(ctx.app).patch(`/api/admin/tickets/${ticket.id}/update`).set(auth).send({ status: 'RESOLVED' }).expect(200)).body.data;
    expect(resolved.status).toBe('RESOLVED');
    // Support cannot touch marketing or settings.
    await request(ctx.app).get('/api/admin/coupons').set(auth).expect(403);
    await request(ctx.app).patch('/api/admin/settings').set(auth).send({ maintenanceMode: true }).expect(403);
  });

  it('applies settings to the website: announcement, maintenance and hidden buses', async () => {
    const ctx = createTestContext();
    const { token } = await staff(ctx, 'SUPER_ADMIN');
    const auth = { Authorization: `Bearer ${token}` };
    await request(ctx.app)
      .patch('/api/admin/settings')
      .set(auth)
      .send({ maintenanceMode: true, announcement: { enabled: true, text: 'Monsoon sale', tone: 'success', linkPath: '/offers' } })
      .expect(200);
    const pub = (await request(ctx.app).get('/api/settings/public').expect(200)).body.data;
    expect(pub).toMatchObject({ maintenanceMode: true, announcement: { text: 'Monsoon sale' } });
    expect(pub).not.toHaveProperty('gstPercent');

    const customer = await signUp(ctx);
    const blocked = await request(ctx.app)
      .post('/api/buses/book')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({})
      .expect(503);
    expect(blocked.body.errorCode).toBe('SERVICE_UNAVAILABLE');

    const search = () => request(ctx.app).get('/api/buses/search').query({ from: 'pune', to: 'mumbai', date: daysAhead(9) }).expect(200);
    const trips = (await search()).body.data.trips as BusTripOffer[];
    const hide = (trips[0] as BusTripOffer).serviceNumber;
    await request(ctx.app).patch(`/api/admin/inventory/bus/${hide}`).set(auth).send({ listed: false }).expect(200);
    const after = (await search()).body.data.trips as BusTripOffer[];
    expect(after.some((t) => t.serviceNumber === hide)).toBe(false);
    const inv = (await request(ctx.app).get('/api/admin/inventory/bus').query({ listed: 'false' }).set(auth).expect(200)).body.data;
    expect(inv.items.map((i: { id: string }) => i.id)).toEqual([hide]);
  });

  it('exports reports', async () => {
    const ctx = createTestContext();
    const booking = await paidBusBooking(ctx);
    const { token } = await staff(ctx, 'ADMIN');
    const report = (
      await request(ctx.app).get('/api/admin/reports').query({ type: 'services', from: daysAhead(-1), to: daysAhead(1) }).set('Authorization', `Bearer ${token}`).expect(200)
    ).body.data;
    expect(report.rows).toEqual([['BUS', 1, 1, 0, 0, booking.amount / 100, 0, booking.amount / 100, booking.amount / 100]]);
  });
});
