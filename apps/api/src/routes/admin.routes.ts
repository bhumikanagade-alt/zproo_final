import { Permission, type AdminCollectionName } from '@zproo/types';
import {
  adminAuditQuerySchema,
  adminBookingListQuerySchema,
  adminCancelBookingSchema,
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
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { createAdminController } from '../controllers/admin.controller';
import { authorize, authorizeAny } from '../middleware/auth';
import { adminWriteRateLimiter, type RateLimitStoreFactory } from '../middleware/rateLimit';
import { validate, validated } from '../middleware/validate';
import type { RbacService } from '../services/rbac.service';
import { AuthorizationError } from '../utils/errors';

const inventoryParams = z.object({ service: z.string().transform((s) => s.toUpperCase()).pipe(serviceTypeSchema) }).passthrough();

const COLLECTION_PERMISSION: Record<AdminCollectionName, (typeof Permission)[keyof typeof Permission]> = {
  coupons: Permission.OFFER_MANAGE,
  offers: Permission.OFFER_MANAGE,
  notifications: Permission.OFFER_MANAGE,
  tickets: Permission.SUPPORT_TICKET_MANAGE,
  partners: Permission.PARTNER_MANAGE,
  drivers: Permission.DRIVER_MANAGE,
};

/**
 * `/api/admin/*`. Every route requires a signed-in user who is still an active staff member
 * (checked against the database on every request, not just the token) with `admin:access`, plus
 * its own permission. Changes are throttled per user.
 */
export function adminRoutes(
  c: ReturnType<typeof createAdminController>,
  authenticate: RequestHandler,
  rbac: RbacService,
  liveStaff: RequestHandler,
  rateLimitStore: RateLimitStoreFactory = () => undefined,
): Router {
  const router = Router();
  const can = (p: (typeof Permission)[keyof typeof Permission]) => authorize(rbac, p);
  router.use(authenticate, liveStaff, can(Permission.ADMIN_ACCESS), adminWriteRateLimiter(rateLimitStore));

  // Revenue and payment figures need report access; other staff (e.g. support) get a dashboard without them.
  const revenueAccess: RequestHandler = async (req, res, next) => {
    res.locals.canSeeRevenue = !!req.auth && (await rbac.hasAll(req.auth.roles, [Permission.REPORT_READ]));
    next();
  };
  // Cancelling with a refund raises a refund, so it needs the refund permission too.
  const refundGuard: RequestHandler = async (req, _res, next) => {
    const body = validated<{ refund?: boolean }>(req, 'body');
    if (body.refund && !(req.auth && (await rbac.hasAll(req.auth.roles, [Permission.REFUND_APPROVE])))) {
      throw new AuthorizationError('You need refund approval permission to cancel a booking with a refund');
    }
    next();
  };

  router.get('/meta', c.meta);
  router.get('/dashboard', can(Permission.BOOKING_READ_ANY), revenueAccess, validate({ query: dashboardQuerySchema }), c.dashboard);
  router.get('/reports', can(Permission.REPORT_READ), validate({ query: reportQuerySchema }), c.report);

  router.get('/bookings', can(Permission.BOOKING_READ_ANY), validate({ query: adminBookingListQuerySchema }), c.bookings);
  router.get('/bookings/:reference', can(Permission.BOOKING_READ_ANY), c.booking);
  router.post('/bookings/:reference/cancel', can(Permission.BOOKING_MANAGE), validate({ body: adminCancelBookingSchema }), refundGuard, c.cancelBooking);

  router.get('/payments', can(Permission.PAYMENT_READ_ANY), validate({ query: adminPaymentListQuerySchema }), c.payments);
  router.get('/refunds', can(Permission.PAYMENT_READ_ANY), validate({ query: adminRefundListQuerySchema }), c.refunds);
  router.patch('/refunds/:id', can(Permission.REFUND_APPROVE), validate({ body: adminRefundUpdateSchema }), c.updateRefund);

  router.get('/users', can(Permission.USER_READ_ANY), validate({ query: adminUserListQuerySchema }), c.users);
  router.get('/users/:id', can(Permission.USER_READ_ANY), c.user);
  router.patch('/users/:id/status', can(Permission.USER_MANAGE), validate({ body: adminUserStatusSchema }), c.userStatus);
  router.put('/users/:id/roles', can(Permission.ROLE_MANAGE), validate({ body: adminUserRolesSchema }), c.userRoles);

  router.get('/inventory/:service', can(Permission.INVENTORY_MANAGE), validate({ params: inventoryParams, query: inventoryQuerySchema }), c.inventory);
  router.patch('/inventory/:service/:id', can(Permission.INVENTORY_MANAGE), validate({ params: inventoryParams, body: inventoryToggleSchema }), c.setListed);

  router.get('/wallet', can(Permission.WALLET_MANAGE), c.wallet);
  router.post('/wallet/adjust', can(Permission.WALLET_MANAGE), validate({ body: adminWalletAdjustSchema }), c.adjustWallet);

  router.post('/tickets/:id/messages', can(Permission.SUPPORT_TICKET_MANAGE), validate({ body: ticketReplySchema }), c.replyToTicket);
  router.patch('/tickets/:id/update', can(Permission.SUPPORT_TICKET_MANAGE), validate({ body: ticketUpdateSchema }), c.updateTicket);
  for (const [name, permission] of Object.entries(COLLECTION_PERMISSION) as [AdminCollectionName, (typeof Permission)[keyof typeof Permission]][]) {
    // Bodies are validated by the service (updates are merged over the stored document first).
    router.get(`/${name}`, can(permission), c.list(name));
    router.post(`/${name}`, can(permission), c.create(name));
    router.patch(`/${name}/:id`, can(permission), c.update(name));
    router.delete(`/${name}/:id`, can(permission), c.remove(name));
  }

  router.get('/audit', can(Permission.AUDIT_READ), validate({ query: adminAuditQuerySchema }), c.audit);
  // Settings hold fee and policy values: only people who manage settings or read finance reports.
  router.get('/settings', authorizeAny(rbac, Permission.SETTINGS_MANAGE, Permission.REPORT_READ), c.settings);
  router.patch('/settings', can(Permission.SETTINGS_MANAGE), validate({ body: settingsUpdateSchema }), c.updateSettings);
  return router;
}
