import type {
  AdminBookingDetail,
  AdminBookingRow,
  AdminPaymentRow,
  AdminRefundRow,
  BookingStatus,
  PaymentStatus,
  RecordSource,
  ServiceType,
} from '@zproo/types';
import { listItem } from '../bookings';
import { db, type StoredBooking } from '../core';
import { adminDb, type StoredRefund } from './db';
import { demoData, type DemoBooking } from './demo';

/**
 * Every booking the admin panel can see in demo mode, in one shape: bookings made in this browser
 * (flights, buses and trains in the static engine; hotels, cabs, bikes and parcels in their own
 * stores) plus generated sample data. Admin overrides (cancellations, refunds) are applied here.
 */

export interface UnifiedBooking {
  row: AdminBookingRow;
  routeLabel: string;
  passengers: AdminBookingDetail['passengers'];
  priceLines: AdminBookingDetail['priceLines'];
  payments: AdminPaymentRow[];
  refunds: AdminRefundRow[];
  timeline: AdminBookingDetail['timeline'];
  notes: string[];
  couponCode: string | null;
}

const readStore = <T>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ((JSON.parse(raw) as { state?: T }).state ?? null) : null;
  } catch {
    return null;
  }
};

/** Writes back a zustand-persist store, keeping its version. */
export function patchStore<T>(key: string, update: (state: T) => T): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state: T; version?: number };
    window.localStorage.setItem(key, JSON.stringify({ ...parsed, state: update(parsed.state) }));
    return true;
  } catch {
    return false;
  }
}

export const STORE_KEYS = {
  hotels: 'zproo-hotel-bookings',
  cabs: 'zproo-cabs-demo',
  bikes: 'zproo-bikes-v1',
  parcels: 'zproo-parcels-demo',
  wallet: 'zproo-wallet',
} as const;

const rupees = (n: number) => Math.round(n * 100);
const methodLabel = (m: string | undefined) =>
  ({ upi: 'UPI', card: 'Card', netbanking: 'Net banking', wallet: 'Wallet', cash: 'Cash', 'pay-at-pickup': 'Pay at pickup' })[
    m ?? ''
  ] ?? (m ? m : 'UPI');

function paymentRow(
  b: Pick<AdminBookingRow, 'reference' | 'serviceType' | 'customerName' | 'source'>,
  p: { id: string; amountPaise: number; status: PaymentStatus; method: string; provider: string; createdAt: string },
): AdminPaymentRow {
  return { ...p, bookingReference: b.reference, serviceType: b.serviceType, customerName: b.customerName, source: b.source };
}

function refundRow(
  b: Pick<AdminBookingRow, 'reference' | 'serviceType' | 'customerName' | 'source'>,
  r: { id: string; amountPaise: number; status: StoredRefund['status']; reason: string; createdAt: string; completedAt: string | null },
): AdminRefundRow {
  return { ...r, bookingReference: b.reference, serviceType: b.serviceType, customerName: b.customerName, source: b.source };
}

// ───────── Live: flights, buses, trains (static engine) ─────────

function fromEngine(b: StoredBooking): UnifiedBooking {
  const d = b.details;
  const item = listItem(b);
  const user = db().users.find((u) => u.id === b.userId);
  const row: AdminBookingRow = {
    reference: d.reference,
    serviceType: d.serviceType,
    status: d.status,
    paymentStatus: d.paymentStatus,
    title: item.title,
    subtitle: item.subtitle,
    customerName: user?.fullName ?? `${d.passengers[0]?.firstName ?? ''} ${d.passengers[0]?.lastName ?? ''}`.trim(),
    customerContact: d.contact.phone || d.contact.email,
    userId: b.userId,
    travelDate: d.travelDate,
    totalPaise: d.price.totalPaise,
    createdAt: d.createdAt,
    source: 'live',
  };
  const payments = db()
    .payments.filter((p) => p.reference === d.reference)
    .map((p) => paymentRow(row, { id: p.id, amountPaise: p.amountPaise, status: p.status, method: 'UPI', provider: 'mock', createdAt: d.createdAt }));
  const cancel = b.busCancellation;
  // A customer's bus cancellation: the demo gateway refunds at once, so the refund is already completed.
  const busRefunds =
    cancel && cancel.refundPaise > 0
      ? [refundRow(row, { id: `rfd_${d.reference}`, amountPaise: cancel.refundPaise, status: 'COMPLETED', reason: `Bus booking cancelled by customer (${cancel.refundPercent}% refund)`, createdAt: cancel.at, completedAt: cancel.at })]
      : [];
  const refunds = [...(d.train?.refunds ?? []).map((r) => refundRow(row, r)), ...busRefunds];
  const money = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;
  const timeline = [
    { at: d.createdAt, label: 'Booking created' },
    ...(d.confirmedAt ? [{ at: d.confirmedAt, label: 'Payment received · booking confirmed' }] : []),
    ...(d.cancelledAt
      ? [{ at: d.cancelledAt, label: cancel ? `Cancelled by customer: ${cancel.reason}${cancel.paid && cancel.refundPaise === 0 ? ' [no refund]' : ''}` : 'Booking cancelled' }]
      : []),
    ...(busRefunds.length ? [{ at: busRefunds[0]!.createdAt, label: `Refund of ${money(busRefunds[0]!.amountPaise)} requested` }, { at: busRefunds[0]!.createdAt, label: 'Refund completed' }] : []),
  ];
  return {
    row,
    routeLabel: item.title,
    passengers: d.passengers.map((p) => ({
      name: `${p.title} ${p.firstName} ${p.lastName}`.trim(),
      detail: [p.type, p.gender, p.age !== null && p.age !== undefined ? `${p.age} yrs` : null, p.seatNumber ? `Seat ${p.seatNumber}` : null].filter(Boolean).join(' · '),
    })),
    priceLines: d.price.lines.map((l) => ({ label: l.label, paise: l.amountPaise })),
    payments,
    refunds,
    timeline,
    notes: [d.train?.pnr ? `PNR ${d.train.pnr}` : '', ...d.flights.map((f) => (f.pnr ? `PNR ${f.pnr}` : ''))].filter(Boolean),
    couponCode: null,
  };
}

