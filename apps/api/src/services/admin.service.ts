import type { Prisma, PrismaClient } from '@prisma/client';
import { transportCatalogue } from '@zproo/catalog';
import {
  DEFAULT_PLATFORM_SETTINGS,
  type AdminAuditPage,
  type AdminBookingDetail,
  type AdminBookingRow,
  type AdminBookingsPage,
  type AdminCollectionName,
  type AdminCollections,
  type AdminDashboard,
  type AdminInventoryPage,
  type AdminPaymentRow,
  type AdminPaymentsPage,
  type AdminRefundRow,
  type AdminRefundsPage,
  type AdminReport,
  type AdminUserDetail,
  type AdminUserRow,
  type AdminWalletSummary,
  type BookingStatus,
  type NotificationAudience,
  type Paginated,
  type PlatformSettings,
  type PublicSettings,
  type RoleName,
  type ServiceType,
  type UserNotification,
  type UserStatus,
} from '@zproo/types';
import {
  ADMIN_DOC_LABEL,
  adminDocForm,
  adminInstant,
  buildAdminDoc,
  buildDashboard,
  buildReport,
  matchesSearch,
  paginate,
} from '@zproo/utils';
import {
  adminCollectionSchemas,
  type AdminBookingListQuery,
  type AdminPaymentListQuery,
  type AdminRefundListQuery,
  type SettingsUpdate,
} from '@zproo/validation';
import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import { toAdminUserRow } from '../models/user.dto';
import { toBookingDetails, toBookingListItem } from '../models/booking.dto';
import type { BusProvider } from '../providers/bus';
import type { FlightProvider } from '../providers/flight';
import type { PaymentProvider } from '../providers/payment';
import type { Db } from '../repositories/db';
import { bookingInclude } from '../repositories/booking.repository';
import { userWithRoles } from '../repositories/user.repository';
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  InvalidStateError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { zodIssues } from '../utils/zod';
import type { AuditService, RequestContext } from './audit.service';
import { MANUAL_HOLD_PREFIX, type RefundService } from './refund.service';

/**
 * The admin panel's API: dashboard, bookings, users, payments, refunds, catalogue visibility,
 * the panel's own collections (coupons, offers, tickets, notifications, partners, drivers),
 * wallet adjustments, reports, audit log and platform settings.
 *
 * Numbers are computed with the same pure functions (@zproo/utils) the in-browser demo uses,
 * so the panel shows identical results in both modes.
 */

interface AdminDeps {
  prisma: PrismaClient;
  audit: AuditService;
  refunds: RefundService;
  flights: FlightProvider;
  buses: BusProvider;
  /** Used to cancel open payment orders at the gateway when a booking is cancelled. */
  payments?: PaymentProvider;
  logger: Logger;
  now?: () => Date;
}

export interface Actor {
  userId: string;
  roles: RoleName[];
  ctx: RequestContext;
}

