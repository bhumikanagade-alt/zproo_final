import type { AdminCollectionName, RoleName, ServiceType } from '@zproo/types';
import type {
  AdminBookingListQuery,
  AdminPaymentListQuery,
  AdminRefundListQuery,
  AdminUserListQuery,
  SettingsUpdate,
} from '@zproo/validation';
import type { Request, RequestHandler } from 'express';
import { requireAuth } from '../middleware/auth';
import { validated } from '../middleware/validate';
import type { Actor, AdminService } from '../services/admin.service';
import { sendSuccess } from '../utils/response';
import { requestContext } from './auth.controller';

const actor = (req: Request): Actor => {
  const auth = requireAuth(req);
  return { userId: auth.userId, roles: auth.roles, ctx: requestContext(req) };
};
// Express has already decoded route values; decoding again could throw (a stray %) or change them.
const param = (req: Request, name: string) => String(req.params[name] ?? '');
const service = (req: Request) => param(req, 'service').toUpperCase() as ServiceType;

export function createAdminController(admin: AdminService) {
  const h = (fn: (req: Request) => Promise<unknown>, message?: string, status?: number): RequestHandler =>
    async (req, res) => {
      sendSuccess(res, await fn(req), message, status);
    };

  return {
    meta: h(async () => ({ mode: 'api', demoDataAvailable: false })),
    dashboard: h((req) =>
      admin.dashboard(validated<{ days: number }>(req, 'query').days, { revenue: req.res?.locals.canSeeRevenue === true }),
    ),
    report: h((req) => {
      const q = validated<{ type: Parameters<AdminService['report']>[0]; from: string; to: string }>(req, 'query');
      return admin.report(q.type, q.from, q.to);
    }),

    bookings: h((req) => admin.listBookings(validated<AdminBookingListQuery>(req, 'query'))),
    booking: h((req) => admin.bookingDetail(param(req, 'reference'))),
    cancelBooking: h((req) => admin.cancelBooking(param(req, 'reference'), validated(req, 'body'), actor(req)), 'Booking cancelled'),

    payments: h((req) => admin.listPayments(validated<AdminPaymentListQuery>(req, 'query'))),
    refunds: h((req) => admin.listRefunds(validated<AdminRefundListQuery>(req, 'query'))),
    updateRefund: h((req) => admin.updateRefund(param(req, 'id'), validated(req, 'body'), actor(req)), 'Refund updated'),

    users: h((req) => admin.users(validated<AdminUserListQuery>(req, 'query'))),
    user: h((req) => admin.userDetail(param(req, 'id'), actor(req))),
    userStatus: h((req) => admin.setUserStatus(param(req, 'id'), validated(req, 'body'), actor(req)), 'Status updated'),
    userRoles: h((req) => admin.setUserRoles(param(req, 'id'), validated<{ roles: RoleName[] }>(req, 'body').roles, actor(req)), 'Roles updated'),

    inventory: h((req) => admin.inventory(service(req), validated(req, 'query'))),
    setListed: h((req) => admin.setListed(service(req), param(req, 'id'), validated<{ listed: boolean }>(req, 'body').listed, actor(req))),

    wallet: h(() => admin.wallet()),
    adjustWallet: h((req) => admin.adjustWallet(validated(req, 'body'), actor(req)), 'Wallet updated'),

    list: (name: AdminCollectionName) => h(() => admin.list(name)),
    create: (name: AdminCollectionName) => h((req) => admin.create(name, req.body, actor(req)), 'Created', 201),
    update: (name: AdminCollectionName) => h((req) => admin.update(name, param(req, 'id'), req.body, actor(req)), 'Saved'),
    remove: (name: AdminCollectionName) => h((req) => admin.remove(name, param(req, 'id'), actor(req)), 'Deleted'),
    replyToTicket: h((req) => admin.replyToTicket(param(req, 'id'), validated(req, 'body'), actor(req))),
    updateTicket: h((req) => admin.updateTicket(param(req, 'id'), validated(req, 'body'), actor(req))),

    audit: h((req) => admin.auditLog(validated(req, 'query'))),
    settings: h(() => admin.settings()),
    updateSettings: h((req) => admin.updateSettings(validated<SettingsUpdate>(req, 'body'), actor(req)), 'Settings saved'),
    publicSettings: h(() => admin.publicSettings()),
    publicOffers: h(() => admin.publicOffers()),
    myNotifications: h((req) => admin.notificationsFor(requireAuth(req).userId)),
  };
}
