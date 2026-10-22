import {
  Permission,
  type AdminAuditPage,
  type AdminBookingDetail,
  type AdminBookingsPage,
  type AdminCollectionName,
  type AdminCollections,
  type AdminInventoryPage,
  type AdminMeta,
  type AdminPaymentRow,
  type AdminPaymentsPage,
  type AdminRefundRow,
  type AdminRefundsPage,
  type AdminUserDetail,
  type AdminUserRow,
  type AdminWalletSummary,
  type BookingStatus,
  type PlatformSettings,
  type RoleName,
} from '@zproo/types';
import {
  ADMIN_DOC_LABEL,
  adminDocForm,
  buildAdminDoc,
  buildDashboard,
  buildReport,
  inDayRange,
  isOpenRefund,
  isPaidBooking,
  matchesSearch,
  paginate,
  sortRows,
} from '@zproo/utils';
import {
  adminAuditQuerySchema,
  adminBookingListQuerySchema,
  adminCancelBookingSchema,
  adminCollectionNameSchema,
  adminCollectionSchemas,
  adminPaymentListQuerySchema,
  adminRefundListQuerySchema,
  adminRefundUpdateSchema,
  adminUserListQuerySchema,
  adminUserRolesSchema,
  adminUserStatusSchema,
  adminWalletAdjustSchema,
  dashboardQuerySchema,
  inventoryQuerySchema,
  inventoryToggleSchema,
  reportQuerySchema,
  serviceTypeSchema,
  settingsUpdateSchema,
  ticketReplySchema,
  ticketUpdateSchema,
} from '@zproo/validation';
import { useWallet } from '@/store/wallet';
import {
  db,
  notFound,
  parse,
  publicUser,
  requirePermission,
  rolesOf,
  save,
  StaticError,
  type StaticRequest,
  type StaticResult,
  type StoredUser,
} from '../core';
import { adminDb, audit, DEFAULT_SETTINGS, newId, resetAdminDb, saveAdminDb } from './db';
import { demoData, STARTERS } from './demo';
import { catalogue } from './inventory';
import { unlistedIds } from './public';
import { dispatchDueNotifications } from './publicNotifications';
import { allBookings, type UnifiedBooking } from './sources';

/**
 * The admin API, answered in the browser (static/demo mode). Same paths, shapes, permission
 * checks and validation as the server's `/api/admin/*`, so the panel works unchanged against both.
 */

const settings = (): PlatformSettings => adminDb().settings;
const includeDemo = () => settings().showDemoData;
const actorName = (u: StoredUser) => u.fullName;
const now = () => new Date().toISOString();

// ───────── Users ─────────

interface UnifiedUser extends AdminUserRow {
  source: 'live' | 'demo';
}

function allUsers(): UnifiedUser[] {
  const live: UnifiedUser[] = db().users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    phone: u.phone,
    email: u.email,
    status: u.status ?? 'ACTIVE',
    roles: rolesOf(u),
    lastLoginAt: u.lastLoginAt ?? null,
    createdAt: u.createdAt,
    source: 'live',
  }));
  if (!includeDemo()) return live;
  const overrides = adminDb().userOverrides;
  const demo: UnifiedUser[] = demoData(adminDb().demoSeed).users.map((u) => ({
    ...u,
    ...overrides[u.id],
    source: 'demo',
  }));
  return [...live, ...demo];
}

const toRow = ({ source: _source, ...row }: UnifiedUser): AdminUserRow => row;

function findUser(id: string): UnifiedUser {
  const user = allUsers().find((u) => u.id === id);
  if (!user) throw notFound('User not found');
  return user;
}

// ───────── Collections ─────────

function collection<K extends AdminCollectionName>(name: K): AdminCollections[K][] {
  const a = adminDb();
  if (!a.seeded[name]) {
    (a.collections[name] as AdminCollections[K][]) = [
      ...(STARTERS[name]() as AdminCollections[K][]),
      ...(a.collections[name] as AdminCollections[K][]),
    ];
    a.seeded[name] = true;
    saveAdminDb();
  }
  return a.collections[name] as AdminCollections[K][];
}