/** A single report never loads more than this many rows per table (the date range is capped too). */
const REPORT_ROW_CAP = 20_000;
const SETTINGS_KEY = 'platform.settings';
const UNLISTED_KEY = 'inventory.unlisted';
const PAID = ['SUCCESS', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const;
const CANCELLABLE: BookingStatus[] = ['INITIATED', 'PENDING_PAYMENT', 'PROCESSING', 'CONFIRMED'];
/** Dates in filters are calendar days in India. */
const dayStart = (day: string) => new Date(`${day}T00:00:00+05:30`);
const dayEnd = (day: string) => new Date(dayStart(day).getTime() + 86_400_000);

const adminBookingInclude = {
  ...bookingInclude,
  user: { select: { id: true, fullName: true } },
  payments: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.BookingInclude;
type AdminBookingRecord = Prisma.BookingGetPayload<{ include: typeof adminBookingInclude }>;

const methodLabel = (m: string | null) =>
  m ? ({ upi: 'UPI', card: 'Card', netbanking: 'Net banking', wallet: 'Wallet', mock: 'Test payment' }[m.toLowerCase()] ?? m) : 'Online';

export class AdminService {
  private settingsCache: { at: number; value: PlatformSettings } | null = null;
  private unlistedCache: { at: number; value: Partial<Record<ServiceType, string[]>> } | null = null;
  private dashboardCache = new Map<string, { at: number; value: AdminDashboard }>();
  private offersCache: { at: number; value: AdminCollections['offers'][] } | null = null;
  private readonly now: () => Date;

  constructor(private readonly deps: AdminDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  // ───────── Staff session check ─────────

  /**
   * Confirms, against the database, that a signed-in staff member is still allowed in: the account
   * must be ACTIVE and not deleted and the session must not be revoked. Returns the roles as they
   * are now (not as they were when the token was issued).
   */
  async liveStaff(userId: string, sessionId: string): Promise<RoleName[]> {
    const [user, session] = await Promise.all([
      this.deps.prisma.user.findUnique({
        where: { id: userId },
        select: { status: true, deletedAt: true, roles: { select: { role: { select: { name: true } } } } },
      }),
      this.deps.prisma.refreshToken.findFirst({
        where: { userId, familyId: sessionId, revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true },
      }),
    ]);
    if (!user || user.status !== 'ACTIVE' || user.deletedAt || !session) {
      throw new AuthenticationError('Your session has ended. Please sign in again.');
    }
    return user.roles.map((r) => r.role.name as RoleName);
  }

  // ───────── Settings ─────────

  async settings(): Promise<PlatformSettings> {
    if (this.settingsCache && Date.now() - this.settingsCache.at < 15_000) return this.settingsCache.value;
    const row = await this.deps.prisma.systemSetting.findUnique({ where: { key: SETTINGS_KEY } });
    const stored = (row?.value ?? {}) as Partial<PlatformSettings>;
    // Sample data only exists in the in-browser demo.
    const value = { ...DEFAULT_PLATFORM_SETTINGS, ...stored, showDemoData: false };
    this.settingsCache = { at: Date.now(), value };
    return value;
  }

  async publicSettings(): Promise<PublicSettings> {
    const s = await this.settings();
    return {
      siteName: s.siteName,
      supportEmail: s.supportEmail,
      supportPhone: s.supportPhone,
      announcement: s.announcement,
      maintenanceMode: s.maintenanceMode,
      disabledServices: s.disabledServices,
      walletEnabled: s.walletEnabled,
    };
  }

  async updateSettings(patch: SettingsUpdate, actor: Actor): Promise<PlatformSettings> {
    const { showDemoData: _ignored, ...rest } = patch;
    await this.deps.prisma.$transaction(async (tx) => {
      // Lock the row so two admins saving at once merge instead of overwriting each other.
      await tx.$queryRaw`SELECT key FROM system_settings WHERE key = ${SETTINGS_KEY} FOR UPDATE`;
      const row = await tx.systemSetting.findUnique({ where: { key: SETTINGS_KEY } });
      const before = { ...DEFAULT_PLATFORM_SETTINGS, ...((row?.value ?? {}) as Partial<PlatformSettings>), showDemoData: false };
      const value = { ...before, ...rest };
      await tx.systemSetting.upsert({
        where: { key: SETTINGS_KEY },
        create: { key: SETTINGS_KEY, value: value as unknown as Prisma.InputJsonValue, description: 'Admin panel settings', updatedById: actor.userId },
        update: { value: value as unknown as Prisma.InputJsonValue, updatedById: actor.userId },
      });
      await this.recordIn(tx, actor, 'settings.update', 'Settings', null, {
        summary: `Changed ${Object.keys(rest).join(', ')}`,
        before: before as unknown as Prisma.InputJsonValue,
        after: value as unknown as Prisma.InputJsonValue,
      });
    });
    this.settingsCache = null;
    return this.settings();
  }

  async unlisted(service: ServiceType): Promise<ReadonlySet<string>> {
    if (!this.unlistedCache || Date.now() - this.unlistedCache.at > 15_000) {
      const row = await this.deps.prisma.systemSetting.findUnique({ where: { key: UNLISTED_KEY } });
      this.unlistedCache = { at: Date.now(), value: (row?.value ?? {}) as Partial<Record<ServiceType, string[]>> };
    }
    return new Set(this.unlistedCache.value[service] ?? []);
  }

  // ───────── Dashboard & reports ─────────

  /**
   * `access.revenue = false` returns the dashboard without money figures (for staff who may not read
   * finance reports). Results are cached for 30 seconds because the dashboard reads a lot of rows;
   * any admin change clears the cache.
   */
  async dashboard(days: number, access: { revenue: boolean } = { revenue: true }): Promise<AdminDashboard> {
    const key = `${days}:${access.revenue}`;
    const hit = this.dashboardCache.get(key);
    if (hit && Date.now() - hit.at < 30_000) return hit.value;
    const value = await this.buildDashboardData(days);
    const result = access.revenue ? value : redactRevenue(value);
    this.dashboardCache.set(key, { at: Date.now(), value: result });
    return result;
  }

  private async buildDashboardData(days: number): Promise<AdminDashboard> {
    const now = this.now();
    const from = new Date(now.getTime() - 2 * days * 86_400_000 - 86_400_000);
    const [bookings, refunds, users, totalUsers, openTickets] = await Promise.all([
      this.deps.prisma.booking.findMany({ where: { createdAt: { gte: from } }, include: adminBookingInclude, orderBy: { createdAt: 'desc' } }),
      this.deps.prisma.refund.findMany({ where: { OR: [{ createdAt: { gte: from } }, { status: { in: ['REQUESTED', 'PROCESSING'] } }] }, include: { booking: { include: { user: true } } } }),
      this.deps.prisma.user.findMany({ where: { deletedAt: null, createdAt: { gte: from } }, select: { createdAt: true, status: true } }),
      this.deps.prisma.user.count({ where: { deletedAt: null } }),
      this.countOpenTickets(),
    ]);
    const rows = bookings.map((b) => this.row(b));
    const dashboard = buildDashboard(
      {
        bookings: rows,
        payments: bookings.flatMap((b) => this.payments(b)),
        refunds: refunds.map((r) => this.refundRow(r, r.booking.serviceType, r.booking.reference, r.booking.user.fullName)),
        users: users.map((u) => ({ createdAt: u.createdAt.toISOString(), status: u.status })),
        openTickets,
        includesDemoData: false,
        now,
      },
      days,
    );
    dashboard.kpis.totalUsers = totalUsers;
    return dashboard;
  }

  async report(type: AdminReport['type'], from: string, to: string): Promise<AdminReport> {
    const range = { gte: dayStart(from), lt: dayEnd(to) };
    const [bookings, refunds, users] = await Promise.all([
      type === 'users' ? [] : this.deps.prisma.booking.findMany({ where: { createdAt: range }, include: adminBookingInclude, take: REPORT_ROW_CAP }),
      this.deps.prisma.refund.findMany({ where: { OR: [{ createdAt: range }, { completedAt: range }] }, include: { booking: { include: { user: true } } }, take: REPORT_ROW_CAP }),
      type === 'users' ? this.deps.prisma.user.findMany({ where: { deletedAt: null, createdAt: range }, include: userWithRoles, take: REPORT_ROW_CAP }) : [],
    ]);
    return buildReport(type, from, to, {
      bookings: bookings.map((b) => this.row(b)),
      payments: bookings.flatMap((b) => this.payments(b)),
      refunds: refunds.map((r) => this.refundRow(r, r.booking.serviceType, r.booking.reference, r.booking.user.fullName)),
      users: users.map(toAdminUserRow),
    });
  }

  // ───────── Bookings ─────────

  private bookingWhere(q: Pick<AdminBookingListQuery, 'search' | 'service' | 'status' | 'userId' | 'from' | 'to'>): Prisma.BookingWhereInput {
    const search = q.search?.trim();
    return {
      ...(q.service && { serviceType: q.service }),
      ...(q.status && { status: q.status }),
      ...(q.userId && { userId: q.userId }),
      ...((q.from || q.to) && { createdAt: { ...(q.from && { gte: dayStart(q.from) }), ...(q.to && { lt: dayEnd(q.to) }) } }),
      ...(search && {
        OR: [
          { reference: { contains: search, mode: 'insensitive' } },
          { contactEmail: { contains: search, mode: 'insensitive' } },
          ...phoneSearchTerms(search).map((term) => ({ contactPhone: { contains: term } })),
          { user: { fullName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };
  }

  private orderBy(sort: AdminBookingListQuery['sort'], amountField: 'totalAmountPaise' | 'amountPaise') {
    switch (sort) {
      case 'oldest':
        return { createdAt: 'asc' as const };
      case 'amount_desc':
        return { [amountField]: 'desc' as const };
      case 'amount_asc':
        return { [amountField]: 'asc' as const };
      default:
        return { createdAt: 'desc' as const };
    }
  }

  async listBookings(q: AdminBookingListQuery): Promise<AdminBookingsPage> {
    const where = this.bookingWhere(q);
    // The status chips show every status for the other filters, so their counts ignore the status filter.
    const { status: _status, ...withoutStatus } = q;
    const [items, total, net, byStatus] = await Promise.all([
      this.deps.prisma.booking.findMany({ where, include: adminBookingInclude, orderBy: this.orderBy(q.sort, 'totalAmountPaise'), skip: (q.page - 1) * q.limit, take: q.limit }),
      this.deps.prisma.booking.count({ where }),
      this.netPaid(where),
      this.deps.prisma.booking.groupBy({ by: ['status'], where: this.bookingWhere(withoutStatus), _count: { _all: true } }),
    ]);
    return {
      items: items.map((b) => this.row(b)),
      page: q.page,
      limit: q.limit,
      total,
      summary: {
        // Net: money paid minus refunds already completed (a refunded booking is not income).
        totalPaise: net,
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      },
    };
  }

  /** Money actually kept for these bookings: paid amounts minus completed refunds. */
  private async netPaid(where: Prisma.BookingWhereInput): Promise<number> {
    const [gross, refunded] = await Promise.all([
      this.deps.prisma.booking.aggregate({ where: { ...where, paymentStatus: { in: [...PAID] } }, _sum: { totalAmountPaise: true } }),
      this.deps.prisma.refund.aggregate({ where: { status: 'COMPLETED', booking: where }, _sum: { amountPaise: true } }),
    ]);
    return (gross._sum.totalAmountPaise ?? 0) - (refunded._sum.amountPaise ?? 0);
  }

  async bookingDetail(reference: string): Promise<AdminBookingDetail> {
    const b = await this.deps.prisma.booking.findUnique({ where: { reference }, include: adminBookingInclude });
    if (!b) throw new NotFoundError('Booking not found');
    return this.detail(b);
  }

  /**
   * Cancels a booking on the customer's behalf: frees held seats, cancels open payment orders and,
   * if it was paid and `refund` is set, raises a full refund through the gateway.
   */
  async cancelBooking(reference: string, input: { reason: string; refund: boolean }, actor: Actor): Promise<AdminBookingDetail> {
    const b = await this.deps.prisma.booking.findUnique({ where: { reference }, include: adminBookingInclude });
    if (!b) throw new NotFoundError('Booking not found');
    if (!CANCELLABLE.includes(b.status)) {
      throw new InvalidStateError(`A ${b.status.toLowerCase().replace(/_/g, ' ')} booking cannot be cancelled`);
    }
    if (b.train?.pnr) {
      throw new InvalidStateError('This train ticket has a PNR: cancel it with the railway from the booking page so refund rules apply');
    }
    const paid = (PAID as readonly string[]).includes(b.paymentStatus);
    const refundAmount = Math.max(0, b.totalAmountPaise - b.refunds.filter((r) => r.status !== 'FAILED').reduce((s, r) => s + r.amountPaise, 0));
    const willRefund = input.refund && paid && refundAmount > 0;
    // A paid booking cancelled without a refund is an explicit "no refund" decision that finance can see.
    const noRefundDecision = paid && !willRefund;
    const openOrders = b.payments.filter((p) => p.status === 'CREATED' || p.status === 'PENDING').map((p) => p.providerOrderId);
    await this.deps.prisma.$transaction(async (tx) => {
      const moved = await tx.booking.updateMany({
        where: { id: b.id, status: b.status },
        data: {
          status: willRefund ? 'REFUND_PENDING' : 'CANCELLED',
          cancelledAt: this.now(),
          cancellationReason: `ADMIN: ${noRefundDecision ? '[NO REFUND] ' : ''}${input.reason}`.slice(0, 300),
          ...(!paid && { paymentStatus: 'CANCELLED' }),
        },
      });
      if (moved.count !== 1) throw new ConflictError('The booking changed meanwhile; reload and try again');
      await this.releaseStock(tx, b);
      await tx.payment.updateMany({ where: { bookingId: b.id, status: { in: ['CREATED', 'PENDING'] } }, data: { status: 'CANCELLED' } });
      const raised = willRefund
        ? await this.deps.refunds.request(tx, { bookingId: b.id, amountPaise: refundAmount, reason: `Cancelled by ZPROO GO: ${input.reason}`.slice(0, 200), idempotencyKey: `admin-cancel:${b.id}`, requestedById: actor.userId })
        : null;
      await this.recordIn(tx, actor, 'booking.cancel', 'Booking', b.reference, {
        summary: `Cancelled ${b.reference}${raised ? ' and raised a refund' : noRefundDecision ? ' with NO refund (paid booking)' : ''}: ${input.reason}`,
        before: { status: b.status, paymentStatus: b.paymentStatus },
        after: { status: willRefund ? 'REFUND_PENDING' : 'CANCELLED', refundPaise: raised ? refundAmount : 0 },
      });
      return raised;
    });
    // Close the order at the payment company too, so a customer with the payment page already open cannot still pay.
    for (const orderId of openOrders) {
      try {
        await this.deps.payments?.cancelOrder?.(orderId);
      } catch (err) {
        this.deps.logger.warn({ err: { message: (err as Error).message }, orderId, reference: b.reference }, 'Could not cancel the open payment order at the gateway');
      }
    }
    // Refunds go to the finance team's queue (Refunds page) unless they are processed right away there.
    return this.bookingDetail(reference);
  }

  /**
   * Frees held stock through the owner of each service. Flights and buses hold seats from the
   * moment they are booked. Trains reserve with the railway only after payment (a booking with a
   * PNR is refused above), so a train booking holds nothing here. Other services have no booking
   * API yet, so they hold nothing to release.
   */
  private async releaseStock(tx: Prisma.TransactionClient, b: AdminBookingRecord): Promise<void> {
    switch (b.serviceType) {
      case 'FLIGHT':
        for (const leg of b.flights) await this.deps.flights.release(leg.offerId, leg.seats, tx);
        return;
      case 'BUS':
        if (b.bus) await this.deps.buses.release(b.id, tx);
        return;
      default:
        return;
    }
  }

  // ───────── Payments & refunds ─────────

  async listPayments(q: AdminPaymentListQuery): Promise<AdminPaymentsPage> {
    const search = q.search?.trim();
    const range = q.from || q.to ? { createdAt: { ...(q.from && { gte: dayStart(q.from) }), ...(q.to && { lt: dayEnd(q.to) }) } } : {};
    const where: Prisma.PaymentWhereInput = {
      ...range,
      ...(q.status && { status: q.status }),
      ...(q.service && { booking: { serviceType: q.service } }),
      ...(search && {
        OR: [
          { id: { startsWith: search } },
          { providerOrderId: { startsWith: search } },
          { providerPaymentId: { startsWith: search } },
          { booking: { reference: { contains: search, mode: 'insensitive' } } },
          { user: { fullName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };
    const [items, total, groups, refunded] = await Promise.all([
      this.deps.prisma.payment.findMany({ where, include: { booking: { select: { reference: true, serviceType: true } }, user: { select: { fullName: true } } }, orderBy: this.orderBy(q.sort, 'amountPaise'), skip: (q.page - 1) * q.limit, take: q.limit }),
      this.deps.prisma.payment.count({ where }),
      // The summary describes the same rows as the table: it uses every filter, not just the dates.
      this.deps.prisma.payment.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { amountPaise: true } }),
      this.deps.prisma.refund.aggregate({ where: { status: 'COMPLETED', ...range, ...(q.service && { booking: { serviceType: q.service } }) }, _sum: { amountPaise: true } }),
    ]);
    const okStatuses = new Set<string>(PAID);
    const settled = groups.filter((g) => g.status !== 'CREATED' && g.status !== 'PENDING');
    const ok = settled.filter((g) => okStatuses.has(g.status));
    const settledCount = settled.reduce((s, g) => s + g._count._all, 0);
    const okCount = ok.reduce((s, g) => s + g._count._all, 0);
    return {
      items: items.map((p) => ({
        id: p.id,
        bookingReference: p.booking.reference,
        serviceType: p.booking.serviceType as ServiceType,
        customerName: p.user.fullName,
        amountPaise: p.amountPaise,
        status: p.status,
        method: methodLabel(p.method),
        provider: p.provider,
        createdAt: p.createdAt.toISOString(),
        source: 'live',
      })),
      page: q.page,
      limit: q.limit,
      total,
      summary: {
        capturedPaise: ok.reduce((s, g) => s + (g._sum.amountPaise ?? 0), 0),
        failedCount: groups.find((g) => g.status === 'FAILED')?._count._all ?? 0,
        refundedPaise: refunded._sum.amountPaise ?? 0,
        successRatePct: settledCount ? Math.round((okCount / settledCount) * 1000) / 10 : 0,
      },
    };
  }

  async listRefunds(q: AdminRefundListQuery): Promise<AdminRefundsPage> {
    const search = q.search?.trim();
    const range = q.from || q.to ? { createdAt: { ...(q.from && { gte: dayStart(q.from) }), ...(q.to && { lt: dayEnd(q.to) }) } } : {};
    const where: Prisma.RefundWhereInput = {
      ...range,
      ...(q.status && { status: q.status }),
      ...(search && {
        OR: [
          { id: { startsWith: search } },
          { reason: { contains: search, mode: 'insensitive' } },
          { booking: { reference: { contains: search, mode: 'insensitive' } } },
          { booking: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
        ],
      }),
    };
    const [items, total, groups] = await Promise.all([
      this.deps.prisma.refund.findMany({ where, include: { booking: { include: { user: true } } }, orderBy: this.orderBy(q.sort, 'amountPaise'), skip: (q.page - 1) * q.limit, take: q.limit }),
      this.deps.prisma.refund.count({ where }),
      this.deps.prisma.refund.groupBy({ by: ['status'], where: range, _count: { _all: true }, _sum: { amountPaise: true } }),
    ]);
    const g = (s: string) => groups.find((x) => x.status === s);
    return {
      items: items.map((r) => this.refundRow(r, r.booking.serviceType, r.booking.reference, r.booking.user.fullName)),
      page: q.page,
      limit: q.limit,
      total,
      summary: {
        pendingCount: (g('REQUESTED')?._count._all ?? 0) + (g('PROCESSING')?._count._all ?? 0),
        pendingPaise: (g('REQUESTED')?._sum.amountPaise ?? 0) + (g('PROCESSING')?._sum.amountPaise ?? 0),
        completedPaise: g('COMPLETED')?._sum.amountPaise ?? 0,
        failedCount: g('FAILED')?._count._all ?? 0,
      },
    };
  }

  /**
   * PROCESSING sends the refund to the payment gateway (it completes when the gateway confirms);
   * COMPLETED records a refund settled outside the gateway (e.g. bank transfer); FAILED parks it.
   */
  async updateRefund(
    id: string,
    input: { status: 'PROCESSING' | 'COMPLETED' | 'FAILED'; note?: string | undefined; settlementReference?: string | undefined },
    actor: Actor,
  ): Promise<AdminRefundRow> {
    const refund = await this.deps.prisma.refund.findUnique({ where: { id } });
    if (!refund) throw new NotFoundError('Refund not found');
    const allowed: Record<string, string[]> = {
      REQUESTED: ['PROCESSING', 'COMPLETED', 'FAILED'],
      PROCESSING: ['COMPLETED', 'FAILED'],
      FAILED: ['PROCESSING'],
      COMPLETED: [],
    };
    if (!allowed[refund.status]?.includes(input.status)) {
      throw new InvalidStateError(`A ${refund.status.toLowerCase()} refund cannot move to ${input.status.toLowerCase()}`);
    }
    const reference = input.settlementReference?.trim();
    if (input.status === 'COMPLETED') {
      // Recording a refund as paid by hand is a money control: it needs proof and a second person.
      if (!reference) {
        throw new ValidationError([{ path: 'body.settlementReference', message: 'Enter the bank or gateway reference for this manual refund' }]);
      }
      if (refund.requestedById && refund.requestedById === actor.userId) {
        throw new AuthorizationError('A refund you raised must be marked paid by someone else');
      }
    }
    if (input.status === 'PROCESSING') {
      // The gateway call claims the refund atomically (only one caller can move it to PROCESSING).
      await this.deps.refunds.process(id);
      await this.record(actor, 'refund.processing', 'Refund', id, { summary: `Refund ${id} → PROCESSING${input.note ? `: ${input.note}` : ''}` });
    } else {
      await this.deps.prisma.$transaction(async (tx) => {
        // Only move the refund if it is still in the state we read, so a background retry or another admin cannot be overwritten.
        const moved = await tx.refund.updateMany({
          where: { id, status: refund.status },
          data:
            input.status === 'COMPLETED'
              ? { status: 'COMPLETED', completedAt: this.now(), settlementReference: reference ?? null, failureReason: null }
              : // "Failed" parks the refund: the automatic retry skips refunds that carry this prefix.
                { status: 'FAILED', failureReason: `${MANUAL_HOLD_PREFIX}${input.note ?? 'Marked failed by admin'}`.slice(0, 200) },
        });
        if (moved.count !== 1) throw new ConflictError('This refund changed meanwhile. Reload and try again');
        await this.recordIn(tx, actor, `refund.${input.status.toLowerCase()}`, 'Refund', id, {
          summary: `Refund ${id} → ${input.status}${reference ? ` (reference ${reference})` : ''}${input.note ? `: ${input.note}` : ''}`,
          before: { status: refund.status },
          after: { status: input.status },
        });
      });
      if (input.status === 'COMPLETED') await this.deps.refunds.settle(refund.bookingId);
    }
    const after = await this.deps.prisma.refund.findUniqueOrThrow({ where: { id }, include: { booking: { include: { user: true } } } });
    return this.refundRow(after, after.booking.serviceType, after.booking.reference, after.booking.user.fullName);
  }

  // ───────── Users ─────────

  async userDetail(id: string, actor?: Actor): Promise<AdminUserDetail> {
    const user = await this.deps.prisma.user.findFirst({ where: { id, deletedAt: null }, include: userWithRoles });
    if (!user) throw new NotFoundError('User not found');
    const [recent, stats, spent, cancelled] = await Promise.all([
      this.deps.prisma.booking.findMany({ where: { userId: id }, include: adminBookingInclude, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.deps.prisma.booking.count({ where: { userId: id } }),
      this.netPaid({ userId: id }),
      this.deps.prisma.booking.count({ where: { userId: id, status: { in: ['CANCELLED', 'REFUND_PENDING', 'REFUNDED'] } } }),
    ]);
    // Opening a customer's personal details is itself recorded.
    if (actor) {
      await this.deps.audit.record({
        action: 'user.view',
        actorId: actor.userId,
        entityType: 'User',
        entityId: id,
        after: { summary: `Viewed the profile of ${user.fullName}` },
        context: actor.ctx,
      });
    }
    return {
      ...toAdminUserRow(user),
      stats: { bookings: stats, spentPaise: spent, cancelled },
      recentBookings: recent.map((b) => this.row(b)),
    };
  }

  async setUserStatus(id: string, input: { status: UserStatus; reason?: string | undefined }, actor: Actor): Promise<AdminUserRow> {
    if (id === actor.userId) throw new InvalidStateError('You cannot change your own status');
    const user = await this.deps.prisma.user.findFirst({ where: { id, deletedAt: null }, include: userWithRoles });
    if (!user) throw new NotFoundError('User not found');
    if (user.roles.some((r) => r.role.name === 'SUPER_ADMIN') && !actor.roles.includes('SUPER_ADMIN')) {
      throw new InvalidStateError('Only a super admin can change another super admin');
    }
    const updated = await this.deps.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id }, data: { status: input.status }, include: userWithRoles });
      // Signed out everywhere: refresh tokens stop working at once (and every staff request re-checks the account).
      if (input.status !== 'ACTIVE') await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: this.now() } });
      await this.recordIn(tx, actor, 'user.status', 'User', id, {
        summary: `Set ${user.fullName} to ${input.status}${input.reason ? `: ${input.reason}` : ''}`,
        before: { status: user.status },
        after: { status: input.status },
      });
      return u;
    });
    return toAdminUserRow(updated);
  }

  async setUserRoles(id: string, roles: RoleName[], actor: Actor): Promise<AdminUserRow> {
    const unique = [...new Set(roles)];
    if (id === actor.userId && actor.roles.includes('SUPER_ADMIN') && !unique.includes('SUPER_ADMIN')) {
      throw new InvalidStateError('You cannot remove your own super admin role');
    }
    const user = await this.deps.prisma.user.findFirst({ where: { id, deletedAt: null }, include: userWithRoles });
    if (!user) throw new NotFoundError('User not found');
    // Only a super admin may grant or remove SUPER_ADMIN, or edit someone who has it.
    const targetIsSuper = user.roles.some((r) => r.role.name === 'SUPER_ADMIN');
    const actorIsSuper = actor.roles.includes('SUPER_ADMIN');
    if ((unique.includes('SUPER_ADMIN') || targetIsSuper) && !actorIsSuper) {
      throw new AuthorizationError('Only a super admin can grant or remove the super admin role');
    }
    const roleRows = await this.deps.prisma.role.findMany({ where: { name: { in: unique } } });
    if (roleRows.length !== unique.length) throw new ValidationError([{ path: 'body.roles', message: 'Unknown role' }]);
    const updated = await this.deps.prisma.$transaction(async (tx) => {
      if (targetIsSuper && !unique.includes('SUPER_ADMIN')) {
        // Never let the last active super admin be removed (that would lock everyone out of the panel).
        const others = await tx.user.count({
          where: { id: { not: id }, deletedAt: null, status: 'ACTIVE', roles: { some: { role: { name: 'SUPER_ADMIN' } } } },
        });
        if (others === 0) throw new InvalidStateError('Keep at least one active super admin');
      }
      await tx.userRole.deleteMany({ where: { userId: id, role: { name: { notIn: unique } } } });
      for (const role of roleRows) {
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: id, roleId: role.id } },
          create: { userId: id, roleId: role.id, assignedById: actor.userId },
          update: {},
        });
      }
      // Revoke sessions so the person signs in again with the new roles (staff requests also read roles from the database).
      await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: this.now() } });
      await this.recordIn(tx, actor, 'user.roles', 'User', id, {
        summary: `Roles of ${user.fullName}: ${unique.join(', ')}`,
        before: { roles: user.roles.map((r) => r.role.name) },
        after: { roles: unique },
      });
      return tx.user.findUniqueOrThrow({ where: { id }, include: userWithRoles });
    });
    return toAdminUserRow(updated);
  }

  // ───────── Inventory ─────────

  async inventory(service: ServiceType, q: { page: number; limit: number; search?: string | undefined; listed?: 'true' | 'false' | undefined }): Promise<AdminInventoryPage> {
    const cat = transportCatalogue(service) ?? { columns: [], items: [] };
    const hidden = await this.unlisted(service);
    const items = cat.items
      .map((i) => ({ ...i, listed: !hidden.has(i.id) }))
      .filter((i) => (!q.listed || String(i.listed) === q.listed) && matchesSearch(q.search, i.name, i.subtitle, ...Object.values(i.facts)));
    const [bookings, revenue] = await Promise.all([
      // Abandoned checkouts (cancelled and never paid) are not bookings.
      this.deps.prisma.booking.count({
        where: {
          serviceType: service,
          status: { notIn: ['INITIATED', 'PENDING_PAYMENT'] },
          NOT: { status: 'CANCELLED', paymentStatus: { notIn: [...PAID] } },
        },
      }),
      this.netPaid({ serviceType: service }),
    ]);
    const unlistedCount = cat.items.filter((i) => hidden.has(i.id)).length;
    return {
      service,
      ...paginate(items, q.page, q.limit),
      columns: cat.columns,
      stats: { listed: cat.items.length - unlistedCount, unlisted: unlistedCount, bookings, revenuePaise: revenue },
    };
  }

  async setListed(service: ServiceType, id: string, listed: boolean, actor: Actor) {
    const cat = transportCatalogue(service);
    const item = cat?.items.find((i) => i.id === id);
    if (!item) throw new NotFoundError('Item not found');
    this.unlistedCache = null;
    await this.deps.prisma.$transaction(async (tx) => {
      // Lock the row so two admins hiding different items do not overwrite each other.
      await tx.$queryRaw`SELECT key FROM system_settings WHERE key = ${UNLISTED_KEY} FOR UPDATE`;
      const row = await tx.systemSetting.findUnique({ where: { key: UNLISTED_KEY } });
      const map = { ...((row?.value ?? {}) as Partial<Record<ServiceType, string[]>>) };
      const set = new Set(map[service] ?? []);
      if (listed) set.delete(id);
      else set.add(id);
      map[service] = [...set];
      await tx.systemSetting.upsert({
        where: { key: UNLISTED_KEY },
        create: { key: UNLISTED_KEY, value: map, description: 'Catalogue items hidden from the website', updatedById: actor.userId },
        update: { value: map, updatedById: actor.userId },
      });
      await this.recordIn(tx, actor, listed ? 'inventory.list' : 'inventory.unlist', service, id, { summary: `${listed ? 'Listed' : 'Hid'} ${item.name}` });
    });
    this.unlistedCache = null;
    return { ...item, listed };
  }

  // ───────── Collections ─────────

  async list<K extends AdminCollectionName>(name: K): Promise<AdminCollections[K][]> {
    if (name === 'notifications') await this.dispatchDueNotifications();
    const rows = await this.deps.prisma.adminRecord.findMany({ where: { collection: name }, orderBy: { createdAt: 'desc' } });
    return rows.map((r) => r.data as unknown as AdminCollections[K]);
  }

  /** Live offers for the public site. Cached for a minute (the site reads this on every visit); an offer change clears the cache. */
  async publicOffers(): Promise<AdminCollections['offers'][]> {
    if (this.offersCache && Date.now() - this.offersCache.at < 60_000) return this.offersCache.value;
    const now = this.now().getTime();
    const value = (await this.list('offers'))
      .filter((o) => o.active && adminInstant(o.validTo, 'end') >= now && (!o.validFrom || adminInstant(o.validFrom, 'start') <= now))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    this.offersCache = { at: Date.now(), value };
    return value;
  }

  /**
   * Scheduled campaigns are sent by whoever asks next once their time has passed (the admin list
   * or a customer's bell), so no separate job is needed: the record flips to SENT with the
   * audience size at that moment.
   */
  async dispatchDueNotifications(): Promise<void> {
    const nowIso = this.now().toISOString();
    const rows = await this.deps.prisma.adminRecord.findMany({
      where: { collection: 'notifications', data: { path: ['status'], equals: 'SCHEDULED' } },
    });
    const due = rows.filter((r) => {
      const n = r.data as unknown as AdminCollections['notifications'];
      return n.scheduledFor && Date.parse(n.scheduledFor) <= this.now().getTime();
    });
    if (!due.length) return;
    const sizes = await this.audienceSizes();
    for (const r of due) {
      const n = r.data as unknown as AdminCollections['notifications'];
      const sent: AdminCollections['notifications'] = {
        ...n,
        status: 'SENT',
        sentAt: n.scheduledFor ?? nowIso,
        recipients: sizes[n.audience] ?? 0,
        updatedAt: nowIso,
      };
      // Only flips a record that is still scheduled, so two requests at once send it once.
      await this.deps.prisma.adminRecord.updateMany({
        where: { id: r.id, collection: 'notifications', data: { path: ['status'], equals: 'SCHEDULED' } },
        data: { data: sent as unknown as Prisma.InputJsonValue },
      });
    }
  }

  /** The in-app / push campaigns one customer should see, newest first (read state lives in the browser). */
  async notificationsFor(userId: string): Promise<UserNotification[]> {
    const user = await this.deps.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, status: true, deletedAt: true, roles: { select: { role: { select: { name: true } } } } },
    });
    if (!user || user.deletedAt || user.status !== 'ACTIVE') return [];
    const isStaff = user.roles.some((r) => r.role.name !== 'USER');
    const all = (await this.list('notifications'))
      .filter((n) => n.status === 'SENT' && n.sentAt && (n.channels.includes('IN_APP') || n.channels.includes('PUSH')))
      .slice(0, 100);
    const DAY = 86_400_000;
    const out: UserNotification[] = [];
    for (const n of all) {
      const sentAt = Date.parse(n.sentAt as string);
      let reaches = false;
      switch (n.audience) {
        case 'ALL_USERS':
          reaches = true;
          break;
        case 'STAFF':
          reaches = isStaff;
          break;
        case 'INACTIVE_USERS':
          // A win-back message waits for the customer's return: anyone who already had an account.
          reaches = user.createdAt.getTime() <= sentAt;
          break;
        case 'RECENT_CUSTOMERS':
          reaches =
            (await this.deps.prisma.booking.count({
              where: { userId, createdAt: { gte: new Date(sentAt - 60 * DAY), lte: new Date(sentAt) } },
            })) > 0;
          break;
      }
      if (reaches) out.push({ id: n.id, title: n.title, body: n.body, linkPath: n.linkPath, sentAt: n.sentAt as string });
    }
    return out.sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, 30);
  }

  private parse<K extends AdminCollectionName>(name: K, input: unknown): Record<string, unknown> {
    const result = adminCollectionSchemas[name].safeParse(input);
    if (!result.success) {
      throw new ValidationError(zodIssues(result.error).map((i) => ({ ...i, path: `body.${i.path}`.replace(/\.$/, '') })));
    }
    return result.data as Record<string, unknown>;
  }

  private async build<K extends AdminCollectionName>(name: K, input: Record<string, unknown>, existing?: AdminCollections[K]) {
    if (name === 'coupons') {
      const clash = await this.deps.prisma.adminRecord.findFirst({
        where: { collection: 'coupons', data: { path: ['code'], equals: String(input.code) }, ...(existing && { id: { not: existing.id } }) },
      });
      if (clash) throw new ConflictError(`Coupon ${String(input.code)} already exists`);
    }
    // Ticket numbers come from a database sequence: unique even for two tickets created at once or after a delete.
    let ticketNumber: number | undefined;
    if (name === 'tickets' && !existing) {
      const [row] = await this.deps.prisma.$queryRaw<{ n: bigint | number }[]>`SELECT nextval('admin_ticket_number_seq') AS n`;
      ticketNumber = Number(row?.n);
    }
    const audience = name === 'notifications' ? await this.audienceSizes() : null;
    return buildAdminDoc(name, input, existing, {
      now: this.now().toISOString(),
      newId: (prefix) => `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      ticketCount: 0,
      ...(ticketNumber !== undefined && { ticketNumber }),
      audienceSize: (a) => audience?.[a] ?? 0,
    });
  }

  async create<K extends AdminCollectionName>(name: K, body: unknown, actor: Actor): Promise<AdminCollections[K]> {
    const doc = await this.build(name, this.parse(name, body));
    try {
      await this.deps.prisma.$transaction(async (tx) => {
        await tx.adminRecord.create({ data: { id: doc.id, collection: name, data: doc as unknown as Prisma.InputJsonValue } });
        await this.recordIn(tx, actor, `${name}.create`, name, doc.id, { summary: `Created ${ADMIN_DOC_LABEL(doc)}`, after: doc as unknown as Prisma.InputJsonValue });
      });
    } catch (err) {
      // The database's unique rule on coupon codes catches two admins creating the same code at once.
      if (name === 'coupons' && (err as { code?: string }).code === 'P2002') throw new ConflictError(`Coupon ${String((doc as { code?: string }).code)} already exists`);
      throw err;
    }
    return doc;
  }

  /** Reads the row under a lock, so two admins editing the same record are applied one after the other, never over each other. */
  private async withLockedDoc<K extends AdminCollectionName, R>(
    name: K,
    id: string,
    fn: (doc: AdminCollections[K], tx: Prisma.TransactionClient) => Promise<R>,
  ): Promise<R> {
    return this.deps.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ data: unknown }[]>`SELECT data FROM admin_records WHERE id = ${id} AND collection = ${name} FOR UPDATE`;
      const row = rows[0];
      if (!row) throw new NotFoundError('Not found');
      return fn(row.data as AdminCollections[K], tx);
    });
  }

  async update<K extends AdminCollectionName>(name: K, id: string, body: unknown, actor: Actor): Promise<AdminCollections[K]> {
    return this.withLockedDoc(name, id, async (existing, tx) => {
      const doc = await this.build(name, this.parse(name, { ...adminDocForm(name, existing), ...(body as object) }), existing);
      try {
        await tx.adminRecord.update({ where: { id }, data: { data: doc as unknown as Prisma.InputJsonValue } });
      } catch (err) {
        if (name === 'coupons' && (err as { code?: string }).code === 'P2002') throw new ConflictError(`Coupon ${String((doc as { code?: string }).code)} already exists`);
        throw err;
      }
      await this.recordIn(tx, actor, `${name}.update`, name, id, {
        summary: `Updated ${ADMIN_DOC_LABEL(doc)}`,
        before: existing as unknown as Prisma.InputJsonValue,
        after: doc as unknown as Prisma.InputJsonValue,
      });
      return doc;
    });
  }

  async remove(name: AdminCollectionName, id: string, actor: Actor): Promise<{ id: string }> {
    return this.withLockedDoc(name, id, async (existing, tx) => {
      await tx.adminRecord.delete({ where: { id } });
      await this.recordIn(tx, actor, `${name}.delete`, name, id, {
        summary: `Deleted ${ADMIN_DOC_LABEL(existing)}`,
        before: existing as unknown as Prisma.InputJsonValue,
      });
      return { id };
    });
  }

  async replyToTicket(id: string, input: { body: string; internal: boolean }, actor: Actor) {
    const me = await this.deps.prisma.user.findUnique({ where: { id: actor.userId }, select: { fullName: true } });
    const name = me?.fullName ?? 'Support';
    return this.withLockedDoc('tickets', id, async (ticket, tx) => {
      ticket.messages.push({ id: `msg_${randomUUID().slice(0, 12)}`, author: 'AGENT', name, body: input.body, internal: input.internal, at: this.now().toISOString() });
      if (!input.internal && ticket.status === 'OPEN') ticket.status = 'IN_PROGRESS';
      ticket.assignee ??= name;
      ticket.updatedAt = this.now().toISOString();
      await tx.adminRecord.update({ where: { id }, data: { data: ticket as unknown as Prisma.InputJsonValue } });
      await this.recordIn(tx, actor, 'ticket.reply', 'Ticket', ticket.number, { summary: `${input.internal ? 'Note on' : 'Replied to'} ${ticket.number}` });
      return ticket;
    });
  }

  async updateTicket(id: string, input: { status?: string | undefined; priority?: string | undefined; assignee?: string | null | undefined }, actor: Actor) {
    return this.withLockedDoc('tickets', id, async (ticket, tx) => {
      const before = { status: ticket.status, priority: ticket.priority, assignee: ticket.assignee };
      if (input.status && input.status !== ticket.status) {
        ticket.messages.push({ id: `msg_${randomUUID().slice(0, 12)}`, author: 'SYSTEM', name: 'System', body: `Status changed to ${input.status.replace(/_/g, ' ').toLowerCase()}`, internal: true, at: this.now().toISOString() });
      }
      Object.assign(ticket, Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)));
      ticket.updatedAt = this.now().toISOString();
      await tx.adminRecord.update({ where: { id }, data: { data: ticket as unknown as Prisma.InputJsonValue } });
      await this.recordIn(tx, actor, 'ticket.update', 'Ticket', ticket.number, {
        summary: `Updated ${ticket.number}`,
        before,
        after: { status: ticket.status, priority: ticket.priority, assignee: ticket.assignee },
      });
      return ticket;
    });
  }

  private async countOpenTickets(): Promise<number> {
    return this.deps.prisma.adminRecord.count({
      where: { collection: 'tickets', OR: [{ data: { path: ['status'], equals: 'OPEN' } }, { data: { path: ['status'], equals: 'IN_PROGRESS' } }] },
    });
  }

  private async audienceSizes(): Promise<Record<NotificationAudience, number>> {
    const cutoff = new Date(this.now().getTime() - 60 * 86_400_000);
    const [all, staff, inactive, recent] = await Promise.all([
      this.deps.prisma.user.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.deps.prisma.user.count({ where: { deletedAt: null, roles: { some: { role: { name: { not: 'USER' } } } } } }),
      this.deps.prisma.user.count({ where: { deletedAt: null, OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: cutoff } }] } }),
      this.deps.prisma.booking.groupBy({ by: ['userId'], where: { createdAt: { gte: cutoff } } }).then((g) => g.length),
    ]);
    return { ALL_USERS: all, STAFF: staff, INACTIVE_USERS: inactive, RECENT_CUSTOMERS: recent };
  }

  // ───────── Wallet (one real wallet per customer + ledger) ─────────

  /** Totals across all customer wallets plus the latest ledger entries. */
  async wallet(): Promise<AdminWalletSummary> {
    const [balances, sums, rows] = await Promise.all([
      this.deps.prisma.wallet.aggregate({ _sum: { balancePaise: true } }),
      this.deps.prisma.walletTransaction.groupBy({ by: ['type'], _sum: { amountPaise: true } }),
      this.deps.prisma.walletTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: { wallet: { select: { user: { select: { fullName: true } } } } },
      }),
    ]);
    const total = (type: string) => sums.find((s) => s.type === type)?._sum.amountPaise ?? 0;
    return {
      balancePaise: balances._sum.balancePaise ?? 0,
      creditedPaise: total('credit'),
      debitedPaise: total('debit'),
      transactions: rows.map((t) => ({
        id: t.id,
        userName: t.wallet.user.fullName,
        type: t.type as 'credit' | 'debit',
        amountPaise: t.amountPaise,
        label: t.label,
        createdAt: t.createdAt.toISOString(),
        source: 'live' as const,
      })),
    };
  }

  /**
   * Credits or debits one customer's wallet. The change is a single guarded database step: a debit
   * only succeeds if the balance still covers it, and the same `requestId` applied twice (a double
   * click or a retry) changes the wallet once.
   */
  async adjustWallet(
    input: { type: 'credit' | 'debit'; amountPaise: number; label: string; userId?: string | undefined; requestId?: string | undefined },
    actor: Actor,
  ): Promise<AdminWalletSummary> {
    if (!input.userId) throw new ValidationError([{ path: 'body.userId', message: 'Choose the customer whose wallet to change' }]);
    const userId = input.userId;
    const user = await this.deps.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { fullName: true } });
    if (!user) throw new NotFoundError('Customer not found');
    const idempotencyKey = `admin:${actor.userId}:${input.requestId ?? randomUUID()}`;
    try {
      await this.deps.prisma.$transaction(async (tx) => {
        const repeat = await tx.walletTransaction.findUnique({ where: { idempotencyKey } });
        if (repeat) return; // already applied
        const wallet = await tx.wallet.upsert({ where: { userId }, create: { userId, balancePaise: 0 }, update: {} });
        if (input.type === 'debit') {
          // One conditional update: it matches only while the balance still covers the debit.
          const moved = await tx.wallet.updateMany({ where: { id: wallet.id, balancePaise: { gte: input.amountPaise } }, data: { balancePaise: { decrement: input.amountPaise } } });
          if (moved.count !== 1) throw new InvalidStateError('This wallet does not have enough balance for that debit');
        } else {
          await tx.wallet.update({ where: { id: wallet.id }, data: { balancePaise: { increment: input.amountPaise } } });
        }
        const after = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
        await tx.walletTransaction.create({
          data: { walletId: wallet.id, userId, type: input.type, amountPaise: input.amountPaise, balanceAfterPaise: after.balancePaise, label: input.label, idempotencyKey, actorId: actor.userId },
        });
        await this.recordIn(tx, actor, `wallet.${input.type}`, 'Wallet', userId, {
          summary: `${input.type === 'credit' ? 'Credited' : 'Debited'} ₹${(input.amountPaise / 100).toLocaleString('en-IN')} ${input.type === 'credit' ? 'to' : 'from'} ${user.fullName}: ${input.label}`,
          before: { balancePaise: wallet.balancePaise },
          after: { balancePaise: after.balancePaise },
        });
      });
    } catch (err) {
      // Two identical requests at the same moment: the unique key lets one through; the other is a repeat.
      if ((err as { code?: string }).code !== 'P2002') throw err;
    }
    return this.wallet();
  }

  // ───────── Audit ─────────

  async auditLog(q: { page: number; limit: number; search?: string | undefined; entityType?: string | undefined }): Promise<AdminAuditPage> {
    const search = q.search?.trim();
    const where: Prisma.AuditLogWhereInput = {
      ...(q.entityType && { entityType: q.entityType }),
      ...(search && {
        OR: [
          { action: { contains: search, mode: 'insensitive' } },
          { entityId: { contains: search, mode: 'insensitive' } },
          { actor: { fullName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };
    const [rows, total] = await Promise.all([
      this.deps.prisma.auditLog.findMany({ where, include: { actor: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.deps.prisma.auditLog.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        actorName: r.actor?.fullName ?? 'System',
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        summary: ((r.after as { summary?: string } | null)?.summary) ?? r.action.replace(/[._]/g, ' ').toLowerCase(),
        createdAt: r.createdAt.toISOString(),
      })),
      page: q.page,
      limit: q.limit,
      total,
    };
  }

  // ───────── Users list (existing endpoint) ─────────

  async users(q: { page: number; limit: number; search?: string | undefined; role?: RoleName | undefined; status?: UserStatus | undefined }): Promise<Paginated<AdminUserRow>> {
    const search = q.search?.trim();
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(q.status && { status: q.status }),
      ...(q.role && { roles: { some: { role: { name: q.role } } } }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search.toLowerCase() } },
          { phone: { contains: search.replace(/\s/g, '') } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      this.deps.prisma.user.findMany({ where, include: userWithRoles, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.deps.prisma.user.count({ where }),
    ]);
    return { items: items.map(toAdminUserRow), page: q.page, limit: q.limit, total };
  }

  // ───────── mapping ─────────

  private row(b: AdminBookingRecord): AdminBookingRow {
    const item = toBookingListItem(b);
    return {
      reference: b.reference,
      serviceType: b.serviceType as ServiceType,
      status: b.status,
      paymentStatus: b.paymentStatus,
      title: item.title,
      subtitle: item.subtitle,
      customerName: b.user.fullName,
      customerContact: b.contactPhone || b.contactEmail,
      userId: b.userId,
      travelDate: b.travelDate.toISOString().slice(0, 10),
      totalPaise: b.totalAmountPaise,
      createdAt: b.createdAt.toISOString(),
      source: 'live',
    };
  }

  private payments(b: AdminBookingRecord): AdminPaymentRow[] {
    return b.payments.map((p) => ({
      id: p.id,
      bookingReference: b.reference,
      serviceType: b.serviceType as ServiceType,
      customerName: b.user.fullName,
      amountPaise: p.amountPaise,
      status: p.status,
      method: methodLabel(p.method),
      provider: p.provider,
      createdAt: p.createdAt.toISOString(),
      source: 'live',
    }));
  }

  private refundRow(
    r: { id: string; amountPaise: number; status: AdminRefundRow['status']; reason: string; createdAt: Date; completedAt: Date | null },
    serviceType: string,
    bookingReference: string,
    customerName: string,
  ): AdminRefundRow {
    return {
      id: r.id,
      bookingReference,
      serviceType: serviceType as ServiceType,
      customerName,
      amountPaise: r.amountPaise,
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      source: 'live',
    };
  }

  private detail(b: AdminBookingRecord): AdminBookingDetail {
    const d = toBookingDetails(b);
    const row = this.row(b);
    return {
      ...row,
      passengers: d.passengers.map((p) => ({
        name: `${p.title} ${p.firstName} ${p.lastName}`.trim(),
        detail: [p.type, p.gender, p.age !== null && p.age !== undefined ? `${p.age} yrs` : null, p.seatNumber ? `Seat ${p.seatNumber}` : null].filter(Boolean).join(' · '),
      })),
      payments: this.payments(b),
      refunds: b.refunds.map((r) => this.refundRow(r, b.serviceType, b.reference, b.user.fullName)),
      priceLines: d.price.lines.map((l) => ({ label: l.label, paise: l.amountPaise })),
      timeline: [
        { at: b.createdAt.toISOString(), label: 'Booking created' },
        ...b.payments.filter((p) => p.status === 'FAILED').map((p) => ({ at: p.updatedAt.toISOString(), label: `Payment attempt failed${p.failureReason ? `: ${p.failureReason}` : ''}` })),
        ...(b.confirmedAt ? [{ at: b.confirmedAt.toISOString(), label: 'Payment received · booking confirmed' }] : []),
        ...(b.cancelledAt ? [{ at: b.cancelledAt.toISOString(), label: `Cancelled${b.cancellationReason ? `: ${b.cancellationReason.replace(/^ADMIN: /, 'by admin — ').replace(/^CUSTOMER: /, 'by customer — ')}` : ''}` }] : []),
        ...b.refunds.map((r) => ({ at: r.createdAt.toISOString(), label: `Refund of ₹${(r.amountPaise / 100).toLocaleString('en-IN')} requested` })),
        ...b.refunds.flatMap((r) => (r.completedAt ? [{ at: r.completedAt.toISOString(), label: 'Refund completed' }] : [])),
      ].sort((x, y) => x.at.localeCompare(y.at)),
      notes: [
        ...b.flights.map((f) => (f.pnr ? `Flight PNR ${f.pnr}` : '')),
        b.bus?.pnr ? `Bus PNR ${b.bus.pnr}` : '',
        b.train?.pnr ? `Train PNR ${b.train.pnr}` : '',
      ].filter(Boolean),
    };
  }

  /**
   * Writes the audit row inside the caller's transaction, so a change and its audit entry are saved
   * together or not at all (an un-audited money or permission change cannot happen).
   */
  private async recordIn(
    db: Db,
    actor: Actor,
    action: string,
    entityType: string,
    entityId: string | null,
    extra: { summary: string; before?: Prisma.InputJsonValue; after?: Prisma.InputJsonValue },
  ) {
    await db.auditLog.create({
      data: {
        action,
        actorId: actor.userId,
        entityType,
        entityId,
        ...(extra.before !== undefined && { before: extra.before }),
        after: { summary: extra.summary, ...(typeof extra.after === 'object' && extra.after !== null && !Array.isArray(extra.after) ? (extra.after as object) : {}) },
        ipAddress: actor.ctx.ip ?? null,
        userAgent: actor.ctx.userAgent?.slice(0, 512) ?? null,
        requestId: actor.ctx.requestId ?? null,
      },
    });
    // Anything an admin changes makes cached dashboard and offer data stale.
    this.dashboardCache.clear();
    this.offersCache = null;
  }

  private async record(
    actor: Actor,
    action: string,
    entityType: string,
    entityId: string | null,
    extra: { summary: string; before?: Prisma.InputJsonValue; after?: Prisma.InputJsonValue },
  ) {
    this.dashboardCache.clear();
    this.offersCache = null;
    await this.deps.audit.record({
      action,
      actorId: actor.userId,
      entityType,
      entityId,
      ...(extra.before !== undefined && { before: extra.before }),
      after: { summary: extra.summary, ...(typeof extra.after === 'object' && extra.after !== null && !Array.isArray(extra.after) ? (extra.after as object) : {}) },
      context: actor.ctx,
    });
  }
}

/** Phone numbers are searched as typed and without a +91 / 91 prefix, spaces and dashes. */
function phoneSearchTerms(search: string): string[] {
  const compact = search.replace(/[\s-]/g, '');
  const terms = new Set<string>([compact]);
  const digits = compact.replace(/\D/g, '');
  if (digits.length >= 4) {
    terms.add(digits);
    if (digits.length > 10 && digits.startsWith('91')) terms.add(digits.slice(2));
  }
  return [...terms].filter((t) => t.length >= 3);
}

/** The dashboard for staff without finance access: counts stay, every money figure is removed. */
function redactRevenue(d: AdminDashboard): AdminDashboard {
  return {
    ...d,
    kpis: { ...d.kpis, revenuePaise: 0, revenueChangePct: null, avgOrderPaise: 0, pendingRefundsPaise: 0 },
    series: d.series.map((p) => ({ ...p, revenuePaise: 0 })),
    byService: d.byService.map((s) => ({ ...s, revenuePaise: 0 })),
    topRoutes: d.topRoutes.map((r) => ({ ...r, revenuePaise: 0 })),
    paymentMethods: [],
    revenueHidden: true,
  };
}
