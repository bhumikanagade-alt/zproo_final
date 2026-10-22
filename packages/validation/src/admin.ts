import { BookingStatus, PaymentStatus, RoleName, ServiceType, UserStatus } from '@zproo/types';
import { z } from 'zod';
import { paginationQuerySchema } from './common';

/**
 * Admin panel inputs. Shared by the API validators and the in-browser static engine, so the
 * demo rejects exactly what the server would.
 */

const values = <T extends Record<string, string>>(o: T) =>
  Object.values(o) as [T[keyof T], ...T[keyof T][]];

export const serviceTypeSchema = z.enum(values(ServiceType));
const isoDate = z.iso.date();
const optionalText = (max: number) => z.string().trim().max(max).optional();

/**
 * A site-relative link such as /flights?from=PNQ. It must start with a single slash: "//evil.com"
 * is a protocol-relative link to another website and is refused.
 */
export const sitePathSchema = z
  .string()
  .trim()
  .regex(/^\/(?!\/)[\w\-/?=&.]*$/, 'Use a site path such as /flights');

/**
 * One phone rule for every admin form: an Indian mobile (10 digits starting 6-9), a +91 number with
 * 10 digits (mobile or landline with area code) or another international number (+ and 8-15 digits).
 * Spaces, dashes and brackets are ignored.
 */
export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => {
    const compact = value.replace(/[\s\-()]/g, '');
    if (compact.startsWith('+91')) return /^\+91[1-9]\d{9}$/.test(compact);
    if (compact.startsWith('+')) return /^\+[1-9]\d{7,14}$/.test(compact);
    return /^[6-9]\d{9}$/.test(compact);
  }, 'Enter a valid phone number such as +91 98765 43210');

const DAY_MS = 86_400_000;
/**
 * A date as an instant. A date-only value is the Indian calendar day (IST): its first millisecond for a
 * start, its last for an end. Full timestamps are used as they are. Comparing instants (not text)
 * keeps "2026-10-05" and "2026-10-05T00:00:00+05:30" consistent.
 */
const instant = (value: string, edge: 'start' | 'end') => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const start = Date.parse(`${value}T00:00:00+05:30`);
    return edge === 'start' ? start : start + DAY_MS - 1;
  }
  return Date.parse(value);
};