// ───────── Live: feature stores ─────────

interface HotelStored {
  booking: {
    reference: string; transactionId: string; paidAt: string; method: string; payAtProperty: boolean; hotelName: string; city: string;
    checkIn: string; nights: number; rooms: number; adults: number; children: number; roomName: string;
    guests: { firstName?: string; lastName?: string; name?: string }[];
    contact: { name: string; email: string; phone: string };
    price: { totalPaise: number; roomSubtotalPaise: number; taxesPaise?: number; taxPaise?: number };
  };
  userId: string;
  status: 'CONFIRMED' | 'CANCELLED';
  cancelledAt?: string;
  refundPaise?: number;
}

function fromHotel(h: HotelStored): UnifiedBooking {
  const b = h.booking;
  const cancelled = h.status === 'CANCELLED';
  const row: AdminBookingRow = {
    reference: b.reference,
    serviceType: 'HOTEL',
    status: cancelled ? (h.refundPaise ? 'REFUNDED' : 'CANCELLED') : b.checkIn < today() ? 'COMPLETED' : 'CONFIRMED',
    paymentStatus: b.payAtProperty ? 'CREATED' : cancelled && h.refundPaise ? 'REFUNDED' : 'SUCCESS',
    title: b.hotelName,
    subtitle: `${b.city} · ${b.nights} night${b.nights === 1 ? '' : 's'} · ${b.rooms} room${b.rooms === 1 ? '' : 's'}`,
    customerName: b.contact.name || db().users.find((u) => u.id === h.userId)?.fullName || 'Guest',
    customerContact: b.contact.phone || b.contact.email,
    userId: h.userId,
    travelDate: b.checkIn,
    totalPaise: b.price.totalPaise,
    createdAt: b.paidAt,
    source: 'live',
  };
  const tax = b.price.taxesPaise ?? b.price.taxPaise ?? Math.max(0, b.price.totalPaise - b.price.roomSubtotalPaise);
  return {
    row,
    routeLabel: b.city,
    passengers: b.guests.map((g) => ({ name: g.name ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim(), detail: 'Guest' })),
    priceLines: [
      { label: `${b.roomName} × ${b.nights} night(s)`, paise: b.price.roomSubtotalPaise },
      { label: 'Taxes & fees', paise: tax },
    ],
    payments: b.payAtProperty
      ? []
      : [paymentRow(row, { id: b.transactionId, amountPaise: b.price.totalPaise, status: row.paymentStatus, method: methodLabel(b.method), provider: 'demo', createdAt: b.paidAt })],
    refunds:
      cancelled && h.refundPaise
        ? [refundRow(row, { id: `rfd_${b.reference}`, amountPaise: h.refundPaise, status: 'COMPLETED', reason: 'Cancelled by guest', createdAt: h.cancelledAt ?? b.paidAt, completedAt: h.cancelledAt ?? b.paidAt })]
        : [],
    timeline: [
      { at: b.paidAt, label: b.payAtProperty ? 'Booked · pay at property' : 'Paid · booking confirmed' },
      ...(h.cancelledAt ? [{ at: h.cancelledAt, label: 'Cancelled by guest' }] : []),
    ],
    notes: [`Transaction ${b.transactionId}`],
    couponCode: null,
  };
}

