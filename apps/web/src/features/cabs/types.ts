export type VehicleId = 'bike' | 'auto' | 'mini' | 'sedan' | 'suv' | 'premium';
export type RideMode = 'one-way' | 'round-trip' | 'outstation' | 'airport' | 'rental';
export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'cash';
export type BookingStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type TrackStage = 'searching' | 'assigned' | 'arriving' | 'arrived' | 'started' | 'completed';
export type PaymentOutcome = 'success' | 'failed' | 'cancelled';

export interface CabLocation {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
}

export interface Vehicle {
  id: VehicleId;
  label: string;
  seats: number;
  bags: number;
  luggageLabel: string;
  ac: boolean;
  pickupMin: number;
  baseFare: number;
  perKm: number;
  perMin: number;
  /** Average speed used for the estimated journey time. */
  speedKmh: number;
  tag?: 'Most popular' | 'Best value';
}

export interface RouteEstimate {
  km: number;
  minutes: number;
}

export interface FareBreakdown {
  base: number;
  distance: number;
  time: number;
  platform: number;
  taxes: number;
  discount: number;
  total: number;
}

export interface Coupon {
  code: string;
  kind: 'flat' | 'percent';
  value: number;
  maxDiscount?: number;
  minSubtotal?: number;
  label: string;
}

export interface PassengerDetails {
  name: string;
  mobile: string;
  email: string;
  count: number;
  instructions: string;
  pickupNotes: string;
}

export interface PickupPoint {
  id: string;
  name: string;
  address: string;
}

export interface CabBooking {
  reference: string;
  createdAt: number;
  status: BookingStatus;
  vehicleId: VehicleId;
  mode: RideMode;
  pickup: string;
  drop: string;
  pickupPoint: PickupPoint;
  /** ISO date (yyyy-mm-dd) and 24-hour time (HH:mm). */
  date: string;
  time: string;
  scheduledAt: number;
  route: RouteEstimate;
  fare: FareBreakdown;
  couponCode: string | null;
  paymentMethod: PaymentMethod;
  passenger: PassengerDetails;
  stage: TrackStage;
  cancellation?: { reason: string; comment: string; fee: number; at: number };
  rating?: { stars: number; feedback: string };
}
