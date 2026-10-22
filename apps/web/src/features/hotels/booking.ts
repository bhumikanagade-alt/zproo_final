import type { Hotel, HotelRoom, MealPlan } from './data';
import { MEAL_PLAN_LABEL } from './data';
import { describeCancellation } from './cancellation';
import { formatDate } from './dates';
import { priceStay, type CouponSelection, type PriceBreakdown } from './pricing';
import { specialRequestLabel, type PaymentInput, type PaymentMethod } from './validation';

export interface BookingGuest {
  firstName: string;
  lastName: string;
  age: number;
  type: 'ADULT' | 'CHILD';
  gender?: string;
}

/** Everything needed to show (and print) a booking after the fact, independent of live state. */
export interface ConfirmedBooking {
  reference: string;
  transactionId: string;
  paidAt: string; // ISO timestamp
  method: PaymentMethod;
  payAtProperty: boolean;
  hotelId: string;
  hotelName: string;
  hotelAddress: string;
  city: string;
  stars: number;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  nights: number;
  rooms: number;
  adults: number;
  children: number;
  childAges: number[];
  roomName: string;
  beds: string;
  mealPlan: MealPlan;
  cancellationHeadline: string;
  cancellationRules: string[];
  guests: BookingGuest[];
  contact: { name: string; email: string; phone: string; country: string };
  specialRequests: string[];
  specialNote: string;
  price: PriceBreakdown;
}

export interface BookingInput {
  hotel: Hotel;
  room: HotelRoom;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  adults: number;
  children: number;
  childAges: number[];
  guests: BookingGuest[];
  contact: { name?: string | undefined; email: string; phone: string; country?: string | undefined };
  specialRequests: string[];
  specialNote: string;
  coupon: CouponSelection;
  method: PaymentMethod;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length: number, rand: () => number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[Math.floor(rand() * ALPHABET.length)] ?? 'X';
  return out;
}

export function generateReference(now: Date = new Date(), rand: () => number = Math.random): string {
  return `ZPH-${now.getFullYear()}-${randomCode(6, rand)}`;
}

export function generateTransactionId(rand: () => number = Math.random): string {
  return `TXN${randomCode(10, rand)}`;
}

export type PaymentOutcome =
  | { status: 'SUCCESS'; transactionId: string }
  | { status: 'FAILED'; message: string };

/**
 * Demo payment verification. A real gateway would confirm the charge server-side; here the outcome
 * is deterministic so every path can be tested: card numbers ending 0002 and UPI IDs starting
 * "fail@" are declined, everything else succeeds.
 */
export function verifyPayment(
  input: PaymentInput,
  amountPaise: number,
  rand: () => number = Math.random,
): PaymentOutcome {
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    return { status: 'FAILED', message: 'The payable amount is invalid. Please review your booking.' };
  }
  if (input.method === 'card' && input.card.number.replace(/\s/g, '').endsWith('0002')) {
    return { status: 'FAILED', message: 'Your card was declined by the bank. Try another card or payment method.' };
  }
  if (input.method === 'upi' && input.upi.trim().toLowerCase().startsWith('fail@')) {
    return { status: 'FAILED', message: 'The UPI payment was not approved. Please try again.' };
  }
  return { status: 'SUCCESS', transactionId: generateTransactionId(rand) };
}

export function buildBooking(
  input: BookingInput,
  reference: string,
  transactionId: string,
  now: Date = new Date(),
): ConfirmedBooking {
  const { hotel, room } = input;
  const price = priceStay(room, input.nights, input.rooms, input.coupon);
  const cancellation = describeCancellation(room.cancellation, input.checkIn, hotel.checkInTime, now);
  const first = input.guests[0];
  return {
    reference,
    transactionId,
    paidAt: now.toISOString(),
    method: input.method,
    payAtProperty: room.payAtProperty,
    hotelId: hotel.id,
    hotelName: hotel.name,
    hotelAddress: hotel.address,
    city: hotel.city,
    stars: hotel.stars,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    checkInTime: hotel.checkInTime,
    checkOutTime: hotel.checkOutTime,
    nights: input.nights,
    rooms: input.rooms,
    adults: input.adults,
    children: input.children,
    childAges: [...input.childAges],
    roomName: room.name,
    beds: room.beds,
    mealPlan: room.mealPlan,
    cancellationHeadline: cancellation.headline,
    cancellationRules: cancellation.rules,
    guests: input.guests.map((g) => ({ ...g })),
    contact: {
      name: input.contact.name?.trim() || (first ? `${first.firstName} ${first.lastName}`.trim() : ''),
      email: input.contact.email,
      phone: input.contact.phone,
      country: input.contact.country ?? 'India',
    },
    specialRequests: [...input.specialRequests],
    specialNote: input.specialNote.trim(),
    price,
  };
}

const inr = (paise: number) => `INR ${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/** Plain-text confirmation, used for the "Download" button. */
export function buildConfirmationText(b: ConfirmedBooking): string {
  const lines = [
    'ZPROO HOTEL BOOKING CONFIRMATION',
    '================================',
    `Booking reference : ${b.reference}`,
    `Transaction ID    : ${b.transactionId}`,
    `Status            : CONFIRMED`,
    '',
    `Hotel    : ${b.hotelName} (${b.stars}-star)`,
    `Address  : ${b.hotelAddress}`,
    `Room     : ${b.roomName} · ${b.beds} · ${MEAL_PLAN_LABEL[b.mealPlan]}`,
    `Check-in : ${formatDate(b.checkIn)} from ${b.checkInTime}`,
    `Check-out: ${formatDate(b.checkOut)} until ${b.checkOutTime}`,
    `Stay     : ${b.nights} night${b.nights === 1 ? '' : 's'}, ${b.rooms} room${b.rooms === 1 ? '' : 's'}, ${b.adults} adult${b.adults === 1 ? '' : 's'}${b.children ? `, ${b.children} child${b.children === 1 ? '' : 'ren'}` : ''}`,
    '',
    'Guests',
    ...b.guests.map((g, i) => `  ${i + 1}. ${g.firstName} ${g.lastName} (${g.type === 'ADULT' ? 'Adult' : 'Child'}, ${g.age})`),
    '',
    `Contact: ${b.contact.name} · ${b.contact.email} · ${b.contact.phone}`,
  ];
  if (b.specialRequests.length || b.specialNote) {
    lines.push('', 'Special requests (subject to availability)');
    for (const id of b.specialRequests) lines.push(`  - ${specialRequestLabel(id)}`);
    if (b.specialNote) lines.push(`  - ${b.specialNote}`);
  }
  lines.push('', 'Cancellation', ...b.cancellationRules.map((r) => `  - ${r}`));
  lines.push(
    '',
    'Price',
    `  Room price (${b.nights} night${b.nights === 1 ? '' : 's'} × ${b.rooms} room${b.rooms === 1 ? '' : 's'}): ${inr(b.price.roomSubtotalPaise)}`,
    `  Taxes & fees: ${inr(b.price.taxesPaise)}`,
  );
  if (b.price.couponDiscountPaise > 0)
    lines.push(`  Coupon ${b.price.couponCode}: -${inr(b.price.couponDiscountPaise)}`);
  lines.push(`  Total ${b.payAtProperty ? 'payable at property' : 'paid'}: ${inr(b.price.totalPaise)}`);
  return lines.join('\n');
}
