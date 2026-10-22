/**
 * Bike Booking data access: the ONLY file that knows where data comes from.
 *
 * Today every function resolves from the mock files in `./mock` after a short delay (so loading
 * states are real). No network requests are made and no endpoints are faked.
 *
 * ── Backend integration (later) ─────────────────────────────────────────────────────────────
 * Replace each function body with a call through `@/services/http`, keeping the signatures:
 *
 *   listBikes(filters)   → apiGet<Bike[]>('/bikes', { params: toQuery(filters) })
 *   getBike(id)          → apiGet<Bike>(`/bikes/${id}`)
 *   listLocations()      → apiGet<PickupLocation[]>('/bike-locations')
 *   listReviews(bikeId)  → apiGet<BikeReview[]>(`/bikes/${bikeId}/reviews`)
 *   createBooking(req)   → apiPost<BikeBooking>('/bike-bookings', req)
 *
 * Components, hooks and the store do not need to change.
 *
 * ── Testing error states ────────────────────────────────────────────────────────────────────
 * Add `?mockError=1` to any /bikes URL (landing, results, details or hubs) to make every call below fail with a network error
 * (`?mockError=notfound` for a 404), so the error UI can be checked without a backend.
 * `?mockError=payment` (or `booking`) fails ONLY the final `createBooking` call, to test the payment-page error state.
 * Payment is simulated inside `createBooking`: card 4000 0000 0000 0002 or UPI fail@upi are declined (demo).
 */
import { MOCK_BIKES } from './mock/bikes.mock';
import { MOCK_LOCATIONS } from './mock/locations.mock';
import { MOCK_REVIEWS } from './mock/reviews.mock';
import { EXTRAS, PAYMENT_METHODS } from './rules';
import { amountDueNow, computeQuote } from './pricing';
import { applyFilters } from './filters';
import { validateCustomer, validateSchedule } from './validation';
import { couponErrorMessage, couponsApi } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';
import { BikeApiError, type Bike, type BikeBooking, type BikeFilters, type BikeReview, type BookingRequest, type PickupLocation } from './types';

const LATENCY_MS = 450;

const wait = (ms = LATENCY_MS) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Dev-only switch for exercising error UI (see header). */
function maybeFail(scope: 'read' | 'booking' = 'read') {
  if (typeof window === 'undefined') return;
  const flag = new URLSearchParams(window.location.search).get('mockError');
  if (!flag) return;
  if ((flag === 'booking' || flag === 'payment') && scope !== 'booking') return;
  if (flag === 'notfound') throw new BikeApiError('NOT_FOUND', 'This bike could not be found.');
  throw new BikeApiError('NETWORK', 'We could not reach the bike service. Please check your connection and try again.');
}

export async function listBikes(filters: BikeFilters): Promise<Bike[]> {
  await wait();
  maybeFail();
  return applyFilters(MOCK_BIKES, filters, MOCK_LOCATIONS);
}

export async function getBike(id: string): Promise<Bike> {
  await wait(300);
  maybeFail();
  const bike = MOCK_BIKES.find((b) => b.id === id);
  if (!bike) throw new BikeApiError('NOT_FOUND', 'This bike could not be found.');
  return bike;
}

export async function listLocations(): Promise<PickupLocation[]> {
  await wait(150);
  maybeFail();
  return MOCK_LOCATIONS;
}

export async function listReviews(bikeId: string): Promise<BikeReview[]> {
  await wait(250);
  maybeFail();
  return MOCK_REVIEWS.filter((r) => r.bikeId === bikeId);
}

const refCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
};

/**
 * Mock booking + payment: re-validates the request like a server would, simulates the payment
 * result, then "confirms" it. It does NOT check real availability, hold stock or move any money.
 * Real gateway later: create the payment with the booking in one API call and return the outcome.
 */
export async function createBooking(req: BookingRequest): Promise<BikeBooking> {
  await wait(900);
  maybeFail('booking');
  const bike = MOCK_BIKES.find((b) => b.id === req.bikeId);
  if (!bike) throw new BikeApiError('NOT_FOUND', 'This bike could not be found.');
  const pickup = MOCK_LOCATIONS.find((l) => l.id === req.schedule.pickupLocationId);
  const returnLocation = MOCK_LOCATIONS.find((l) => l.id === req.schedule.returnLocationId);
  if (!pickup || !returnLocation) throw new BikeApiError('VALIDATION', 'Choose a valid pickup and return area.');
  if (pickup.city !== req.schedule.pickupCity || returnLocation.city !== req.schedule.pickupCity) throw new BikeApiError('VALIDATION', 'Pickup and return areas must be in the selected city.');
  if (Object.keys(validateSchedule(req.schedule, bike.pricing.minHours)).length || Object.keys(validateCustomer(req.customer, req.acceptedTerms)).length) {
    throw new BikeApiError('VALIDATION', 'Some booking details are invalid. Please review the form.');
  }
  if (!(req.payment.method in PAYMENT_METHODS)) throw new BikeApiError('VALIDATION', 'Choose a payment method.');
  if (req.payment.simulateDecline) throw new BikeApiError('PAYMENT_DECLINED', 'Your bank declined this payment (demo). No money was taken. Please try another method.');
  const extras = EXTRAS.filter((x) => req.extraIds.includes(x.id));
  const plain = computeQuote({ bike, schedule: req.schedule, extras });
  if (!plain) throw new BikeApiError('VALIDATION', 'The rental dates are invalid.');
  const reference = `ZB-${refCode()}`;
  // A coupon made in the admin panel: the server checks it against this rental again and records its use
  // (so the admin "Used" column moves and the limits hold). Nothing is booked if it is refused.
  let coupon: { code: string; discount: number } | null = null;
  if (req.coupon?.code) {
    try {
      const used = await couponsApi.redeem({ code: req.coupon.code, service: 'BIKE', orderPaise: (plain.grossTotal ?? plain.total) * 100, bookingRef: reference });
      coupon = { code: used.code, discount: Math.floor(used.discountPaise / 100) };
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 400) throw new BikeApiError('COUPON_INVALID', couponErrorMessage(e));
      throw new BikeApiError('NETWORK', 'We could not confirm your coupon right now. Please try again in a moment.');
    }
  }
  const quote = coupon ? (computeQuote({ bike, schedule: req.schedule, extras, coupon }) ?? plain) : plain;
  return {
    reference,
    status: 'confirmed-demo',
    createdAt: new Date().toISOString(),
    request: req,
    bike,
    pickup,
    returnLocation,
    extras,
    quote,
    payment: {
      method: req.payment.method,
      label: PAYMENT_METHODS[req.payment.method].label,
      amountPaid: amountDueNow(req.payment.method, quote),
      status: req.payment.method === 'pay-at-pickup' ? 'pay-at-pickup' : 'demo-paid',
    },
  };
}

export const bikesApi = { listBikes, getBike, listLocations, listReviews, createBooking };
