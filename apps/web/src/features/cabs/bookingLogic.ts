import { calcFare, cancellationFee, canCancel, generateReference, routeFor, getVehicle, scheduledTimestamp } from './fare';
import type { CabBooking, PassengerDetails, PaymentMethod, PaymentOutcome, PickupPoint, RideMode, TrackStage, VehicleId } from './types';

export interface CabDraft {
  pickup: string;
  drop: string;
  mode: RideMode;
  /** Round trip / outstation: when the passenger is picked up again (outstation: optional). */
  returnDate?: string;
  returnTime?: string;
  /** Hourly rental package length. */
  rentalHours?: number;
  /** Airport transfer direction. */
  airportDir?: 'to' | 'from';
  date: string;
  time: string;
  passengers: number;
  request: string;
  vehicleId: VehicleId | null;
  pickupPoint: PickupPoint;
  passenger: PassengerDetails;
  couponCode: string | null;
  /** Whole rupees off from a coupon made in the admin panel (null for built-in codes or no coupon). */
  couponDiscount?: number | null;
  paymentMethod: PaymentMethod;
  routeInfo: { key: string; km: number; minutes: number } | null;
}

export const STAGES: readonly TrackStage[] = ['searching', 'assigned', 'arriving', 'arrived', 'started', 'completed'];

export function createBooking(draft: CabDraft, existingRefs: ReadonlySet<string>, now = Date.now(), rand?: () => number, reference?: string): CabBooking {
  if (!draft.vehicleId) throw new Error('Choose a ride before booking');
  const vehicle = getVehicle(draft.vehicleId);
  const route = routeFor(draft);
  return {
    reference: reference && !existingRefs.has(reference) ? reference : generateReference(existingRefs, rand),
    createdAt: now,
    status: 'upcoming',
    vehicleId: vehicle.id,
    mode: draft.mode,
    pickup: draft.pickup,
    drop: draft.mode === 'rental' ? `Hourly rental · ${draft.rentalHours ?? 4} hrs (no fixed drop)` : draft.drop,
    pickupPoint: draft.pickupPoint,
    date: draft.date,
    time: draft.time,
    scheduledAt: scheduledTimestamp(draft.date, draft.time),
    route,
    fare: calcFare(vehicle, route, draft.couponCode, draft.couponDiscount),
    couponCode: draft.couponCode,
    paymentMethod: draft.paymentMethod,
    passenger: draft.passenger,
    stage: 'searching',
  };
}

export function cancelBooking(b: CabBooking, reason: string, comment: string, now = Date.now()): CabBooking {
  if (!canCancel(b)) throw new Error(`A ${b.status} ride cannot be cancelled`);
  return { ...b, status: 'cancelled', cancellation: { reason, comment, fee: cancellationFee(b, now), at: now } };
}

/** Moves a ride one step along the simulated tracking stages and keeps `status` consistent. */
export function advanceStage(b: CabBooking): CabBooking {
  if (b.status === 'cancelled' || b.status === 'completed') return b;
  const next = STAGES[Math.min(STAGES.indexOf(b.stage) + 1, STAGES.length - 1)]!;
  const status = next === 'completed' ? 'completed' : next === 'started' ? 'ongoing' : b.status;
  return { ...b, stage: next, status };
}

export function rateBooking(b: CabBooking, stars: number, feedback: string): CabBooking {
  if (b.status !== 'completed') throw new Error('Only completed rides can be rated');
  return { ...b, rating: { stars: Math.min(5, Math.max(1, Math.round(stars))), feedback } };
}

/** Demo-only payment. Never contacts a payment provider. */
export function simulatePayment(outcome: PaymentOutcome, delayMs = 1400): Promise<PaymentOutcome> {
  return new Promise((resolve) => setTimeout(() => resolve(outcome), delayMs));
}
