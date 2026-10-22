import type { ConfirmedBooking } from './booking';
import { SUPPORT_EMAIL } from '@/config/contact';
import { buildConfirmationText } from './booking';
import { findHotel, hotelMapLinks } from './data';

const compact = (iso: string) => iso.replaceAll('-', '');
const icsEscape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** An all-day calendar event spanning the stay (check-out day is exclusive in iCalendar). */
export function buildCalendarFile(b: ConfirmedBooking, now: Date = new Date()): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ZPROO GO//Hotel booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${b.reference}@zproo.go`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${compact(b.checkIn)}`,
    `DTEND;VALUE=DATE:${compact(b.checkOut)}`,
    `SUMMARY:${icsEscape(`Stay at ${b.hotelName}`)}`,
    `LOCATION:${icsEscape(b.hotelAddress)}`,
    `DESCRIPTION:${icsEscape(`Booking ${b.reference}. Room: ${b.roomName}. Check-in from ${b.checkInTime}, check-out until ${b.checkOutTime}.`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** mailto: link that opens the guest's mail app with the voucher text, so they can email themselves a copy. */
export function buildEmailLink(b: ConfirmedBooking): string {
  const subject = `Hotel voucher ${b.reference}: ${b.hotelName}`;
  return `mailto:${encodeURIComponent(b.contact.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildConfirmationText(b))}`;
}

export function downloadTextFile(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Directions link (uses the catalogue coordinates when the hotel is known, else a text search). */
export function directionsLink(b: Pick<ConfirmedBooking, 'hotelId' | 'hotelName' | 'hotelAddress'>): string {
  const hotel = findHotel(b.hotelId);
  if (hotel) return hotelMapLinks(hotel).directions;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${b.hotelName}, ${b.hotelAddress}`)}`;
}

/** Hotel contact: the catalogue has no phone number, so we point guests to ZPROO support with the reference. */
export const supportMailLink = (b: Pick<ConfirmedBooking, 'reference' | 'hotelName'>) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Help with booking ${b.reference} at ${b.hotelName}`)}`;
