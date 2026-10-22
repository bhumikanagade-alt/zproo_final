import type {
  AdminBookingRow,
  AdminDashboard,
  AdminPaymentRow,
  AdminRefundRow,
  AdminReport,
  AdminUserRow,
  BookingStatus,
  ReportType,
  ServiceType,
} from '@zproo/types';

/**
 * Pure admin analytics: the dashboard, reports and list summaries are computed from plain rows,
 * so the API (rows from PostgreSQL) and the in-browser demo engine produce identical numbers.
 */

export interface AnalyticsInput {
  bookings: readonly AdminBookingRow[];
  payments: readonly AdminPaymentRow[];
  refunds: readonly AdminRefundRow[];
  users: readonly Pick<AdminUserRow, 'createdAt' | 'status'>[];
  openTickets: number;
  includesDemoData: boolean;
  now?: Date;
}

const DAY = 86_400_000;
const PAID = new Set(['SUCCESS', 'PARTIALLY_REFUNDED', 'REFUNDED']);
const CANCELLED = new Set<BookingStatus>(['CANCELLED', 'REFUND_PENDING', 'REFUNDED']);
const UNPAID = new Set<BookingStatus>(['INITIATED', 'PENDING_PAYMENT']);
/** All admin dates are Indian calendar days (IST = UTC+05:30, no daylight saving), whatever the server's timezone. */
const IST_OFFSET_MS = 5.5 * 3_600_000;

export const isPaidBooking = (b: Pick<AdminBookingRow, 'paymentStatus'>) => PAID.has(b.paymentStatus);
/**
 * Bookings that count in booking and cancellation totals. Checkouts that never reached payment
 * (still unpaid, or cancelled when the seat hold expired) are abandoned carts, not bookings.
 */
export const isCountedBooking = (b: Pick<AdminBookingRow, 'status' | 'paymentStatus'>) =>
  !UNPAID.has(b.status) && !(b.status === 'CANCELLED' && !PAID.has(b.paymentStatus));
export const isOpenRefund = (r: Pick<AdminRefundRow, 'status'>) =>
  r.status === 'REQUESTED' || r.status === 'PROCESSING';

