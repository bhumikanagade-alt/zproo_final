import { RULES } from './rules';
import type { RentalSchedule } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Local-time Date from a yyyy-mm-dd + HH:mm pair; `null` when either part is missing or invalid. */
export function parseLocal(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  const [h, mi] = time.split(':').map(Number) as [number, number];
  const out = new Date(y, mo - 1, d, h, mi, 0, 0);
  return Number.isNaN(out.getTime()) || out.getMonth() !== mo - 1 ? null : out;
}

/** Time options (e.g. "06:00" … "22:00") in the configured business window. */
export function timeSlots(): string[] {
  const out: string[] = [];
  for (let m = RULES.slotStartHour * 60; m <= RULES.slotEndHour * 60; m += RULES.slotStepMinutes) {
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return out;
}

/** The earliest bookable pickup moment, rounded up to the next slot. */
export function earliestPickup(now = new Date()): Date {
  const t = new Date(now.getTime() + RULES.leadTimeHours * 3_600_000);
  const step = RULES.slotStepMinutes;
  t.setMinutes(Math.ceil(t.getMinutes() / step) * step, 0, 0);
  return t;
}

/** Default schedule: pickup tomorrow 10:00, return the following day 10:00 (24 hours). */
export function defaultDates(now = new Date()): Pick<RentalSchedule, 'pickupDate' | 'pickupTime' | 'returnDate' | 'returnTime'> {
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { pickupDate: toIsoDate(start), pickupTime: '10:00', returnDate: toIsoDate(end), returnTime: '10:00' };
}

const fmtDate = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

export const formatDate = (d: Date) => fmtDate.format(d);
export const formatTime = (d: Date) => fmtTime.format(d).toLowerCase();
export const formatDateTime = (d: Date) => `${formatDate(d)}, ${formatTime(d)}`;

export function formatClock(hhmm: string): string {
  const d = parseLocal('2000-01-01', hhmm);
  return d ? formatTime(d) : hhmm;
}

/** "2 days 4 hrs", "6 hrs", "1 day". */
export function formatDuration(hours: number): string {
  const total = Math.max(0, Math.round(hours));
  const days = Math.floor(total / 24);
  const rem = total % 24;
  const parts = [] as string[];
  if (days) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (rem || !days) parts.push(`${rem} ${rem === 1 ? 'hr' : 'hrs'}`);
  return parts.join(' ');
}