const adminListQueryShape = paginationQuerySchema.extend({
  search: optionalText(100),
  sort: z.enum(['newest', 'oldest', 'amount_desc', 'amount_asc']).default('newest'),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
const fromBeforeTo = (q: { from?: string | undefined; to?: string | undefined }) => !q.from || !q.to || q.from <= q.to;
const fromBeforeToIssue = { message: 'Start date must be before end date', path: ['to'] };
export const adminListQuerySchema = adminListQueryShape.refine(fromBeforeTo, fromBeforeToIssue);
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;

export const adminBookingListQuerySchema = adminListQueryShape
  .extend({
    service: serviceTypeSchema.optional(),
    status: z.enum(values(BookingStatus)).optional(),
    userId: optionalText(64),
  })
  .refine(fromBeforeTo, fromBeforeToIssue);
export type AdminBookingListQuery = z.infer<typeof adminBookingListQuerySchema>;

export const adminPaymentListQuerySchema = adminListQueryShape
  .extend({
    status: z.enum(values(PaymentStatus)).optional(),
    service: serviceTypeSchema.optional(),
  })
  .refine(fromBeforeTo, fromBeforeToIssue);
export type AdminPaymentListQuery = z.infer<typeof adminPaymentListQuerySchema>;

export const refundStatusSchema = z.enum(['REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED']);
export const adminRefundListQuerySchema = adminListQueryShape
  .extend({
    status: refundStatusSchema.optional(),
  })
  .refine(fromBeforeTo, fromBeforeToIssue);
export type AdminRefundListQuery = z.infer<typeof adminRefundListQuerySchema>;

export const dashboardQuerySchema = z.object({
  days: z.coerce.number().int().refine((d) => [7, 30, 90, 365].includes(d), 'Choose 7, 30, 90 or 365 days').default(30),
});

export const adminUserStatusSchema = z.object({
  status: z.enum(values(UserStatus)),
  reason: optionalText(300),
});

export const adminUserRolesSchema = z.object({
  roles: z
    .array(z.enum(values(RoleName)))
    .min(1, 'Keep at least one role')
    .max(9)
    .refine((roles) => roles.some((r) => (r as string) === 'USER'), 'Every account keeps the Customer role; add staff roles on top of it'),
});

export const adminCancelBookingSchema = z.object({
  reason: z.string().trim().min(3, 'Give a reason').max(300, 'Use at most 300 characters'),
  refund: z.boolean().default(true),
});

export const adminRefundUpdateSchema = z
  .object({
    status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED']),
    note: optionalText(300),
    /** Bank or gateway reference; required when a refund is marked completed by hand. */
    settlementReference: z.string().trim().min(4, 'Enter at least 4 characters').max(100, 'Use at most 100 characters').optional(),
  })
  .refine((r) => r.status !== 'COMPLETED' || !!r.settlementReference, {
    message: 'Enter the bank or gateway reference for this manual refund',
    path: ['settlementReference'],
  });

export const adminWalletAdjustSchema = z.object({
  type: z.enum(['credit', 'debit']),
  amountPaise: z.number().int().min(100, 'Minimum ₹1').max(10_000_000, 'Maximum ₹1,00,000'),
  label: z.string().trim().min(3, 'Enter at least 3 characters').max(80, 'Use at most 80 characters'),
  /** API mode: whose wallet (the demo has one wallet per browser). */
  userId: z.string().trim().max(64).optional(),
  /** One id per submit attempt: sending the same id twice (double click, retry) changes the wallet once. */
  requestId: z.string().trim().min(8).max(64).optional(),
});

export const inventoryQuerySchema = paginationQuerySchema.extend({
  search: optionalText(100),
  listed: z.enum(['true', 'false']).optional(),
});

export const inventoryToggleSchema = z.object({ listed: z.boolean() });

/** One report never covers more than this many days (a single large report can slow the server for everyone). */
export const MAX_REPORT_DAYS = 92;

export const reportQuerySchema = z
  .object({
    type: z.enum(['bookings', 'revenue', 'payments', 'refunds', 'users', 'services']),
    from: isoDate,
    to: isoDate,
  })
  .refine((q) => q.from <= q.to, { message: 'Start date must be before end date', path: ['to'] })
  .refine((q) => (Date.parse(q.to) - Date.parse(q.from)) / DAY_MS < MAX_REPORT_DAYS, {
    message: `Choose a range of ${MAX_REPORT_DAYS} days or less`,
    path: ['to'],
  });

// ───────── Collections ─────────

const dateTime = z.iso.datetime({ offset: true }).or(isoDate);
const servicesSchema = z.array(serviceTypeSchema).max(8).default([]);

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,20}$/, 'Use 3–20 letters or digits'),
    description: z.string().trim().min(3, 'Enter at least 3 characters').max(160, 'Use at most 160 characters'),
    discountType: z.enum(['PERCENT', 'FLAT']),
    value: z.number().int().positive(),
    maxDiscountPaise: z.number().int().positive().nullable().default(null),
    minOrderPaise: z.number().int().min(0).default(0),
    services: servicesSchema,
    validFrom: dateTime,
    validTo: dateTime,
    usageLimit: z.number().int().positive().nullable().default(null),
    perUserLimit: z.number().int().min(1).max(100).default(1),
    active: z.boolean().default(true),
  })
  .refine((c) => c.discountType !== 'PERCENT' || c.value <= 100, {
    message: 'A percentage cannot exceed 100',
    path: ['value'],
  })
  .refine((c) => instant(c.validFrom, 'start') <= instant(c.validTo, 'end'), { message: 'End must be after start', path: ['validTo'] });
export type CouponInput = z.input<typeof couponInputSchema>;

/** Checkout asks whether a code works for this order. */
export const couponCheckSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'Enter a coupon code').max(20, 'Use at most 20 characters'),
  service: serviceTypeSchema,
  orderPaise: z.number().int().positive(),
});
export type CouponCheckInput = z.infer<typeof couponCheckSchema>;

/**
 * A booking that is completed in the customer's browser (hotels) tells the server it used a coupon,
 * so the admin panel's "Used" column moves and the usage limits hold. `bookingRef` is the booking's
 * reference; sending the same reference and code twice counts once.
 */