/** `YYYY-MM-DD` of the Indian (IST) calendar day an instant falls on. */
export function dayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Midnight (IST) at the start of the Indian day containing `d`, as epoch milliseconds. */
function startOfDay(d: Date): number {
  return Math.floor((d.getTime() + IST_OFFSET_MS) / DAY) * DAY - IST_OFFSET_MS;
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const change = (now: number, before: number) =>
  before ? Math.round(((now - before) / before) * 1000) / 10 : null;

interface WindowTotals {
  gross: number;
  refunded: number;
  bookings: number;
  paid: number;
  cancelled: number;
}

function totals(
  bookings: readonly AdminBookingRow[],
  refunds: readonly AdminRefundRow[],
  from: number,
  to: number,
): WindowTotals {
  const t: WindowTotals = { gross: 0, refunded: 0, bookings: 0, paid: 0, cancelled: 0 };
  for (const b of bookings) {
    const at = Date.parse(b.createdAt);
    if (at < from || at >= to) continue;
    if (!isCountedBooking(b)) continue;
    t.bookings += 1;
    if (CANCELLED.has(b.status)) t.cancelled += 1;
    if (isPaidBooking(b)) {
      t.paid += 1;
      t.gross += b.totalPaise;
    }
  }
  for (const r of refunds) {
    if (r.status !== 'COMPLETED') continue;
    const at = Date.parse(r.completedAt ?? r.createdAt);
    if (at >= from && at < to) t.refunded += r.amountPaise;
  }
  return t;
}

export function buildDashboard(input: AnalyticsInput, days: number): AdminDashboard {
  const now = input.now ?? new Date();
  const end = startOfDay(now) + DAY;
  const from = end - days * DAY;
  const prevFrom = from - days * DAY;
  const cur = totals(input.bookings, input.refunds, from, end);
  const prev = totals(input.bookings, input.refunds, prevFrom, from);

  // Daily series
  const series = Array.from({ length: days }, (_, i) => ({
    date: dayKey(new Date(from + i * DAY + DAY / 2)),
    revenuePaise: 0,
    bookings: 0,
    cancelled: 0,
  }));
  const index = new Map(series.map((p, i) => [p.date, i]));
  const inWindow: AdminBookingRow[] = [];
  for (const b of input.bookings) {
    const at = Date.parse(b.createdAt);
    if (at < from || at >= end) continue;
    inWindow.push(b);
    const point = series[index.get(dayKey(b.createdAt)) ?? -1];
    if (!point || !isCountedBooking(b)) continue;
    point.bookings += 1;
    if (CANCELLED.has(b.status)) point.cancelled += 1;
    if (isPaidBooking(b)) point.revenuePaise += b.totalPaise;
  }
  for (const r of input.refunds) {
    if (r.status !== 'COMPLETED') continue;
    const point = series[index.get(dayKey(r.completedAt ?? r.createdAt)) ?? -1];
    if (point) point.revenuePaise -= r.amountPaise;
  }

  const byServiceMap = new Map<ServiceType, { bookings: number; revenuePaise: number }>();
  const byStatusMap = new Map<BookingStatus, number>();
  const routes = new Map<string, { label: string; service: ServiceType; bookings: number; revenuePaise: number }>();
  for (const b of inWindow) {
    if (!isCountedBooking(b)) continue;
    byStatusMap.set(b.status, (byStatusMap.get(b.status) ?? 0) + 1);
    const s = byServiceMap.get(b.serviceType) ?? { bookings: 0, revenuePaise: 0 };
    s.bookings += 1;
    if (isPaidBooking(b)) s.revenuePaise += b.totalPaise;
    byServiceMap.set(b.serviceType, s);
    const key = `${b.serviceType}|${b.title}`;
    const r = routes.get(key) ?? { label: b.title, service: b.serviceType, bookings: 0, revenuePaise: 0 };
    r.bookings += 1;
    if (isPaidBooking(b)) r.revenuePaise += b.totalPaise;
    routes.set(key, r);
  }

  const methods = new Map<string, { count: number; amountPaise: number }>();
  for (const p of input.payments) {
    const at = Date.parse(p.createdAt);
    if (at < from || at >= end || !PAID.has(p.status)) continue;
    const m = methods.get(p.method) ?? { count: 0, amountPaise: 0 };
    m.count += 1;
    m.amountPaise += p.amountPaise;
    methods.set(p.method, m);
  }

  const pending = input.refunds.filter(isOpenRefund);
  const newUsers = input.users.filter((u) => {
    const at = Date.parse(u.createdAt);
    return at >= from && at < end;
  }).length;
  const prevNet = prev.gross - prev.refunded;
  const curNet = cur.gross - cur.refunded;

  return {
    generatedAt: now.toISOString(),
    days,
    kpis: {
      revenuePaise: curNet,
      revenueChangePct: change(curNet, prevNet),
      bookings: cur.bookings,
      bookingsChangePct: change(cur.bookings, prev.bookings),
      avgOrderPaise: cur.paid ? Math.round(cur.gross / cur.paid) : 0,
      newUsers,
      totalUsers: input.users.length,
      cancellationRatePct: pct(cur.cancelled, cur.bookings),
      pendingRefunds: pending.length,
      pendingRefundsPaise: pending.reduce((s, r) => s + r.amountPaise, 0),
      openTickets: input.openTickets,
    },
    series,
    byService: [...byServiceMap].map(([service, v]) => ({ service, ...v })).sort((a, b) => b.revenuePaise - a.revenuePaise),
    byStatus: [...byStatusMap].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
    topRoutes: [...routes.values()].sort((a, b) => b.revenuePaise - a.revenuePaise).slice(0, 8),
    paymentMethods: [...methods].map(([method, v]) => ({ method, ...v })).sort((a, b) => b.amountPaise - a.amountPaise),
    recentBookings: [...input.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    includesDemoData: input.includesDemoData,
  };
}

// ───────── Reports ─────────

const rupees = (paise: number) => Math.round(paise) / 100;
const date = (iso: string | null) => (iso ? dayKey(iso) : '');
const dateTime = (iso: string) => `${dayKey(iso)} ${new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().slice(11, 16)}`;

export interface ReportInput {
  bookings: readonly AdminBookingRow[];
  payments: readonly AdminPaymentRow[];
  refunds: readonly AdminRefundRow[];
  users: readonly AdminUserRow[];
}

/** Rows whose `createdAt` falls on or between two `YYYY-MM-DD` days (Indian time). */
export function inDayRange<T extends { createdAt: string }>(rows: readonly T[], from?: string, to?: string): T[] {
  if (!from && !to) return [...rows];
  return rows.filter((r) => {
    const d = dayKey(r.createdAt);
    return (!from || d >= from) && (!to || d <= to);
  });
}

export function buildReport(type: ReportType, from: string, to: string, input: ReportInput): AdminReport {
  const bookings = inDayRange(input.bookings, from, to).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const base = { type, from, to };
  switch (type) {
    case 'bookings': {
      const rows = bookings.map((b) => [
        b.reference, dateTime(b.createdAt), b.serviceType, b.customerName, b.title, b.travelDate, b.status, b.paymentStatus, rupees(b.totalPaise),
      ]);
      return {
        ...base,
        columns: ['Reference', 'Created', 'Service', 'Customer', 'Trip', 'Travel date', 'Status', 'Payment', 'Amount (₹)'],
        rows,
        totals: { bookings: rows.length, amount: rupees(bookings.reduce((s, b) => s + b.totalPaise, 0)) },
      };
    }
    case 'revenue': {
      const days = new Map<string, { bookings: number; gross: number; refunds: number }>();
      for (let t = Date.parse(`${from}T12:00:00+05:30`); dayKey(new Date(t)) <= to; t += DAY) {
        days.set(dayKey(new Date(t)), { bookings: 0, gross: 0, refunds: 0 });
      }
      for (const b of bookings) {
        const d = days.get(dayKey(b.createdAt));
        if (!d || !isPaidBooking(b)) continue;
        d.bookings += 1;
        d.gross += b.totalPaise;
      }
      for (const r of input.refunds) {
        if (r.status !== 'COMPLETED') continue;
        const d = days.get(dayKey(r.completedAt ?? r.createdAt));
        if (d) d.refunds += r.amountPaise;
      }
      const rows = [...days].map(([day, v]) => [day, v.bookings, rupees(v.gross), rupees(v.refunds), rupees(v.gross - v.refunds)]);
      const sum = [...days.values()].reduce((s, v) => ({ bookings: s.bookings + v.bookings, gross: s.gross + v.gross, refunds: s.refunds + v.refunds }), { bookings: 0, gross: 0, refunds: 0 });
      return {
        ...base,
        columns: ['Date', 'Paid bookings', 'Gross (₹)', 'Refunds (₹)', 'Net (₹)'],
        rows,
        totals: { bookings: sum.bookings, gross: rupees(sum.gross), refunds: rupees(sum.refunds), net: rupees(sum.gross - sum.refunds) },
      };
    }
    case 'payments': {
      const payments = inDayRange(input.payments, from, to).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return {
        ...base,
        columns: ['Payment ID', 'Date', 'Booking', 'Service', 'Customer', 'Method', 'Status', 'Amount (₹)'],
        rows: payments.map((p) => [p.id, dateTime(p.createdAt), p.bookingReference, p.serviceType, p.customerName, p.method, p.status, rupees(p.amountPaise)]),
        totals: {
          payments: payments.length,
          captured: rupees(payments.filter((p) => PAID.has(p.status)).reduce((s, p) => s + p.amountPaise, 0)),
          failed: payments.filter((p) => p.status === 'FAILED').length,
        },
      };
    }
    case 'refunds': {
      // A refund belongs in the range if it was requested or completed inside it.
      const refunds = input.refunds
        .filter((r) => inDayRange([r], from, to).length > 0 || (r.completedAt !== null && inDayRange([{ createdAt: r.completedAt }], from, to).length > 0))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return {
        ...base,
        columns: ['Refund ID', 'Requested', 'Booking', 'Service', 'Customer', 'Reason', 'Status', 'Amount (₹)', 'Completed'],
        rows: refunds.map((r) => [r.id, dateTime(r.createdAt), r.bookingReference, r.serviceType, r.customerName, r.reason, r.status, rupees(r.amountPaise), date(r.completedAt)]),
        totals: {
          refunds: refunds.length,
          amount: rupees(refunds.reduce((s, r) => s + r.amountPaise, 0)),
          completed: rupees(refunds.filter((r) => r.status === 'COMPLETED').reduce((s, r) => s + r.amountPaise, 0)),
        },
      };
    }
    case 'users': {
      const users = inDayRange(input.users, from, to).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return {
        ...base,
        columns: ['Name', 'Mobile', 'Email', 'Roles', 'Status', 'Joined', 'Last login'],
        rows: users.map((u) => [u.fullName, u.phone ?? '', u.email ?? '', u.roles.join(' '), u.status, date(u.createdAt), date(u.lastLoginAt)]),
        totals: { users: users.length, active: users.filter((u) => u.status === 'ACTIVE').length },
      };
    }
    case 'services': {
      const map = new Map<ServiceType, { bookings: number; paid: number; cancelled: number; gross: number }>();
      for (const b of bookings) {
        if (!isCountedBooking(b)) continue;
        const s = map.get(b.serviceType) ?? { bookings: 0, paid: 0, cancelled: 0, gross: 0 };
        s.bookings += 1;
        if (CANCELLED.has(b.status)) s.cancelled += 1;
        if (isPaidBooking(b)) {
          s.paid += 1;
          s.gross += b.totalPaise;
        }
        map.set(b.serviceType, s);
      }
      const refundsBy = new Map<ServiceType, number>();
      // Same rule as the Revenue report and the daily chart: a refund counts on the day it was completed.
      for (const r of input.refunds) {
        if (r.status !== 'COMPLETED') continue;
        const day = dayKey(r.completedAt ?? r.createdAt);
        if (day >= from && day <= to) refundsBy.set(r.serviceType, (refundsBy.get(r.serviceType) ?? 0) + r.amountPaise);
      }
      const rows = [...map]
        .sort((a, b) => b[1].gross - a[1].gross)
        .map(([service, s]) => {
          const refunds = refundsBy.get(service) ?? 0;
          return [service, s.bookings, s.paid, s.cancelled, pct(s.cancelled, s.bookings), rupees(s.gross), rupees(refunds), rupees(s.gross - refunds), rupees(s.paid ? s.gross / s.paid : 0)];
        });
      return {
        ...base,
        columns: ['Service', 'Bookings', 'Paid', 'Cancelled', 'Cancel rate %', 'Gross (₹)', 'Refunds (₹)', 'Net (₹)', 'Avg order (₹)'],
        rows,
        totals: { bookings: rows.reduce((s, r) => s + Number(r[1]), 0), gross: rows.reduce((s, r) => s + Number(r[5]), 0) },
      };
    }
  }
}

const BOM = String.fromCharCode(0xfeff);

/**
 * Text cells that start with a formula character (= + - @, tab or carriage return) are neutralised
 * with a leading apostrophe so Excel and Sheets show them as text instead of running them.
 * Real numbers are left alone (a negative amount is not a formula).
 */
export function neutraliseCsvCell(v: string | number | null): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(v);
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

/** RFC 4180 CSV (with a BOM so Excel reads ₹ correctly). */
export function toCsv(columns: readonly string[], rows: readonly (readonly (string | number | null)[])[]): string {
  const cell = (v: string | number | null) => {
    const s = neutraliseCsvCell(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `${BOM}${[columns, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}

// ───────── List helpers ─────────

export type AdminSort = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';

/** Case-insensitive match of `search` against any of the given fields. */
export function matchesSearch(search: string | undefined, ...fields: (string | null | undefined)[]): boolean {
  if (!search) return true;
  const q = search.toLowerCase().replace(/\s+/g, ' ').trim();
  const digits = q.replace(/\D/g, '');
  return fields.some((f) => {
    if (!f) return false;
    const v = f.toLowerCase();
    return v.includes(q) || (digits.length >= 4 && v.replace(/\D/g, '').includes(digits));
  });
}

export function sortRows<T extends { createdAt: string }>(rows: T[], sort: AdminSort, amount: (r: T) => number): T[] {
  const copy = [...rows];
  switch (sort) {
    case 'oldest':
      return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'amount_desc':
      return copy.sort((a, b) => amount(b) - amount(a));
    case 'amount_asc':
      return copy.sort((a, b) => amount(a) - amount(b));
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function paginate<T>(rows: readonly T[], page: number, limit: number) {
  return { items: rows.slice((page - 1) * limit, page * limit), page, limit, total: rows.length };
}

/**
 * An admin date as an instant. A date-only value ("2026-10-05") means the Indian calendar day:
 * its start at 00:00 IST, or its last millisecond for an end-of-range ("end"). Full timestamps
 * are used as they are. Comparing instants avoids comparing date strings of different formats.
 */
export function adminInstant(value: string, edge: 'start' | 'end'): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const start = Date.parse(`${value}T00:00:00+05:30`);
    return edge === 'start' ? start : start + DAY - 1;
  }
  return Date.parse(value);
}
