import { formatMoney } from '@zproo/utils';

/** Money in paise → "₹5,320". */
export const inr = (paise: number) => formatMoney(paise);

const timeFormatters = new Map<string, Intl.DateTimeFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

/** "06:45" in the airport's own time zone (flight times are always local to the airport). */
export function localTime(iso: string, timeZone: string): string {
  let fmt = timeFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    });
    timeFormatters.set(timeZone, fmt);
  }
  return fmt.format(new Date(iso));
}

/** "Sat, 25 Oct" in the airport's time zone. */
export function localDay(iso: string, timeZone: string): string {
  let fmt = dateFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone,
    });
    dateFormatters.set(timeZone, fmt);
  }
  return fmt.format(new Date(iso));
}

/** Hour of day (0–23) in the airport's time zone, for time-of-day filters. */
export function localHour(iso: string, timeZone: string): number {
  return Number(localTime(iso, timeZone).slice(0, 2));
}

/** Calendar days between departure and arrival, each in its own airport's time zone. */
export function dayShift(
  departureAt: string,
  depTz: string,
  arrivalAt: string,
  arrTz: string,
): number {
  const day = (iso: string, tz: string) =>
    Date.parse(new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(iso)));
  return Math.round((day(arrivalAt, arrTz) - day(departureAt, depTz)) / 86_400_000);
}

/** 135 → "2h 15m". */
export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "2026-10-25" → "Sat, 25 Oct 2026" (a travel date, not an instant: no time-zone shift). */
export function travelDate(date: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export const stopsLabel = (stops: number) =>
  stops === 0 ? 'Non-stop' : `${stops} stop${stops > 1 ? 's' : ''}`;

export function travellersLabel(p: { adults: number; children: number; infants: number }): string {
  const parts = [`${p.adults} adult${p.adults > 1 ? 's' : ''}`];
  if (p.children) parts.push(`${p.children} child${p.children > 1 ? 'ren' : ''}`);
  if (p.infants) parts.push(`${p.infants} infant${p.infants > 1 ? 's' : ''}`);
  return parts.join(', ');
}

/** The travel date (YYYY-MM-DD) in the departure airport's time zone; ages are checked on it. */
export function departureDate(offer: { departureAt: string; from: { timezone: string } }): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: offer.from.timezone }).format(
    new Date(offer.departureAt),
  );
}
