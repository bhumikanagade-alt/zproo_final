/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type {
  AdminBookingDetail,
  AdminBookingsPage,
  AdminCollections,
  AdminDashboard,
  AdminInventoryPage,
  AdminRefundsPage,
  AdminReport,
  AdminUserRow,
  AuthSession,
  Paginated,
  PlatformSettings,
} from '@zproo/types';
import axios, { AxiosError } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStaticDb } from '../core';
import { staticAdapter } from '../server';
import { resetAdminDb } from './db';

const api = axios.create({ baseURL: '/api', adapter: staticAdapter });
const data = async <T>(p: Promise<{ data: { data: T } }>) => (await p).data.data;
const status = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    if (err instanceof AxiosError) return err.response?.status;
  }
  throw new Error('expected the request to fail');
};

const signIn = (identifier: string, password = 'Admin@1234') =>
  data<AuthSession>(api.post('/auth/login', { identifier, password }));

beforeEach(() => {
  resetStaticDb();
  resetAdminDb();
});

describe('static admin engine', () => {
  it('refuses signed-out visitors and customers', async () => {
    expect(await status(api.get('/admin/dashboard'))).toBe(401);
  });

  it('lets the demo super admin sign in with all permissions', async () => {
    const session = await signIn('admin@zproogo.com');
    expect(session.user.roles).toEqual(['SUPER_ADMIN']);
    expect(session.user.permissions).toContain('admin:access');
  });

  it('builds the dashboard from sample data', async () => {
    await signIn('admin@zproogo.com');
    const d = await data<AdminDashboard>(api.get('/admin/dashboard', { params: { days: 30 } }));
    expect(d.series).toHaveLength(30);
    expect(d.kpis.bookings).toBeGreaterThan(50);
    expect(d.kpis.revenuePaise).toBeGreaterThan(0);
    expect(d.includesDemoData).toBe(true);
    expect(d.byService.length).toBeGreaterThan(3);
  });

  it('lists, filters and cancels bookings with a refund, then completes the refund', async () => {
    await signIn('admin@zproogo.com');
    const page = await data<AdminBookingsPage>(api.get('/admin/bookings', { params: { status: 'CONFIRMED', limit: 5 } }));
    expect(page.items).toHaveLength(5);
    expect(page.items.every((b) => b.status === 'CONFIRMED')).toBe(true);
    const ref = page.items[0]!.reference;
    const cancelled = await data<AdminBookingDetail>(
      api.post(`/admin/bookings/${ref}/cancel`, { reason: 'Operator cancelled the trip', refund: true }),
    );
    expect(cancelled.status).toBe('REFUND_PENDING');
    const refund = cancelled.refunds.at(-1)!;
    expect(refund.status).toBe('REQUESTED');
    expect(await status(api.post(`/admin/bookings/${ref}/cancel`, { reason: 'again', refund: true }))).toBe(409);

    await api.patch(`/admin/refunds/${refund.id}`, { status: 'COMPLETED', settlementReference: 'UTR-TEST-0001' });
    const after = await data<AdminBookingDetail>(api.get(`/admin/bookings/${ref}`));
    expect(after.status).toBe('REFUNDED');
    expect(after.paymentStatus).toBe('REFUNDED');
    const refunds = await data<AdminRefundsPage>(api.get('/admin/refunds', { params: { search: ref } }));
    expect(refunds.items[0]?.status).toBe('COMPLETED');
  });

  it('manages users: search, suspend and roles, but not yourself', async () => {
    const me = await signIn('admin@zproogo.com');
    const list = await data<Paginated<AdminUserRow>>(api.get('/admin/users', { params: { role: 'SUPPORT' } }));
    expect(list.items.map((u) => u.email)).toContain('support@zproogo.com');
    const support = list.items[0]!;
    const suspended = await data<AdminUserRow>(api.patch(`/admin/users/${support.id}/status`, { status: 'SUSPENDED' }));
    expect(suspended.status).toBe('SUSPENDED');
    expect(await status(signIn('support@zproogo.com'))).toBe(403);
    expect(await status(api.patch(`/admin/users/${me.user.id}/status`, { status: 'SUSPENDED' }))).toBe(409);
  });

  it('limits support staff to what their role allows', async () => {
    await signIn('support@zproogo.com');
    expect((await data<AdminBookingsPage>(api.get('/admin/bookings'))).total).toBeGreaterThan(0);
    expect(await status(api.patch('/admin/settings', { maintenanceMode: true }))).toBe(403);
    expect(await status(api.get('/admin/coupons'))).toBe(403);
  });

  it('creates, validates, updates and deletes coupons', async () => {
    await signIn('admin@zproogo.com');
    const base = { code: 'diwali25', description: 'Diwali sale', discountType: 'PERCENT', value: 25, validFrom: '2026-10-01', validTo: '2026-11-15' };
    const created = await data<AdminCollections['coupons']>(api.post('/admin/coupons', base));
    expect(created.code).toBe('DIWALI25');
    expect(await status(api.post('/admin/coupons', base))).toBe(409);
    expect(await status(api.post('/admin/coupons', { ...base, code: 'BAD150', value: 150 }))).toBe(400);
    const updated = await data<AdminCollections['coupons']>(api.patch(`/admin/coupons/${created.id}`, { active: false }));
    expect(updated.active).toBe(false);
    await api.delete(`/admin/coupons/${created.id}`);
    const all = await data<AdminCollections['coupons'][]>(api.get('/admin/coupons'));
    expect(all.some((c) => c.code === 'DIWALI25')).toBe(false);
  });

  it('lets a hotel stay use an admin coupon and counts it once', async () => {
    await signIn('admin@zproogo.com');
    const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    const created = await data<AdminCollections['coupons']>(
      api.post('/admin/coupons', { code: 'stay12', description: '12% off hotel stays', discountType: 'PERCENT', value: 12, minOrderPaise: 500_000, services: ['HOTEL'], validFrom: day(-1), validTo: day(20), usageLimit: 5, perUserLimit: 1 }),
    );
    const listed = await data<{ code: string }[]>(api.get('/coupons/public', { params: { service: 'HOTEL' } }));
    expect(listed.map((c) => c.code)).toContain('STAY12');
    const flights = await data<{ code: string }[]>(api.get('/coupons/public', { params: { service: 'FLIGHT' } }));
    expect(flights.map((c) => c.code)).not.toContain('STAY12');

    expect((await data<{ discountPaise: number }>(api.post('/coupons/validate', { code: 'stay12', service: 'HOTEL', orderPaise: 1_000_000 }))).discountPaise).toBe(120_000);
    expect(await status(api.post('/coupons/validate', { code: 'stay12', service: 'HOTEL', orderPaise: 100_000 }))).toBe(400);
    expect(await status(api.post('/coupons/validate', { code: 'stay12', service: 'FLIGHT', orderPaise: 1_000_000 }))).toBe(400);

    const redeem = (bookingRef: string) => api.post('/coupons/redeem', { code: 'stay12', service: 'HOTEL', orderPaise: 1_000_000, bookingRef });
    expect((await data<{ discountPaise: number }>(redeem('ZPH-2026-AAAAAA'))).discountPaise).toBe(120_000);
    await redeem('ZPH-2026-AAAAAA'); // same booking again: counted once
    const after = await data<AdminCollections['coupons'][]>(api.get('/admin/coupons'));
    expect(after.find((c) => c.id === created.id)?.usedCount).toBe(1);
    expect(await status(redeem('ZPH-2026-BBBBBB'))).toBe(400); // one use per customer
  });

  it('hides catalogue items and changes public settings', async () => {
    await signIn('admin@zproogo.com');
    const inv = await data<AdminInventoryPage>(api.get('/admin/inventory/bus', { params: { limit: 3 } }));
    expect(inv.items).toHaveLength(3);
    const id = inv.items[0]!.id;
    await api.patch(`/admin/inventory/bus/${encodeURIComponent(id)}`, { listed: false });
    const hidden = await data<AdminInventoryPage>(api.get('/admin/inventory/bus', { params: { listed: 'false' } }));
    expect(hidden.items.map((i) => i.id)).toEqual([id]);

    await api.patch('/admin/settings', { announcement: { enabled: true, text: 'Monsoon sale!', tone: 'success', linkPath: '/offers' } });
    const pub = await data<PlatformSettings>(api.get('/settings/public'));
    expect(pub.announcement.text).toBe('Monsoon sale!');
  });

  it('exports reports and records an audit trail', async () => {
    await signIn('admin@zproogo.com');
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const report = await data<AdminReport>(api.get('/admin/reports', { params: { type: 'services', from, to } }));
    expect(report.rows.length).toBeGreaterThan(3);
    await api.patch('/admin/settings', { gstPercent: 12 });
    const audit = await data<Paginated<{ action: string }>>(api.get('/admin/audit'));
    expect(audit.items[0]?.action).toBe('settings.update');
  });
});