const COLLECTION_PERMISSION: Record<AdminCollectionName, Permission> = {
  coupons: Permission.OFFER_MANAGE,
  offers: Permission.OFFER_MANAGE,
  notifications: Permission.OFFER_MANAGE,
  tickets: Permission.SUPPORT_TICKET_MANAGE,
  partners: Permission.PARTNER_MANAGE,
  drivers: Permission.DRIVER_MANAGE,
};

const SINGULAR: Record<AdminCollectionName, string> = {
  coupons: 'Coupon',
  offers: 'Offer',
  notifications: 'Notification',
  tickets: 'Ticket',
  partners: 'Partner',
  drivers: 'Driver',
};

function audienceSize(audience: AdminCollections['notifications']['audience']): number {
  const users = allUsers();
  const cutoff = Date.now() - 60 * 86_400_000;
  switch (audience) {
    case 'STAFF':
      return users.filter((u) => u.roles.some((r) => r !== 'USER')).length;
    case 'INACTIVE_USERS':
      return users.filter((u) => !u.lastLoginAt || Date.parse(u.lastLoginAt) < cutoff).length;
    case 'RECENT_CUSTOMERS': {
      const recent = new Set(
        allBookings({ includeDemo: includeDemo() })
          .filter((b) => Date.parse(b.row.createdAt) > cutoff)
          .map((b) => b.row.userId ?? b.row.customerContact),
      );
      return recent.size;
    }
    default:
      return users.filter((u) => u.status === 'ACTIVE').length;
  }
}

/** Builds a stored document from validated input (create or full update). */
function materialise<K extends AdminCollectionName>(
  name: K,
  input: Record<string, unknown>,
  existing: AdminCollections[K] | undefined,
): AdminCollections[K] {
  if (name === 'coupons') {
    const code = String(input.code);
    if (collection('coupons').some((c) => c.code === code && c.id !== existing?.id)) {
      throw new StaticError(409, 'CONFLICT', `Coupon ${code} already exists`);
    }
  }
  return buildAdminDoc(name, input, existing, {
    now: now(),
    newId,
    ticketCount: collection('tickets').length,
    audienceSize,
  });
}

// ───────── Bookings ─────────

function bookings(): UnifiedBooking[] {
  return allBookings({ includeDemo: includeDemo() });
}

function findBooking(reference: string): UnifiedBooking {
  const b = bookings().find((x) => x.row.reference === reference.toUpperCase() || x.row.reference === reference);
  if (!b) throw notFound('Booking not found');
  return b;
}

function detail(u: UnifiedBooking): AdminBookingDetail {
  return {
    ...u.row,
    passengers: u.passengers,
    payments: u.payments,
    refunds: u.refunds,
    timeline: [...u.timeline].sort((a, b) => a.at.localeCompare(b.at)),
    notes: u.notes,
    priceLines: u.priceLines,
  };
}

const CANCELLABLE = new Set<BookingStatus>(['PENDING_PAYMENT', 'PROCESSING', 'CONFIRMED', 'INITIATED']);

// ───────── Router ─────────

