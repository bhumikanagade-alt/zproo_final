/**
 * Bike Booking domain types.
 *
 * These mirror the shape the future backend API is expected to return. Components only ever
 * depend on these types (never on the mock files), so swapping in real endpoints is a change
 * to `api.ts` alone.
 */

export type BikeCategory = 'scooter' | 'commuter' | 'sports' | 'cruiser' | 'adventure' | 'electric';
export type Transmission = 'manual' | 'automatic';
export type FuelType = 'petrol' | 'electric';
export type AvailabilityStatus = 'available' | 'limited' | 'unavailable';

export interface BikeImage {
  src: string;
  alt: string;
}

export interface BikePricing {
  currency: 'INR';
  /** Per hour, used for rentals shorter than a day. */
  hourly: number;
  /** Per 24 hours. */
  daily: number;
  /** Minimum billable hours for any rental. */
  minHours: number;
  /** Kilometres included per rental day. */
  kmPerDay: number;
  /** Charge per kilometre beyond the included distance. */
  extraKmCharge: number;
}

export interface BikeAvailability {
  status: AvailabilityStatus;
  /** Units left across the network (display only; the real count comes from the backend). */
  unitsLeft: number;
  /** Pickup locations that currently stock this bike. */
  locationIds: string[];
}

export interface BikeSpecs {
  engine: string;
  power: string;
  /** Mileage (petrol) or certified range (electric). */
  efficiency: string;
  topSpeed: string;
  fuelCapacity: string;
  weight: string;
  seatHeight: string;
  seats: number;
  brakes: string;
}

export interface Bike {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  category: BikeCategory;
  transmission: Transmission;
  fuelType: FuelType;
  description: string;
  rating: number;
  reviewCount: number;
  tag?: 'Most popular' | 'Best value' | 'New';
  images: BikeImage[];
  specs: BikeSpecs;
  features: string[];
  pricing: BikePricing;
  securityDeposit: number;
  fuelPolicy: string;
  includedServices: string[];
  availability: BikeAvailability;
}

export interface PickupLocation {
  id: string;
  /** City the hub is in; the rider picks this first, then an area (hub) inside it. */
  city: string;
  name: string;
  area: string;
  address: string;
  landmark: string;
  /** Opening hours as 24h "HH:mm" strings. */
  opensAt: string;
  closesAt: string;
  contact: string;
}

export interface RentalExtra {
  id: string;
  label: string;
  description: string;
  /** Charged per rental day. */
  perDay: number;
}

export interface BikeReview {
  id: string;
  bikeId: string;
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  /** ISO date, e.g. 2026-09-14. */
  date: string;
  /** Free text, e.g. "2-day rental". */
  tripType: string;
}

/* ───────────── Search / filters ───────────── */

export interface RentalSchedule {
  /** Chosen on the search step. The pickup/return areas (hubs) are then picked within this city. */
  pickupCity: string;
  pickupLocationId: string;
  returnLocationId: string;
  pickupDate: string; // yyyy-mm-dd
  pickupTime: string; // HH:mm
  returnDate: string;
  returnTime: string;
}

export type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'rating';

export interface BikeFilters {
  query: string;
  categories: BikeCategory[];
  transmission: Transmission | 'any';
  /** Maximum price per day (INR). */
  maxDailyPrice: number;
  onlyAvailable: boolean;
  sort: SortKey;
  /** Only bikes stocked at this pickup location. */
  pickupLocationId?: string;
  /** Only bikes stocked at one or more hubs in this city. */
  pickupCity?: string;
}

/* ───────────── Booking ───────────── */

export interface CustomerDetails {
  fullName: string;
  mobile: string;
  email: string;
  licenceNumber: string;
  dateOfBirth: string; // yyyy-mm-dd
  address: string;
  gender?: string;
}

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'pay-at-pickup';

/** Payment outcome stored with a mock booking. Never contains card, UPI or bank details. */
export interface PaymentSummary {
  method: PaymentMethod;
  label: string;
  /** Amount charged now (INR). 0 for pay-at-pickup. Demo only: no money moves. */
  amountPaid: number;
  status: 'demo-paid' | 'pay-at-pickup';
}

export interface BookingRequest {
  bikeId: string;
  schedule: RentalSchedule;
  extraIds: string[];
  customer: CustomerDetails;
  notes: string;
  acceptedTerms: boolean;
  /** Only the chosen method travels with the request; payment details stay in the payment form. */
  payment: { method: PaymentMethod; simulateDecline: boolean };
  /** A coupon made in the admin panel (Marketing → Coupons). The server re-checks it and records its use when booking. */
  coupon?: { code: string } | null;
}

export interface QuoteLine {
  label: string;
  amount: number;
  /** Rendered as a deduction. */
  negative?: boolean;
}

export interface RentalQuote {
  /** Real elapsed hours between pickup and return. */
  elapsedHours: number;
  /** Hours actually billed (after the minimum is applied). */
  billableHours: number;
  /** Rental days counted for extras and the kilometre allowance (24h blocks, rounded up). */
  rentalDays: number;
  fullDays: number;
  extraHours: number;
  kmIncluded: number;
  lines: QuoteLine[];
  rentalCharge: number;
  discount: number;
  extrasTotal: number;
  oneWayFee: number;
  subtotal: number;
  tax: number;
  /** Rental total before any coupon (rental + add-ons + fees + GST; excludes the refundable security deposit). */
  grossTotal?: number;
  /** Coupon from the admin panel and the whole rupees it takes off `grossTotal` (absent on older saved bookings). */
  couponCode?: string | null;
  couponDiscount?: number;
  /** Estimated rental total after any coupon (excludes the refundable security deposit). */
  total: number;
  deposit: number;
}

export interface BikeBooking {
  reference: string;
  /** Always "confirmed (demo)": no inventory is held and no payment is taken. */
  status: 'confirmed-demo';
  createdAt: string;
  request: BookingRequest;
  bike: Bike;
  pickup: PickupLocation;
  returnLocation: PickupLocation;
  extras: RentalExtra[];
  quote: RentalQuote;
  /** Missing on bookings saved before the payment step existed. */
  payment?: PaymentSummary;
}

/* ───────────── Errors ───────────── */

export type BikeApiErrorCode = 'NETWORK' | 'NOT_FOUND' | 'VALIDATION' | 'PAYMENT_DECLINED' | 'COUPON_INVALID' | 'SERVER';

export class BikeApiError extends Error {
  readonly code: BikeApiErrorCode;
  constructor(code: BikeApiErrorCode, message: string) {
    super(message);
    this.name = 'BikeApiError';
    this.code = code;
  }
}
