import type { BadgeProps } from '@zproo/ui';
import type { ServiceType } from '@zproo/types';

const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const dateTimeFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/** ₹ from paise. Whole rupees show without decimals; anything with paise shows both digits (₹499.50, never ₹500). */
export const inr = (paise: number) => {
  const p = Math.round(paise);
  return p % 100 === 0 ? inrWhole.format(p / 100) : inrPaise.format(p / 100);
};
/** ₹1.2L style for tight spaces. */
export function inrCompact(paise: number): string {
  const r = paise / 100;
  const a = Math.abs(r);
  const fmt = (n: number, unit: string) => `${r < 0 ? '−' : ''}₹${Number(n.toFixed(n < 10 ? 1 : 0))}${unit}`;
  if (a >= 1e7) return fmt(a / 1e7, 'Cr');
  if (a >= 1e5) return fmt(a / 1e5, 'L');
  if (a >= 1e3) return fmt(a / 1e3, 'K');
  return fmt(a, '');
}
export const count = (n: number) => n.toLocaleString('en-IN');
export const fmtDate = (iso: string | null | undefined) => (iso ? dateFormat.format(new Date(iso)) : '—');
export const fmtShortDate = (iso: string) => shortDate.format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));
export const fmtDateTime = (iso: string | null | undefined) => (iso ? dateTimeFormat.format(new Date(iso)) : '—');

/** "REFUND_PENDING" → "Refund pending" */
export const humanize = (value: string) =>
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} d ago` : fmtDate(iso);
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  FLIGHT: 'Flights',
  BUS: 'Buses',
  TRAIN: 'Trains',
  HOTEL: 'Hotels',
  CAB: 'Cabs',
  BIKE: 'Bikes',
  HOLIDAY: 'Holidays',
  PARCEL: 'Parcels',
};
export const SERVICE_ORDER = Object.keys(SERVICE_LABELS) as ServiceType[];

type Tone = NonNullable<BadgeProps['variant']>;

const TONES: Record<string, Tone> = {
  // bookings
  CONFIRMED: 'success',
  COMPLETED: 'outline',
  PROCESSING: 'soft',
  PENDING_PAYMENT: 'warning',
  INITIATED: 'warning',
  CANCELLED: 'danger',
  REFUND_PENDING: 'warning',
  REFUNDED: 'outline',
  // payments
  SUCCESS: 'success',
  CREATED: 'outline',
  PENDING: 'warning',
  AUTHORIZED: 'soft',
  FAILED: 'danger',
  PARTIALLY_REFUNDED: 'warning',
  // refunds
  REQUESTED: 'warning',
  // users / partners / drivers
  ACTIVE: 'success',
  INACTIVE: 'warning',
  SUSPENDED: 'danger',
  PENDING_KYC: 'warning',
  // tickets
  OPEN: 'danger',
  IN_PROGRESS: 'soft',
  WAITING_ON_CUSTOMER: 'warning',
  RESOLVED: 'success',
  CLOSED: 'outline',
  // notifications
  SENT: 'success',
  SCHEDULED: 'soft',
  DRAFT: 'outline',
  // priorities
  URGENT: 'danger',
  HIGH: 'warning',
  MEDIUM: 'soft',
  LOW: 'outline',
};

export const toneOf = (status: string): Tone => TONES[status] ?? 'outline';

/** Fixed categorical colours per service (validated reference palette, light mode). */
export const SERVICE_COLORS: Record<ServiceType, string> = {
  FLIGHT: '#2a78d6',
  BUS: '#eb6834',
  TRAIN: '#1baf7a',
  HOTEL: '#eda100',
  CAB: '#e87ba4',
  BIKE: '#008300',
  HOLIDAY: '#6250d6',
  PARCEL: '#e34948',
};

export function downloadFile(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const isoDay = (d: Date) => {
  const y = d.getFullYear();
  return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const daysAgo = (n: number) => isoDay(new Date(Date.now() - n * 86_400_000));

export const RANGES = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
  { value: 365, label: '1Y' },
] as const;