export function adminRoutes(req: StaticRequest): StaticResult | null {
  const { method, path, params, body } = req;

  if (!path.startsWith('/admin')) return null;
  const sub = path.slice('/admin'.length) || '/';
  const me = requirePermission(Permission.ADMIN_ACCESS);

  if (method === 'GET' && sub === '/meta') {
    return { data: { mode: 'static', demoDataAvailable: true } satisfies AdminMeta };
  }

  // ── Dashboard ──
  if (method === 'GET' && sub === '/dashboard') {
    requirePermission(Permission.BOOKING_READ_ANY);
    const { days } = parse(dashboardQuerySchema, params, 'query');
    const all = bookings();
    return {
      data: buildDashboard(
        {
          bookings: all.map((b) => b.row),
          payments: all.flatMap((b) => b.payments),
          refunds: all.flatMap((b) => b.refunds),
          users: allUsers(),
          openTickets: collection('tickets').filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
          includesDemoData: includeDemo(),
        },
        days,
      ),
    };
  }

  // ── Bookings ──
  if (method === 'GET' && sub === '/bookings') {
    requirePermission(Permission.BOOKING_READ_ANY);
    const q = parse(adminBookingListQuerySchema, params, 'query');
    const rows = inDayRange(bookings().map((b) => b.row), q.from, q.to).filter(
      (b) =>
        (!q.service || b.serviceType === q.service) &&
        (!q.status || b.status === q.status) &&
        (!q.userId || b.userId === q.userId) &&
        matchesSearch(q.search, b.reference, b.customerName, b.customerContact, b.title, b.subtitle),
    );
    const byStatus: AdminBookingsPage['summary']['byStatus'] = {};
    for (const b of rows) byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
    const page: AdminBookingsPage = {
      ...paginate(sortRows(rows, q.sort, (b) => b.totalPaise), q.page, q.limit),
      summary: { totalPaise: rows.filter(isPaidBooking).reduce((s, b) => s + b.totalPaise, 0), byStatus },
    };
    return { data: page };
  }

  const bookingMatch = /^\/bookings\/([^/]+)(\/cancel)?$/.exec(sub);
  if (bookingMatch) {
    const reference = decodeURIComponent(bookingMatch[1] as string);
    if (method === 'GET' && !bookingMatch[2]) {
      requirePermission(Permission.BOOKING_READ_ANY);
      return { data: detail(findBooking(reference)) };
    }
    if (method === 'POST' && bookingMatch[2]) {
      requirePermission(Permission.BOOKING_MANAGE);
      const input = parse(adminCancelBookingSchema, body, 'body');
      const b = findBooking(reference);
      if (!CANCELLABLE.has(b.row.status)) {
        throw new StaticError(409, 'INVALID_STATE', `A ${b.row.status.toLowerCase().replace(/_/g, ' ')} booking cannot be cancelled`);
      }
      const a = adminDb();
      const at = now();
      const paid = isPaidBooking(b.row);
      a.bookingOverrides[b.row.reference] = { status: 'CANCELLED', cancelledAt: at, reason: input.reason };
      if (input.refund && paid) {
        const already = b.refunds.reduce((s, r) => s + (r.status === 'FAILED' ? 0 : r.amountPaise), 0);
        const amount = Math.max(0, b.row.totalPaise - already);
        if (amount > 0) {
          a.refunds.push({
            id: newId('rfd'),
            bookingReference: b.row.reference,
            serviceType: b.row.serviceType,
            customerName: b.row.customerName,
            amountPaise: amount,
            status: 'REQUESTED',
            reason: `Cancelled by ZPROO GO: ${input.reason}`,
            createdAt: at,
            completedAt: null,
          });
        }
      }
      // Customers see the cancellation in My bookings (flights, buses and trains).
      const engine = db().bookings.find((x) => x.details.reference === b.row.reference);
      if (engine) {
        engine.details.status = 'CANCELLED';
        engine.details.cancelledAt = at;
        save();
      }
      saveAdminDb();
      audit({ actorName: actorName(me), action: 'booking.cancel', entityType: 'Booking', entityId: b.row.reference, summary: `Cancelled ${b.row.reference}${input.refund && paid ? ' and raised a refund' : ''}: ${input.reason}` });
      return { data: detail(findBooking(reference)), message: 'Booking cancelled' };
    }
  }

  // ── Users ──
  if (method === 'GET' && sub === '/users') {
    requirePermission(Permission.USER_READ_ANY);
    const q = parse(adminUserListQuerySchema, params, 'query');
    const rows = allUsers()
      .filter(
        (u) =>
          (!q.role || u.roles.includes(q.role)) &&
          (!q.status || u.status === q.status) &&
          matchesSearch(q.search, u.fullName, u.phone, u.email),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toRow);
    return { data: paginate(rows, q.page, q.limit) };
  }

  const userMatch = /^\/users\/([^/]+)(\/status|\/roles)?$/.exec(sub);
  if (userMatch) {
    const id = decodeURIComponent(userMatch[1] as string);
    const action = userMatch[2];
    if (method === 'GET' && !action) {
      requirePermission(Permission.USER_READ_ANY);
      const user = findUser(id);
      const own = bookings().filter((b) => b.row.userId === id).map((b) => b.row);
      const data: AdminUserDetail = {
        ...toRow(user),
        stats: {
          bookings: own.length,
          spentPaise: own.filter(isPaidBooking).reduce((s, b) => s + b.totalPaise, 0),
          cancelled: own.filter((b) => ['CANCELLED', 'REFUNDED', 'REFUND_PENDING'].includes(b.status)).length,
        },
        recentBookings: own.slice(0, 10),
      };
      return { data };
    }
    if (method === 'PATCH' && action === '/status') {
      requirePermission(Permission.USER_MANAGE);
      const input = parse(adminUserStatusSchema, body, 'body');
      const user = findUser(id);
      if (user.id === me.id) throw new StaticError(409, 'INVALID_STATE', 'You cannot change your own status');
      if (user.roles.includes('SUPER_ADMIN') && !rolesOf(me).includes('SUPER_ADMIN')) {
        throw new StaticError(403, 'FORBIDDEN', 'Only a super admin can change another super admin');
      }
      updateUser(user, { status: input.status });
      audit({ actorName: actorName(me), action: 'user.status', entityType: 'User', entityId: id, summary: `Set ${user.fullName} to ${input.status}${input.reason ? `: ${input.reason}` : ''}` });
      return { data: toRow(findUser(id)), message: 'Status updated' };
    }
    if (method === 'PUT' && action === '/roles') {
      requirePermission(Permission.ROLE_MANAGE);
      const { roles } = parse(adminUserRolesSchema, body, 'body');
      const user = findUser(id);
      if (user.id === me.id && !roles.includes('SUPER_ADMIN') && rolesOf(me).includes('SUPER_ADMIN')) {
        throw new StaticError(409, 'INVALID_STATE', 'You cannot remove your own super admin role');
      }
      const unique = [...new Set(roles)] as RoleName[];
      updateUser(user, { roles: unique });
      audit({ actorName: actorName(me), action: 'user.roles', entityType: 'User', entityId: id, summary: `Roles of ${user.fullName}: ${unique.join(', ')}` });
      return { data: toRow(findUser(id)), message: 'Roles updated' };
    }
  }

  // ── Payments & refunds ──
  if (method === 'GET' && sub === '/payments') {
    requirePermission(Permission.PAYMENT_READ_ANY);
    const q = parse(adminPaymentListQuerySchema, params, 'query');
    const all = bookings().flatMap((b) => b.payments);
    const ranged = inDayRange(all, q.from, q.to);
    const rows = ranged.filter(
      (p) =>
        (!q.status || p.status === q.status) &&
        (!q.service || p.serviceType === q.service) &&
        matchesSearch(q.search, p.id, p.bookingReference, p.customerName, p.method),
    );
    const settled = ranged.filter((p) => p.status !== 'CREATED' && p.status !== 'PENDING');
    const ok = settled.filter((p) => ['SUCCESS', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(p.status));
    const refunds = inDayRange(bookings().flatMap((b) => b.refunds), q.from, q.to);
    const page: AdminPaymentsPage = {
      ...paginate(sortRows(rows, q.sort, (p: AdminPaymentRow) => p.amountPaise), q.page, q.limit),
      summary: {
        capturedPaise: ok.reduce((s, p) => s + p.amountPaise, 0),
        failedCount: ranged.filter((p) => p.status === 'FAILED').length,
        refundedPaise: refunds.filter((r) => r.status === 'COMPLETED').reduce((s, r) => s + r.amountPaise, 0),
        successRatePct: settled.length ? Math.round((ok.length / settled.length) * 1000) / 10 : 0,
      },
    };
    return { data: page };
  }

  if (method === 'GET' && sub === '/refunds') {
    requirePermission(Permission.PAYMENT_READ_ANY);
    const q = parse(adminRefundListQuerySchema, params, 'query');
    const all = inDayRange(bookings().flatMap((b) => b.refunds), q.from, q.to);
    const rows = all.filter(
      (r) => (!q.status || r.status === q.status) && matchesSearch(q.search, r.id, r.bookingReference, r.customerName, r.reason),
    );
    const pending = all.filter(isOpenRefund);
    const page: AdminRefundsPage = {
      ...paginate(sortRows(rows, q.sort, (r: AdminRefundRow) => r.amountPaise), q.page, q.limit),
      summary: {
        pendingCount: pending.length,
        pendingPaise: pending.reduce((s, r) => s + r.amountPaise, 0),
        completedPaise: all.filter((r) => r.status === 'COMPLETED').reduce((s, r) => s + r.amountPaise, 0),
        failedCount: all.filter((r) => r.status === 'FAILED').length,
      },
    };
    return { data: page };
  }

  const refundMatch = /^\/refunds\/([^/]+)$/.exec(sub);
  if (refundMatch && method === 'PATCH') {
    requirePermission(Permission.REFUND_APPROVE);
    const input = parse(adminRefundUpdateSchema, body, 'body');
    const id = decodeURIComponent(refundMatch[1] as string);
    const refund = bookings().flatMap((b) => b.refunds).find((r) => r.id === id);
    if (!refund) throw notFound('Refund not found');
    const allowed: Record<string, string[]> = {
      REQUESTED: ['PROCESSING', 'COMPLETED', 'FAILED'],
      PROCESSING: ['COMPLETED', 'FAILED'],
      FAILED: ['PROCESSING'],
      COMPLETED: [],
    };
    if (!allowed[refund.status]?.includes(input.status)) {
      throw new StaticError(409, 'INVALID_STATE', `A ${refund.status.toLowerCase()} refund cannot move to ${input.status.toLowerCase()}`);
    }
    adminDb().refundStatus[id] = { status: input.status, completedAt: input.status === 'COMPLETED' ? now() : null };
    saveAdminDb();
    audit({ actorName: actorName(me), action: `refund.${input.status.toLowerCase()}`, entityType: 'Refund', entityId: id, summary: `Refund ${id} for ${refund.bookingReference} → ${input.status}${input.note ? `: ${input.note}` : ''}` });
    const updated = bookings().flatMap((b) => b.refunds).find((r) => r.id === id);
    return { data: updated, message: 'Refund updated' };
  }

  // ── Inventory ──
  const invMatch = /^\/inventory\/([A-Za-z]+)(?:\/([^/]+))?$/.exec(sub);
  if (invMatch) {
    requirePermission(Permission.INVENTORY_MANAGE);
    const service = parse(serviceTypeSchema, (invMatch[1] as string).toUpperCase(), 'path');
    const cat = catalogue(service);
    const hidden = unlistedIds(service);
    if (method === 'GET' && !invMatch[2]) {
      const q = parse(inventoryQuerySchema, params, 'query');
      const items = cat.items
        .map((i) => ({ ...i, listed: !hidden.has(i.id) }))
        .filter((i) => (!q.listed || String(i.listed) === q.listed) && matchesSearch(q.search, i.name, i.subtitle, ...Object.values(i.facts)));
      const sold = bookings().filter((b) => b.row.serviceType === service && !['PENDING_PAYMENT', 'INITIATED'].includes(b.row.status));
      const data: AdminInventoryPage = {
        service,
        ...paginate(items, q.page, q.limit),
        columns: cat.columns,
        stats: {
          listed: cat.items.length - cat.items.filter((i) => hidden.has(i.id)).length,
          unlisted: cat.items.filter((i) => hidden.has(i.id)).length,
          bookings: sold.length,
          revenuePaise: sold.filter((b) => isPaidBooking(b.row)).reduce((s, b) => s + b.row.totalPaise, 0),
        },
      };
      return { data };
    }
    if (method === 'PATCH' && invMatch[2]) {
      const id = decodeURIComponent(invMatch[2]);
      const item = cat.items.find((i) => i.id === id);
      if (!item) throw notFound('Item not found');
      const { listed } = parse(inventoryToggleSchema, body, 'body');
      const a = adminDb();
      const set = new Set(a.unlisted[service] ?? []);
      if (listed) set.delete(id);
      else set.add(id);
      a.unlisted[service] = [...set];
      saveAdminDb();
      audit({ actorName: actorName(me), action: listed ? 'inventory.list' : 'inventory.unlist', entityType: service, entityId: id, summary: `${listed ? 'Listed' : 'Hid'} ${item.name}` });
      return { data: { ...item, listed }, message: listed ? 'Listed on the website' : 'Hidden from the website' };
    }
  }

  // ── Wallet ──
  if (sub === '/wallet') {
    requirePermission(Permission.WALLET_MANAGE);
    if (method === 'GET') return { data: walletSummary() };
  }
  if (method === 'POST' && sub === '/wallet/adjust') {
    requirePermission(Permission.WALLET_MANAGE);
    const input = parse(adminWalletAdjustSchema, body, 'body');
    const wallet = useWallet.getState();
    if (input.type === 'credit') wallet.credit(input.amountPaise, input.label);
    else if (!wallet.debit(input.amountPaise, input.label)) {
      throw new StaticError(409, 'INVALID_STATE', 'The wallet balance is lower than this debit');
    }
    audit({ actorName: actorName(me), action: `wallet.${input.type}`, entityType: 'Wallet', entityId: null, summary: `${input.type === 'credit' ? 'Credited' : 'Debited'} ₹${(input.amountPaise / 100).toLocaleString('en-IN')}: ${input.label}` });
    return { data: walletSummary(), message: 'Wallet updated' };
  }

  // ── Support ticket actions ──
  const ticketMatch = /^\/tickets\/([^/]+)\/(messages|update)$/.exec(sub);
  if (ticketMatch && (method === 'POST' || method === 'PATCH')) {
    requirePermission(Permission.SUPPORT_TICKET_MANAGE);
    const id = decodeURIComponent(ticketMatch[1] as string);
    const ticket = collection('tickets').find((t) => t.id === id);
    if (!ticket) throw notFound('Ticket not found');
    if (ticketMatch[2] === 'messages') {
      const input = parse(ticketReplySchema, body, 'body');
      ticket.messages.push({ id: newId('msg'), author: 'AGENT', name: me.fullName, body: input.body, internal: input.internal, at: now() });
      if (!input.internal && ticket.status === 'OPEN') ticket.status = 'IN_PROGRESS';
      ticket.assignee ??= me.fullName;
    } else {
      const input = parse(ticketUpdateSchema, body, 'body');
      if (input.status && input.status !== ticket.status) {
        ticket.messages.push({ id: newId('msg'), author: 'SYSTEM', name: me.fullName, body: `Status changed to ${input.status.replace(/_/g, ' ').toLowerCase()}`, internal: true, at: now() });
      }
      Object.assign(ticket, Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)));
    }
    ticket.updatedAt = now();
    saveAdminDb();
    audit({ actorName: actorName(me), action: `ticket.${ticketMatch[2] === 'messages' ? 'reply' : 'update'}`, entityType: 'Ticket', entityId: ticket.number, summary: `${ticketMatch[2] === 'messages' ? 'Replied to' : 'Updated'} ${ticket.number}` });
    return { data: ticket };
  }

  // ── Collections (coupons, offers, tickets, notifications, partners, drivers) ──
  const colMatch = /^\/(coupons|offers|tickets|notifications|partners|drivers)(?:\/([^/]+))?$/.exec(sub);
  if (colMatch) {
    const name = parse(adminCollectionNameSchema, colMatch[1], 'path');
    requirePermission(COLLECTION_PERMISSION[name]);
    const items = collection(name) as AdminCollections[typeof name][];
    const id = colMatch[2] ? decodeURIComponent(colMatch[2]) : null;
    const schema = adminCollectionSchemas[name];
    if (method === 'GET' && !id) {
      if (name === 'notifications') dispatchDueNotifications();
      return { data: [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
    }
    if (method === 'POST' && !id) {
      const input = parse(schema, body, 'body') as Record<string, unknown>;
      const doc = materialise(name, input, undefined);
      items.unshift(doc);
      saveAdminDb();
      audit({ actorName: actorName(me), action: `${name}.create`, entityType: SINGULAR[name], entityId: doc.id, summary: `Created ${SINGULAR[name].toLowerCase()} ${ADMIN_DOC_LABEL(doc)}` });
      return { status: 201, data: doc, message: `${SINGULAR[name]} created` };
    }
    if (id) {
      const index = items.findIndex((x) => x.id === id);
      if (index < 0) throw notFound(`${SINGULAR[name]} not found`);
      const existing = items[index] as AdminCollections[typeof name];
      if (method === 'GET') return { data: existing };
      if (method === 'PATCH') {
        // Updates are merged over the stored document and validated as a whole.
        const merged = { ...adminDocForm(name, existing), ...(body as object) };
        const input = parse(schema, merged, 'body') as Record<string, unknown>;
        const doc = materialise(name, input, existing);
        items[index] = doc;
        saveAdminDb();
        audit({ actorName: actorName(me), action: `${name}.update`, entityType: SINGULAR[name], entityId: id, summary: `Updated ${SINGULAR[name].toLowerCase()} ${ADMIN_DOC_LABEL(doc)}` });
        return { data: doc, message: `${SINGULAR[name]} saved` };
      }
      if (method === 'DELETE') {
        items.splice(index, 1);
        saveAdminDb();
        audit({ actorName: actorName(me), action: `${name}.delete`, entityType: SINGULAR[name], entityId: id, summary: `Deleted ${SINGULAR[name].toLowerCase()} ${ADMIN_DOC_LABEL(existing)}` });
        return { data: { id }, message: `${SINGULAR[name]} deleted` };
      }
    }
  }

  // ── Reports ──
  if (method === 'GET' && sub === '/reports') {
    requirePermission(Permission.REPORT_READ);
    const q = parse(reportQuerySchema, params, 'query');
    const all = bookings();
    return {
      data: buildReport(q.type, q.from, q.to, {
        bookings: all.map((b) => b.row),
        payments: all.flatMap((b) => b.payments),
        refunds: all.flatMap((b) => b.refunds),
        users: allUsers().map(toRow),
      }),
    };
  }

  // ── Audit log ──
  if (method === 'GET' && sub === '/audit') {
    requirePermission(Permission.AUDIT_READ);
    const q = parse(adminAuditQuerySchema, params, 'query');
    const rows = adminDb().audit.filter(
      (e) => (!q.entityType || e.entityType === q.entityType) && matchesSearch(q.search, e.actorName, e.action, e.summary, e.entityId),
    );
    return { data: paginate(rows, q.page, q.limit) satisfies AdminAuditPage };
  }

  // ── Settings ──
  if (sub === '/settings') {
    if (method === 'GET') return { data: settings() };
    if (method === 'PATCH') {
      requirePermission(Permission.SETTINGS_MANAGE);
      const input = parse(settingsUpdateSchema, body, 'body');
      const a = adminDb();
      const changed = Object.keys(input).filter((k) => JSON.stringify(input[k as keyof typeof input]) !== JSON.stringify(a.settings[k as keyof PlatformSettings]));
      a.settings = { ...a.settings, ...input } as PlatformSettings;
      saveAdminDb();
      if (changed.length) audit({ actorName: actorName(me), action: 'settings.update', entityType: 'Settings', entityId: null, summary: `Changed ${changed.join(', ')}` });
      return { data: a.settings, message: 'Settings saved' };
    }
  }

  if (method === 'POST' && sub === '/demo/regenerate') {
    requirePermission(Permission.SETTINGS_MANAGE);
    const a = adminDb();
    a.demoSeed = Math.floor(Math.random() * 1_000_000);
    a.bookingOverrides = {};
    a.refundStatus = {};
    a.userOverrides = {};
    a.refunds = [];
    saveAdminDb();
    audit({ actorName: actorName(me), action: 'demo.regenerate', entityType: 'Settings', entityId: null, summary: 'Generated new sample data' });
    return { data: { ok: true }, message: 'New sample data generated' };
  }
  if (method === 'POST' && sub === '/demo/reset') {
    requirePermission(Permission.SETTINGS_MANAGE);
    resetAdminDb();
    audit({ actorName: actorName(me), action: 'demo.reset', entityType: 'Settings', entityId: null, summary: 'Reset the admin panel to its defaults' });
    return { data: { ok: true, settings: DEFAULT_SETTINGS }, message: 'Admin data reset' };
  }

  throw notFound(`Route ${method} /api${path} not found`);
}

// ───────── helpers ─────────

function updateUser(user: UnifiedUser, change: { status?: AdminUserRow['status']; roles?: RoleName[] }): void {
  if (user.source === 'live') {
    const stored = db().users.find((u) => u.id === user.id);
    if (!stored) throw notFound('User not found');
    if (change.status) stored.status = change.status;
    if (change.roles) stored.roles = change.roles;
    if (change.status && change.status !== 'ACTIVE' && db().sessionUserId === stored.id) db().sessionUserId = null;
    save();
  } else {
    const a = adminDb();
    a.userOverrides[user.id] = { ...a.userOverrides[user.id], ...change };
    saveAdminDb();
  }
}

function walletSummary(): AdminWalletSummary {
  const state = useWallet.getState();
  const me = (() => {
    try {
      const signedIn = db().users.find((u) => u.id === db().sessionUserId);
      return signedIn ? publicUser(signedIn).fullName : 'This browser';
    } catch {
      return 'This browser';
    }
  })();
  const live = state.transactions.map((t) => ({ ...t, userName: me, source: 'live' as const }));
  const demo = includeDemo()
    ? allBookings({ includeDemo: true })
        .filter((b) => b.row.source === 'demo')
        .flatMap((b) => {
          const out: AdminWalletSummary['transactions'] = [];
          const pay = b.payments.find((p) => p.method === 'Wallet' && p.status === 'SUCCESS');
          if (pay) out.push({ id: `wtx_${pay.id}`, userName: b.row.customerName, type: 'debit', amountPaise: pay.amountPaise, label: `Paid for ${b.row.reference}`, createdAt: pay.createdAt, source: 'demo' });
          if (b.couponCode && isPaidBooking(b.row)) out.push({ id: `wtx_cb_${b.row.reference}`, userName: b.row.customerName, type: 'credit', amountPaise: Math.min(10_000, Math.round(b.row.totalPaise * 0.02)), label: `Cashback on ${b.row.reference}`, createdAt: b.row.createdAt, source: 'demo' });
          return out;
        })
    : [];
  const transactions = [...live, ...demo].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 300);
  const credited = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amountPaise, 0);
  const debited = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amountPaise, 0);
  return { balancePaise: state.balance, creditedPaise: credited, debitedPaise: debited, transactions };
}