export const couponRedeemSchema = couponCheckSchema.extend({
  bookingRef: z.string().trim().min(3, 'Enter a booking reference').max(64, 'Use at most 64 characters'),
});
export type CouponRedeemInput = z.infer<typeof couponRedeemSchema>;

/**
 * Gives back a coupon use recorded with `couponRedeemSchema` (the payment failed after the coupon was used, or the
 * booking was cancelled). Only the customer who used it can release it; releasing twice is harmless.
 */
export const couponReleaseSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'Enter a coupon code').max(20, 'Use at most 20 characters'),
  bookingRef: z.string().trim().min(3, 'Enter a booking reference').max(64, 'Use at most 64 characters'),
});
export type CouponReleaseInput = z.infer<typeof couponReleaseSchema>;

export const couponListQuerySchema = z.object({ service: serviceTypeSchema.optional() });

export const offerInputSchema = z
  .object({
    title: z.string().trim().min(3, 'Enter at least 3 characters').max(80, 'Use at most 80 characters'),
    subtitle: z.string().trim().max(160, 'Use at most 160 characters').default(''),
    service: z.union([serviceTypeSchema, z.literal('ALL')]),
    couponCode: z.string().trim().toUpperCase().max(20, 'Use at most 20 characters').nullable().default(null),
    ctaLabel: z.string().trim().min(2, 'Enter at least 2 characters').max(30, 'Use at most 30 characters').default('Book now'),
    ctaPath: sitePathSchema.default('/offers'),
    /** Optional start so an offer can be scheduled; empty = live straight away. */
    validFrom: dateTime.nullable().default(null),
    validTo: dateTime,
    featured: z.boolean().default(false),
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(999).default(0),
  })
  .refine((o) => !o.validFrom || instant(o.validFrom, 'start') <= instant(o.validTo, 'end'), {
    message: 'End must be after start',
    path: ['validTo'],
  });
export type OfferInput = z.input<typeof offerInputSchema>;

export const ticketCategorySchema = z.enum(['BOOKING', 'PAYMENT', 'REFUND', 'ACCOUNT', 'FEEDBACK', 'OTHER']);
export const ticketPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const ticketStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED']);

export const ticketInputSchema = z.object({
  subject: z.string().trim().min(4, 'Enter at least 4 characters').max(120, 'Use at most 120 characters'),
  category: ticketCategorySchema.default('OTHER'),
  priority: ticketPrioritySchema.default('MEDIUM'),
  customerName: z.string().trim().min(2, 'Enter at least 2 characters').max(80, 'Use at most 80 characters'),
  customerEmail: z.email('Enter a valid email address').trim().toLowerCase(),
  customerPhone: phoneSchema.nullable().default(null),
  bookingReference: z.string().trim().toUpperCase().max(32, 'Use at most 32 characters').nullable().default(null),
  message: z.string().trim().min(5, 'Enter at least 5 characters').max(4000, 'Use at most 4000 characters'),
});
export type TicketInput = z.input<typeof ticketInputSchema>;

export const ticketUpdateSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assignee: z.string().trim().max(80, 'Use at most 80 characters').nullable().optional(),
});

export const ticketReplySchema = z.object({
  body: z.string().trim().min(1, 'Enter a message').max(4000, 'Use at most 4000 characters'),
  internal: z.boolean().default(false),
});

export const notificationInputSchema = z
  .object({
    title: z.string().trim().min(3, 'Enter at least 3 characters').max(80, 'Use at most 80 characters'),
    body: z.string().trim().min(3, 'Enter at least 3 characters').max(500, 'Use at most 500 characters'),
    audience: z.enum(['ALL_USERS', 'RECENT_CUSTOMERS', 'INACTIVE_USERS', 'STAFF']),
    channels: z.array(z.enum(['IN_APP', 'EMAIL', 'SMS', 'PUSH'])).min(1, 'Pick at least one channel'),
    linkPath: sitePathSchema.nullable().default(null),
    scheduledFor: dateTime.nullable().default(null),
    sendNow: z.boolean().default(true),
  })
  // Either send now or schedule for later, not both (the schedule would be silently ignored).
  .refine((n) => !(n.sendNow && n.scheduledFor), { message: 'Choose either "Send now" or a schedule time', path: ['scheduledFor'] })
  .refine((n) => !n.scheduledFor || n.sendNow || instant(n.scheduledFor, 'start') > Date.now(), {
    message: 'Pick a time in the future',
    path: ['scheduledFor'],
  });
