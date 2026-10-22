import type { BookingStatus, PaymentStatus, RoleName, ServiceType, UserStatus } from './enums';
import type { RefundStatus } from './trains';

/*
 * Admin panel contract. The web app's admin pages call these endpoints (under /api/admin);
 * they are implemented twice with identical shapes: by the API (PostgreSQL via Prisma) and by
 * the in-browser static engine used for demos (apps/web/src/static/admin).
 */

/** Where a record comes from: real bookings, or generated sample data in demo mode. */
export type RecordSource = 'live' | 'demo';

export interface AdminBookingRow {
  reference: string;
  serviceType: ServiceType;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  title: string;
  subtitle: string;
  customerName: string;
  customerContact: string;
  userId: string | null;
  travelDate: string;
  totalPaise: number;
  createdAt: string;
  source: RecordSource;
}

export interface AdminTimelineEntry {
  at: string;
  label: string;
}

export interface AdminBookingDetail extends AdminBookingRow {
  passengers: { name: string; detail: string }[];
  payments: AdminPaymentRow[];
  refunds: AdminRefundRow[];
  timeline: AdminTimelineEntry[];
  notes: string[];
  /** Fare breakdown lines (label → paise). */
  priceLines: { label: string; paise: number }[];
}

export interface AdminPaymentRow {
  id: string;
  bookingReference: string;
  serviceType: ServiceType;
  customerName: string;
  amountPaise: number;
  status: PaymentStatus;
  method: string;
  provider: string;
  createdAt: string;
  source: RecordSource;
}

export interface AdminRefundRow {
  id: string;
  bookingReference: string;
  serviceType: ServiceType;
  customerName: string;
  amountPaise: number;
  status: RefundStatus;
  reason: string;
  createdAt: string;
  completedAt: string | null;
  /** Bank or gateway reference recorded when a refund was settled by hand. */
  settlementReference?: string | null;
  source: RecordSource;
}

export interface AdminUserDetail {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: UserStatus;
  roles: RoleName[];
  createdAt: string;
  lastLoginAt: string | null;
  stats: { bookings: number; spentPaise: number; cancelled: number };
  recentBookings: AdminBookingRow[];
}

export interface DashboardKpis {
  revenuePaise: number;
  revenueChangePct: number | null;
  bookings: number;
  bookingsChangePct: number | null;
  avgOrderPaise: number;
  newUsers: number;
  totalUsers: number;
  cancellationRatePct: number;
  pendingRefunds: number;
  pendingRefundsPaise: number;
  openTickets: number;
}

export interface AdminDashboard {
  generatedAt: string;
  days: number;
  kpis: DashboardKpis;
  /** One point per day, oldest first. */
  series: { date: string; revenuePaise: number; bookings: number; cancelled: number }[];
  byService: { service: ServiceType; bookings: number; revenuePaise: number }[];
  byStatus: { status: BookingStatus; count: number }[];
  topRoutes: { label: string; service: ServiceType; bookings: number; revenuePaise: number }[];
  paymentMethods: { method: string; count: number; amountPaise: number }[];
  recentBookings: AdminBookingRow[];
  /** True when sample data is mixed into these numbers (demo mode). */
  includesDemoData: boolean;
  /** True when this staff member may not see revenue and payment figures (they are zeroed). */
  revenueHidden?: boolean;
}

// ───────── Collections managed from the panel ─────────

export type DiscountType = 'PERCENT' | 'FLAT';

/** What a customer sees of a live coupon (no usage counts or internal fields). */
export interface PublicCoupon {
  code: string;
  description: string;
  discountType: DiscountType;
  value: number;
  maxDiscountPaise: number | null;
  minOrderPaise: number;
  services: ServiceType[];
  validTo: string;
}

/** Result of checking a coupon against an order at checkout. */
export interface CouponCheck {
  code: string;
  description: string;
  discountPaise: number;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: DiscountType;
  /** Percent (1–100) or flat amount in paise. */
  value: number;
  maxDiscountPaise: number | null;
  minOrderPaise: number;
  /** Empty = every service. */
  services: ServiceType[];
  validFrom: string;
  validTo: string;
  usageLimit: number | null;
  perUserLimit: number;
  usedCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOffer {
  id: string;
  title: string;
  subtitle: string;
  service: ServiceType | 'ALL';
  couponCode: string | null;
  ctaLabel: string;
  ctaPath: string;
  /** Optional start; offers with no start are live immediately. */
  validFrom?: string | null;
  validTo: string;
  featured: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'BOOKING' | 'PAYMENT' | 'REFUND' | 'ACCOUNT' | 'FEEDBACK' | 'OTHER';

export interface TicketMessage {
  id: string;
  author: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  name: string;
  body: string;
  internal: boolean;
  at: string;
}

export interface SupportTicket {
  id: string;
  number: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  bookingReference: string | null;
  assignee: string | null;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
export type NotificationAudience = 'ALL_USERS' | 'RECENT_CUSTOMERS' | 'INACTIVE_USERS' | 'STAFF';

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  audience: NotificationAudience;
  channels: NotificationChannel[];
  linkPath: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT';
  scheduledFor: string | null;
  sentAt: string | null;
  recipients: number;
  createdAt: string;
  updatedAt: string;
}

/** A campaign as a customer sees it in the notification bell (GET /api/notifications). */
export interface UserNotification {
  id: string;
  title: string;
  body: string;
  linkPath: string | null;
  /** When it was delivered (the send time, or the scheduled time once it came due). */
  sentAt: string;
}

export type PartnerType = 'AIRLINE' | 'BUS_OPERATOR' | 'HOTEL' | 'CAB_FLEET' | 'BIKE_RENTAL' | 'COURIER' | 'TOUR_OPERATOR';
export type PartnerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  gstin: string | null;
  commissionPct: number;
  status: PartnerStatus;
  listings: number;
  createdAt: string;
  updatedAt: string;
}

export type DriverStatus = 'PENDING_KYC' | 'ACTIVE' | 'SUSPENDED';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  city: string;
  vehicleType: 'BIKE' | 'AUTO' | 'MINI' | 'SEDAN' | 'SUV';
  vehicleNumber: string;
  licenceNumber: string;
  status: DriverStatus;
  online: boolean;
  rating: number;
  trips: number;
  createdAt: string;
  updatedAt: string;
}