interface CabStored {
  reference: string; createdAt: number; status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'; vehicleId: string; pickup: string; drop: string;
  date: string; fare: { base: number; distance: number; time: number; platform: number; taxes: number; discount: number; total: number };
  couponCode: string | null; paymentMethod: string; passenger: { name: string; mobile: string; email: string; count: number };
  route?: { distanceKm?: number }; cancellation?: { reason: string; fee: number; at: number };
}

function fromCab(c: CabStored): UnifiedBooking {
  const cancelled = c.status === 'cancelled';
  const status: BookingStatus = cancelled ? 'CANCELLED' : c.status === 'completed' ? 'COMPLETED' : 'CONFIRMED';
  const row: AdminBookingRow = {
    reference: c.reference,
    serviceType: 'CAB',
    status,
    paymentStatus: c.paymentMethod === 'cash' ? (c.status === 'completed' ? 'SUCCESS' : 'CREATED') : cancelled ? 'REFUNDED' : 'SUCCESS',
    title: `${c.pickup} → ${c.drop}`,
    subtitle: `${c.vehicleId.toUpperCase()} · ${c.passenger.count} rider${c.passenger.count === 1 ? '' : 's'}`,
    customerName: c.passenger.name || 'Rider',
    customerContact: c.passenger.mobile || c.passenger.email,
    userId: null,
    travelDate: c.date,
    totalPaise: rupees(c.fare.total),
    createdAt: new Date(c.createdAt).toISOString(),
    source: 'live',
  };
  return {
    row,
    routeLabel: `${c.pickup} → ${c.drop}`,
    passengers: [{ name: c.passenger.name, detail: `${c.passenger.count} rider(s)` }],
    priceLines: [
      { label: 'Base fare', paise: rupees(c.fare.base) },
      { label: 'Distance', paise: rupees(c.fare.distance) },
      { label: 'Time', paise: rupees(c.fare.time) },
      { label: 'Platform fee', paise: rupees(c.fare.platform) },
      { label: 'Taxes', paise: rupees(c.fare.taxes) },
      ...(c.fare.discount ? [{ label: `Discount${c.couponCode ? ` (${c.couponCode})` : ''}`, paise: -rupees(c.fare.discount) }] : []),
    ],
    payments: [paymentRow(row, { id: `pay_${c.reference}`, amountPaise: row.totalPaise, status: row.paymentStatus, method: methodLabel(c.paymentMethod), provider: 'demo', createdAt: row.createdAt })],
    refunds:
      cancelled && c.paymentMethod !== 'cash'
        ? [refundRow(row, { id: `rfd_${c.reference}`, amountPaise: Math.max(0, row.totalPaise - rupees(c.cancellation?.fee ?? 0)), status: 'COMPLETED', reason: c.cancellation?.reason ?? 'Ride cancelled', createdAt: new Date(c.cancellation?.at ?? c.createdAt).toISOString(), completedAt: new Date(c.cancellation?.at ?? c.createdAt).toISOString() })]
        : [],
    timeline: [
      { at: row.createdAt, label: 'Ride booked' },
      ...(c.cancellation ? [{ at: new Date(c.cancellation.at).toISOString(), label: `Cancelled: ${c.cancellation.reason}` }] : []),
    ],
    notes: [],
    couponCode: c.couponCode,
  };
}

interface BikeStored {
  reference: string; createdAt: string; bike: { name: string };
  request: { customer: { fullName: string; mobile: string; email: string }; schedule?: { pickupDate?: string; startDate?: string } };
  pickup: { city: string; name: string }; quote: { total: number; rentalCharge: number; tax: number; extrasTotal: number; discount: number; deposit: number; rentalDays: number; couponCode?: string | null; couponDiscount?: number };
  payment?: { method: string; amountPaid: number; status: string };
}

