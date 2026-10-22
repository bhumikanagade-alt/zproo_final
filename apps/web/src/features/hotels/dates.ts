/** Small ISO-date (YYYY-MM-DD) helpers. Local-calendar based, no time zones involved. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso(now: Date = new Date()): string {
  return toIso(now);
}

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return toIso(new Date(y, m - 1, d + days));
}

/** Whole nights between two ISO dates (can be 0 or negative; not clamped). */
export function diffNights(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = checkIn.split('-').map(Number) as [number, number, number];
  const [y2, m2, d2] = checkOut.split('-').map(Number) as [number, number, number];
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

const display = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "Sat, 10 Oct 2026" */
export function formatDate(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return display.format(new Date(Date.UTC(y, m - 1, d)));
}

const dateTime = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** "8 Oct 2026, 2:00 pm" in the viewer's locale clock. */
export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

/** Combines an ISO date with an "HH:mm" time into a local Date. */
export function atTime(iso: string, time: string): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, hh, mm ?? 0, 0, 0);
}
