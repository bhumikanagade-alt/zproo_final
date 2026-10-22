import type { BusBookingInfo } from './buses';
import type { TrainBookingInfo } from './trains';
import type { BookingStatus, CabinClass, PaymentStatus } from './enums';

export interface AirportInfo {
  code: string;
  city: string;
  name: string;
  country: string;
  /** IANA time zone; flight times are shown in the airport's local time. */
  timezone: string;
}

export interface AirlineInfo {
  code: string;
  name: string;
}

export interface FlightSegmentInfo {
  airline: AirlineInfo;
  flightNumber: string;
  from: AirportInfo;
  to: AirportInfo;
  /** ISO 8601 instant (UTC). */
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  aircraft: string;
}

export interface PaxFare {
  basePaise: number;
  taxesPaise: number;
  totalPaise: number;
}

export type PassengerType = 'ADULT' | 'CHILD' | 'INFANT';

export interface PaxCounts {
  adults: number;
  children: number;
  infants: number;
}

export interface FlightOffer {
  /** Opaque, provider-scoped; pass back to fetch or book the offer. */
  id: string;
  provider: string;
  airline: AirlineInfo;
  flightNumber: string;
  from: AirportInfo;
  to: AirportInfo;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  stops: number;
  segments: FlightSegmentInfo[];
  layovers: { airport: AirportInfo; minutes: number }[];
  cabin: CabinClass;
  fareFamily: string;
  refundable: boolean;
  /** Airline cancellation charge per passenger, or null when non-refundable. */
  cancellationFeePaise: number | null;
  baggage: { cabinKg: number; checkInKg: number };
  seatsLeft: number;
  fares: Record<PassengerType, PaxFare>;
  /** Price for the passengers in the search. */
  totalPaise: number;
}

export interface FlightSearchLeg {
  from: string;
  to: string;
  date: string;
  offers: FlightOffer[];
}

export interface FlightSearchResult {
  legs: FlightSearchLeg[];
  passengers: { adults: number; children: number; infants: number };
  cabin: CabinClass;
  /** True when results come from the development provider, not real airline inventory. */
  demo: boolean;
}

export interface PriceLine {
  label: string;
  amountPaise: number;
}

export interface PriceBreakdown {
  lines: PriceLine[];
  basePaise: number;
  taxesPaise: number;
  feesPaise: number;
  discountPaise: number;
  totalPaise: number;
  currency: 'INR';
}

/**
 * Paid extras chosen after traveller details. Keys are `"<sector>|<passenger>"` for seats and
 * meals (sector = `"<leg>.<segment>"`, e.g. `"0.1"` is the second flight of the first journey leg)
 * and `"<leg>|<passenger>"` for baggage. `<passenger>` is the traveller's index in the booking.
 */
export interface FlightAddOnsSelection {
  seats: Record<string, string>;
  meals: Record<string, string>;
  baggage: Record<string, string>;
}

export interface BookingPassengerInfo {
  id: string;
  type: PassengerType;
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  /** Age on the travel date, where the service asks for age (buses) */
  age: number | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  /** Seat assigned to this traveller (buses) */
  seatNumber: string | null;
}

export interface FlightBookingLeg {
  sequence: number;
  offer: FlightOffer;
  pnr: string | null;
  tickets: { passengerId: string; ticketNumber: string }[];
}

export interface BookingDetails {
  reference: string;
  serviceType: 'FLIGHT' | 'BUS' | 'TRAIN';
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  holdExpiresAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  travelDate: string;
  price: PriceBreakdown;
  contact: { email: string; phone: string };
  passengers: BookingPassengerInfo[];
  /** Flight legs (flight bookings; empty otherwise) */
  flights: FlightBookingLeg[];
  /** Bus journey (bus bookings; null otherwise) */
  bus: BusBookingInfo | null;
  /** Train journey, reservation status, PNR, cancellations and refunds (train bookings only). */
  train?: TrainBookingInfo | null;
  /** Seats, meals and extra baggage bought with a flight booking. */
  addOns?: FlightAddOnsSelection;
}

export interface BookingListItem {
  reference: string;
  serviceType: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  title: string;
  subtitle: string;
  travelDate: string;
  totalPaise: number;
  createdAt: string;
  /** When the booking was cancelled (cancelled, refund pending or refunded bookings). */
  cancelledAt?: string | null;
  /** Service-specific status shown instead of the generic one, e.g. "Booked · GNWL 12" for trains. */
  statusLabel?: string;
}

export interface PaymentOrder {
  paymentId: string;
  provider: string;
  providerOrderId: string;
  amountPaise: number;
  currency: 'INR';
  /** Public key for the provider's checkout (never a secret). */
  publicKey: string | null;
  bookingReference: string;
  holdExpiresAt: string | null;
}