function fromBike(b: BikeStored): UnifiedBooking {
  const travel = b.request.schedule?.pickupDate ?? b.request.schedule?.startDate ?? b.createdAt.slice(0, 10);
  const row: AdminBookingRow = {
    reference: b.reference,
    serviceType: 'BIKE',
    status: travel < today() ? 'COMPLETED' : 'CONFIRMED',
    paymentStatus: b.payment?.status === 'pay-at-pickup' ? 'CREATED' : 'SUCCESS',
    title: b.bike.name,
    subtitle: `${b.pickup.city} · ${b.pickup.name} · ${b.quote.rentalDays} day${b.quote.rentalDays === 1 ? '' : 's'}`,
    customerName: b.request.customer.fullName,
    customerContact: b.request.customer.mobile || b.request.customer.email,
    userId: null,
    travelDate: travel,
    totalPaise: rupees(b.quote.total),
    createdAt: b.createdAt,
    source: 'live',
  };
  return {
    row,
    routeLabel: b.bike.name,
    passengers: [{ name: b.request.customer.fullName, detail: 'Rider' }],
    priceLines: [
      { label: 'Rental', paise: rupees(b.quote.rentalCharge) },
      { label: 'Extras', paise: rupees(b.quote.extrasTotal) },
      { label: 'Tax', paise: rupees(b.quote.tax) },
      ...(b.quote.discount ? [{ label: 'Discount', paise: -rupees(b.quote.discount) }] : []),
      ...(b.quote.couponDiscount ? [{ label: `Coupon ${b.quote.couponCode ?? ''}`.trim(), paise: -rupees(b.quote.couponDiscount) }] : []),
    ],
    payments: b.payment && b.payment.amountPaid > 0
      ? [paymentRow(row, { id: `pay_${b.reference}`, amountPaise: rupees(b.payment.amountPaid), status: 'SUCCESS', method: methodLabel(b.payment.method), provider: 'demo', createdAt: b.createdAt })]
      : [],
    refunds: [],
    timeline: [{ at: b.createdAt, label: 'Rental booked' }],
    notes: [`Refundable deposit ₹${b.quote.deposit.toLocaleString('en-IN')}`],
    couponCode: b.quote.couponCode ?? null,
  };
}

interface ParcelStored {
  id: string; title: string; sub: string; amt: number; st: 'Booked' | 'Delivered' | 'Cancelled'; svc: string; pm?: string; reason?: string;
  coupon?: string; disc?: number;
  snap?: { p: { sn: string; sm: string; rn: string } };
}

function fromParcel(p: ParcelStored): UnifiedBooking {
  const seen = firstSeen(p.id);
  const row: AdminBookingRow = {
    reference: p.id,
    serviceType: 'PARCEL',
    status: p.st === 'Cancelled' ? 'CANCELLED' : p.st === 'Delivered' ? 'COMPLETED' : 'CONFIRMED',
    paymentStatus: p.st === 'Cancelled' ? 'REFUNDED' : 'SUCCESS',
    title: p.title,
    subtitle: `${p.svc} · ${p.sub}`,
    customerName: p.snap?.p.sn || 'Sender',
    customerContact: p.snap?.p.sm ?? '',
    userId: null,
    travelDate: seen.slice(0, 10),
    totalPaise: rupees(p.amt),
    createdAt: seen,
    source: 'live',
  };
  return {
    row,
    routeLabel: p.title,
    passengers: [
      { name: p.snap?.p.sn ?? 'Sender', detail: 'Sender' },
      ...(p.snap ? [{ name: p.snap.p.rn, detail: 'Receiver' }] : []),
    ],
    priceLines: p.coupon && p.disc
      ? [{ label: 'Delivery charges (incl. GST)', paise: row.totalPaise + rupees(p.disc) }, { label: `Coupon ${p.coupon}`, paise: -rupees(p.disc) }]
      : [{ label: 'Delivery charges (incl. GST)', paise: row.totalPaise }],
    payments: [paymentRow(row, { id: `pay_${p.id}`, amountPaise: row.totalPaise, status: row.paymentStatus, method: methodLabel(p.pm), provider: 'demo', createdAt: seen })],
    refunds: p.st === 'Cancelled' ? [refundRow(row, { id: `rfd_${p.id}`, amountPaise: row.totalPaise, status: 'COMPLETED', reason: p.reason ?? 'Cancelled', createdAt: seen, completedAt: seen })] : [],
    timeline: [{ at: seen, label: 'Parcel booked' }],
    notes: [],
    couponCode: p.coupon ?? null,
  };
}

/** Parcels carry no timestamp: remember when the panel first saw each one. */
const seenCache: Record<string, string> = {};
function firstSeen(id: string): string {
  const key = 'zproo-go-admin-seen';
  if (!Object.keys(seenCache).length) {
    try {
      Object.assign(seenCache, JSON.parse(window.localStorage.getItem(key) ?? '{}'));
    } catch {
      /* ignore */
    }
  }
  if (!seenCache[id]) {
    seenCache[id] = new Date().toISOString();
    try {
      window.localStorage.setItem(key, JSON.stringify(seenCache));
    } catch {
      /* ignore */
    }
  }
  return seenCache[id] as string;
}

// ───────── Demo ─────────