export type NotificationInput = z.input<typeof notificationInputSchema>;

export const partnerInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters').max(100, 'Use at most 100 characters'),
  type: z.enum(['AIRLINE', 'BUS_OPERATOR', 'HOTEL', 'CAB_FLEET', 'BIKE_RENTAL', 'COURIER', 'TOUR_OPERATOR']),
  contactName: z.string().trim().min(2, 'Enter at least 2 characters').max(80, 'Use at most 80 characters'),
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  phone: phoneSchema,
  city: z.string().trim().min(2, 'Enter at least 2 characters').max(60, 'Use at most 60 characters'),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/, 'Enter a valid 15-character GSTIN')
    .nullable()
    .default(null),
  commissionPct: z.number().min(0).max(50),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).default('PENDING'),
  listings: z.number().int().min(0).default(0),
});
export type PartnerInput = z.input<typeof partnerInputSchema>;

export const driverInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters').max(80, 'Use at most 80 characters'),
  phone: phoneSchema,
  city: z.string().trim().min(2, 'Enter at least 2 characters').max(60, 'Use at most 60 characters'),
  vehicleType: z.enum(['BIKE', 'AUTO', 'MINI', 'SEDAN', 'SUV']),
  vehicleNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{4}$/, 'Enter a number such as MH 12 AB 1234'),
  licenceNumber: z.string().trim().toUpperCase().min(8, 'Enter at least 8 characters').max(20, 'Use at most 20 characters'),
  status: z.enum(['PENDING_KYC', 'ACTIVE', 'SUSPENDED']).default('PENDING_KYC'),
  online: z.boolean().default(false),
});
export type DriverInput = z.input<typeof driverInputSchema>;

/** Input schema per admin collection; updates accept any subset of fields. */
export const adminCollectionSchemas = {
  coupons: couponInputSchema,
  offers: offerInputSchema,
  tickets: ticketInputSchema,
  notifications: notificationInputSchema,
  partners: partnerInputSchema,
  drivers: driverInputSchema,
} as const;

export const settingsUpdateSchema = z
  .object({
    siteName: z.string().trim().min(2, 'Enter at least 2 characters').max(60, 'Use at most 60 characters'),
    supportEmail: z.email('Enter a valid email address').trim().toLowerCase(),
    supportPhone: z.string().trim().min(8, 'Enter at least 8 characters').max(20, 'Use at most 20 characters'),
    announcement: z
      .object({
        enabled: z.boolean(),
        text: z.string().trim().max(200, 'Use at most 200 characters'),
        tone: z.enum(['info', 'success', 'warning']),
        linkPath: sitePathSchema.nullable(),
      })
      .refine((a) => !a.enabled || a.text.length > 0, { message: 'Enter the announcement text before switching it on', path: ['text'] }),
    maintenanceMode: z.boolean(),
    disabledServices: z.array(serviceTypeSchema).max(8),
    convenienceFeePaise: z.number().int().min(0).max(100_000),
    gstPercent: z.number().min(0).max(28),
    bookingHoldMinutes: z.number().int().min(5).max(60),
    freeCancellationHours: z.number().int().min(0).max(168),
    walletEnabled: z.boolean(),
    referralBonusPaise: z.number().int().min(0).max(1_000_000),
    showDemoData: z.boolean(),
  })
  .partial();
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;

export const adminUserListQuerySchema = paginationQuerySchema.extend({
  search: optionalText(100),
  role: z.enum(values(RoleName)).optional(),
  status: z.enum(values(UserStatus)).optional(),
});
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const adminAuditQuerySchema = paginationQuerySchema.extend({
  search: optionalText(100),
  entityType: optionalText(40),
});

export const adminCollectionNameSchema = z.enum(['coupons', 'offers', 'tickets', 'notifications', 'partners', 'drivers']);