/** Collections stored as documents (static engine) or AdminRecord rows (API). */
export interface AdminCollections {
  coupons: Coupon;
  offers: AdminOffer;
  tickets: SupportTicket;
  notifications: AdminNotification;
  partners: Partner;
  drivers: Driver;
}
export type AdminCollectionName = keyof AdminCollections;

// ───────── Inventory (catalogue) ─────────

export interface AdminInventoryItem {
  id: string;
  name: string;
  subtitle: string;
  /** Short facts shown as columns, e.g. { Route: 'PNQ → DEL', Seats: '180' }. */
  facts: Record<string, string>;
  priceFromPaise: number | null;
  rating: number | null;
  listed: boolean;
}

export interface AdminInventoryPage {
  service: ServiceType;
  items: AdminInventoryItem[];
  page: number;
  limit: number;
  total: number;
  /** Column names, in order, for `facts`. */
  columns: string[];
  stats: { listed: number; unlisted: number; bookings: number; revenuePaise: number };
}

// ───────── Wallet ─────────

export interface AdminWalletTransaction {
  id: string;
  userName: string;
  type: 'credit' | 'debit';
  amountPaise: number;
  label: string;
  createdAt: string;
  source: RecordSource;
}

export interface AdminWalletSummary {
  balancePaise: number;
  creditedPaise: number;
  debitedPaise: number;
  transactions: AdminWalletTransaction[];
}

// ───────── Audit & settings ─────────

export interface AdminAuditEntry {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
}

export interface PlatformSettings {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  announcement: { enabled: boolean; text: string; tone: 'info' | 'success' | 'warning'; linkPath: string | null };
  maintenanceMode: boolean;
  /** Services temporarily switched off on the public website. */
  disabledServices: ServiceType[];
  convenienceFeePaise: number;
  gstPercent: number;
  bookingHoldMinutes: number;
  freeCancellationHours: number;
  walletEnabled: boolean;
  referralBonusPaise: number;
  /** Demo mode only: mix generated sample data into admin reports. */
  showDemoData: boolean;
}

/** The subset of settings the public website reads (no auth). */
export type PublicSettings = Pick<
  PlatformSettings,
  'siteName' | 'supportEmail' | 'supportPhone' | 'announcement' | 'maintenanceMode' | 'disabledServices' | 'walletEnabled'
>;

export type ReportType = 'bookings' | 'revenue' | 'payments' | 'refunds' | 'users' | 'services';

export interface AdminReport {
  type: ReportType;
  from: string;
  to: string;
  columns: string[];
  rows: (string | number)[][];
  totals: Record<string, number>;
}

// ───────── List responses ─────────

export interface AdminBookingsPage {
  items: AdminBookingRow[];
  page: number;
  limit: number;
  total: number;
  summary: { totalPaise: number; byStatus: Partial<Record<BookingStatus, number>> };
}

export interface AdminPaymentsPage {
  items: AdminPaymentRow[];
  page: number;
  limit: number;
  total: number;
  summary: { capturedPaise: number; failedCount: number; refundedPaise: number; successRatePct: number };
}

export interface AdminRefundsPage {
  items: AdminRefundRow[];
  page: number;
  limit: number;
  total: number;
  summary: { pendingCount: number; pendingPaise: number; completedPaise: number; failedCount: number };
}

export interface AdminAuditPage {
  items: AdminAuditEntry[];
  page: number;
  limit: number;
  total: number;
}

/** Who is signed in to the panel, and whether this is the in-browser demo. */
export interface AdminMeta {
  mode: 'static' | 'api';
  demoDataAvailable: boolean;
}

/** Settings a fresh installation starts with. */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  siteName: 'ZPROO GO',
  supportEmail: 'support@zproogo.com',
  supportPhone: '+91 20 4000 9000',
  announcement: { enabled: false, text: '', tone: 'info', linkPath: null },
  maintenanceMode: false,
  disabledServices: [],
  convenienceFeePaise: 0,
  gstPercent: 5,
  bookingHoldMinutes: 15,
  freeCancellationHours: 24,
  walletEnabled: true,
  referralBonusPaise: 10_000,
  showDemoData: true,
};