function fromDemo(b: DemoBooking): UnifiedBooking {
  const row: AdminBookingRow = {
    reference: b.reference,
    serviceType: b.serviceType,
    status: b.status,
    paymentStatus: b.paymentStatus,
    title: b.title,
    subtitle: b.subtitle,
    customerName: b.customerName,
    customerContact: b.customerContact,
    userId: b.userId,
    travelDate: b.travelDate,
    totalPaise: b.totalPaise,
    createdAt: b.createdAt,
    source: 'demo',
  };
  return {
    row,
    routeLabel: b.routeLabel,
    passengers: b.passengers,
    priceLines: b.priceLines,
    payments: b.payments.map((p) => paymentRow(row, p)),
    refunds: b.refund ? [refundRow(row, b.refund)] : [],
    timeline: [
      { at: b.createdAt, label: 'Booking created' },
      ...b.payments.filter((p) => p.status === 'FAILED').map((p) => ({ at: p.createdAt, label: `Payment attempt failed (${p.method})` })),
      ...(b.confirmedAt ? [{ at: b.confirmedAt, label: 'Payment received · booking confirmed' }] : []),
      ...(b.cancelledAt ? [{ at: b.cancelledAt, label: `Cancelled: ${b.cancellationReason ?? ''}` }] : []),
      ...(b.refund ? [{ at: b.refund.createdAt, label: 'Refund initiated' }] : []),
      ...(b.refund?.completedAt ? [{ at: b.refund.completedAt, label: 'Refund completed' }] : []),
    ],
    notes: b.couponCode ? [`Coupon ${b.couponCode} applied`] : [],
    couponCode: b.couponCode,
  };
}

const today = () => new Date().toISOString().slice(0, 10);

/** Applies panel changes (cancellations, refunds, refund status updates) to a booking. */
function applyOverrides(u: UnifiedBooking): UnifiedBooking {
  const a = adminDb();
  const override = a.bookingOverrides[u.row.reference];
  const extraRefunds = a.refunds.filter((r) => r.bookingReference === u.row.reference);
  let refunds = [...u.refunds, ...extraRefunds.map((r) => refundRow({ ...u.row }, r))].map((r) => {
    const s = a.refundStatus[r.id];
    return s ? { ...r, status: s.status, completedAt: s.completedAt } : r;
  });
  let row = u.row;
  let timeline = u.timeline;
  if (override) {
    row = { ...row, status: override.status };
    if (override.cancelledAt) timeline = [...timeline, { at: override.cancelledAt, label: `Cancelled by admin: ${override.reason ?? ''}` }];
  }
  // Booking/payment status follow the refunds.
  if (refunds.length) {
    const open = refunds.some((r) => r.status === 'REQUESTED' || r.status === 'PROCESSING');
    const done = refunds.filter((r) => r.status === 'COMPLETED').reduce((s, r) => s + r.amountPaise, 0);
    if (open && ['CANCELLED', 'REFUNDED', 'REFUND_PENDING'].includes(row.status)) row = { ...row, status: 'REFUND_PENDING' };
    if (!open && done > 0 && ['CANCELLED', 'REFUND_PENDING'].includes(row.status)) {
      row = { ...row, status: 'REFUNDED', paymentStatus: done >= row.totalPaise ? 'REFUNDED' : 'PARTIALLY_REFUNDED' };
    }
    refunds = refunds.map((r) => ({ ...r, customerName: row.customerName }));
  }
  return { ...u, row, refunds, timeline };
}

export interface BookingFilter {
  includeDemo: boolean;
}

/** All bookings, newest first. */
export function allBookings({ includeDemo }: BookingFilter): UnifiedBooking[] {
  const live: UnifiedBooking[] = [
    ...db().bookings.map(fromEngine),
    ...(readStore<{ items: HotelStored[] }>(STORE_KEYS.hotels)?.items ?? []).map(fromHotel),
    ...(readStore<{ bookings: CabStored[] }>(STORE_KEYS.cabs)?.bookings ?? []).map(fromCab),
    ...(readStore<{ bookings: BikeStored[] }>(STORE_KEYS.bikes)?.bookings ?? []).map(fromBike),
    ...(readStore<{ bookings: ParcelStored[] }>(STORE_KEYS.parcels)?.bookings ?? []).map(fromParcel),
  ];
  const all = includeDemo ? [...live, ...demoData(adminDb().demoSeed).bookings.map(fromDemo)] : live;
  return all.map(applyOverrides).sort((a, b) => b.row.createdAt.localeCompare(a.row.createdAt));
}

export const isLive = (source: RecordSource) => source === 'live';
export type { ServiceType };
