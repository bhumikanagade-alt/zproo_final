import type { TrainClass, TrainQuota } from './enums';
import type { PriceBreakdown } from './flights';

/*
 * Railway (train) booking types shared by the web app and API.
 *
 * Every value here comes from the configured railway provider. The development provider
 * (`provider: "mock"`) returns invented trains and simulated availability; responses carry
 * `demo: true` and the UI labels them as such.
 */

export const BerthPreference = {
  NO_PREFERENCE: 'NO_PREFERENCE',
  LOWER: 'LOWER',
  MIDDLE: 'MIDDLE',
  UPPER: 'UPPER',
  SIDE_LOWER: 'SIDE_LOWER',
  SIDE_UPPER: 'SIDE_UPPER',
  WINDOW: 'WINDOW',
} as const;
export type BerthPreference = (typeof BerthPreference)[keyof typeof BerthPreference];

export const BERTH_PREFERENCE_LABELS: Record<BerthPreference, string> = {
  NO_PREFERENCE: 'No preference',
  LOWER: 'Lower',
  MIDDLE: 'Middle',
  UPPER: 'Upper',
  SIDE_LOWER: 'Side lower',
  SIDE_UPPER: 'Side upper',
  WINDOW: 'Window seat',
};

export const FoodChoice = {
  VEG: 'VEG',
  NON_VEG: 'NON_VEG',
  NO_FOOD: 'NO_FOOD',
} as const;
export type FoodChoice = (typeof FoodChoice)[keyof typeof FoodChoice];

export const FOOD_CHOICE_LABELS: Record<FoodChoice, string> = {
  VEG: 'Veg',
  NON_VEG: 'Non-veg',
  NO_FOOD: 'No food',
};

/** Seat/berth availability for one class and quota, as the provider reports it. */
export type TrainAvailabilityStatus =
  'AVAILABLE' | 'RAC' | 'WAITLIST' | 'REGRET' | 'NOT_AVAILABLE' | 'BOOKING_CLOSED';

export interface TrainAvailability {
  status: TrainAvailabilityStatus;
  /** Berths available (AVAILABLE) or the next position (RAC / WAITLIST); null otherwise. */
  count: number | null;
  /** Label exactly as the provider reports it, e.g. "AVL 42", "RAC 6", "GNWL 23", "REGRET". */
  label: string;
  /** False when the class cannot be booked right now (regret, closed, quota not open). */
  bookable: boolean;
  /** Why it cannot be booked, or other provider notes. */
  note: string | null;
  /** When the provider reported this availability (ISO instant). */
  checkedAt: string;
}

/** Fare for one passenger, in paise, split the way the provider quotes it. */
export interface TrainFare {
  basePaise: number;
  reservationPaise: number;
  superfastPaise: number;
  tatkalPaise: number;
  gstPaise: number;
  totalPaise: number;
}

export interface TrainClassOption {
  travelClass: TrainClass;
  quota: TrainQuota;
  availability: TrainAvailability;
  /** Per-passenger fare; null when the provider does not quote this class. */
  fare: TrainFare | null;
}

export interface TrainStop {
  code: string;
  name: string;
  /** Local (IST) time "HH:MM"; null where the train starts. */
  arrival: string | null;
  /** Local (IST) time "HH:MM"; null where the train ends. */
  departure: string | null;
  /** Day of the run, 1 = the day the train leaves its first station. */
  day: number;
  /** Distance from the train's first station. */
  distanceKm: number;
}

export interface TrainOffer {
  /** Opaque, provider-scoped; pass back to refresh availability, quote or book. */
  id: string;
  provider: string;
  trainNumber: string;
  trainName: string;
  /** e.g. "Superfast", "Express", "Shatabdi-class" */
  trainType: string;
  from: { code: string; name: string };
  to: { code: string; name: string };
  /** Boarding date (IST) at `from`, YYYY-MM-DD */
  date: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  distanceKm: number;
  /** ISO weekdays (1 = Monday … 7 = Sunday) on which the train leaves `from`. */
  runningDays: number[];
  /** Catering on board (food choice is only offered where the provider supports it). */
  pantry: boolean;
  /** Stops from `from` to `to`, both included, when the provider supplies the route. */
  stops: TrainStop[];
  /** Classes this train runs, with availability and fare for the searched quota. */
  classes: TrainClassOption[];
}

/** What the configured railway provider supports. The UI only offers what is listed here. */
export interface TrainCapabilities {
  provider: string;
  /** Development provider: invented trains, simulated availability, no real tickets. */
  demo: boolean;
  quotas: TrainQuota[];
  classes: TrainClass[];
  maxPassengers: number;
  maxTatkalPassengers: number;
  /** Days ahead reservations open (Indian Railways: 60 from 1 Nov 2024). */
  advanceReservationDays: number;
  berthPreference: boolean;
  foodChoice: boolean;
  /** "Book only if confirmed berths are available" */
  confirmOnlyOption: boolean;
  /** Per-passenger identity details at booking. When false, none are collected or stored. */
  idRequired: boolean;
  cancellation: boolean;
  partialCancellation: boolean;
  liveStatus: boolean;
}

export interface TrainSearchResult {
  from: string;
  to: string;
  date: string;
  quota: TrainQuota;
  travelClass: TrainClass | 'ALL';
  passengers: number;
  trains: TrainOffer[];
  /** True when results come from the development provider, not a railway system. */
  demo: boolean;
  capabilities: TrainCapabilities;
}

export interface StationSuggestion {
  code: string;
  name: string;
  city: string;
  state: string;
}

/** Server-calculated price for a class/quota and passenger count. The browser never sets prices. */
export interface TrainQuote {
  offerId: string;
  travelClass: TrainClass;
  quota: TrainQuota;
  passengers: number;
  availability: TrainAvailability;
  perPassenger: TrainFare;
  price: PriceBreakdown;
  quotedAt: string;
  /** Plain-language warnings to show before booking (RAC, waitlist, chart rules). */
  warnings: string[];
  demo: boolean;
}

/** Where the reservation stands with the railway system. */
export type TrainReservationStatus =
  'PENDING' | 'BOOKED' | 'FAILED' | 'CANCELLED' | 'PARTIALLY_CANCELLED';

export type TrainPassengerStatus = 'PENDING' | 'CONFIRMED' | 'RAC' | 'WAITLIST' | 'CANCELLED';

export interface TrainPassengerBooking {
  /** BookingPassengerInfo.id of this traveller */
  passengerId: string;
  berthPreference: BerthPreference;
  foodChoice: FoodChoice | null;
  status: TrainPassengerStatus;
  /** Status when booked, as the provider reports it, e.g. "CNF/B2/34/LOWER", "RAC 4", "GNWL 12". */
  bookingStatus: string | null;
  /** Latest status from the provider. */
  currentStatus: string | null;
  coach: string | null;
  berth: string | null;
  berthType: string | null;
  farePaise: number;
  cancelledAt: string | null;
}

export type RefundStatus = 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface RefundInfo {
  id: string;
  amountPaise: number;
  status: RefundStatus;
  reason: string;
  /** Gateway refund reference, once the gateway accepts it. */
  gatewayReference: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface TrainCancellationInfo {
  id: string;
  passengerIds: string[];
  status: 'REQUESTED' | 'COMPLETED' | 'FAILED';
  chargesPaise: number;
  refundPaise: number;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface TrainCancellationQuote {
  eligible: boolean;
  /** Why cancellation is not possible (when not eligible). */
  reason: string | null;
  passengerIds: string[];
  farePaise: number;
  chargesPaise: number;
  refundPaise: number;
  /** The provider's cancellation rules, as text to show the customer. */
  rules: string[];
  demo: boolean;
}

export interface TrainBookingInfo {
  /** Train as sold (the booked class only). */
  offer: TrainOffer;
  travelClass: TrainClass;
  quota: TrainQuota;
  confirmOnly: boolean;
  provider: string;
  /** Railway PNR, once the provider issues one. */
  pnr: string | null;
  /** The provider's own transaction reference. */
  providerReference: string | null;
  reservationStatus: TrainReservationStatus;
  /** e.g. "Chart not prepared" — exactly as the provider reports it. */
  chartStatus: string | null;
  lastCheckedAt: string | null;
  failureReason: string | null;
  /** Per-passenger fare as quoted at booking. */
  fare: TrainFare;
  passengers: TrainPassengerBooking[];
  cancellations: TrainCancellationInfo[];
  refunds: RefundInfo[];
  capabilities: Pick<TrainCapabilities, 'cancellation' | 'partialCancellation' | 'liveStatus'>;
}

export interface TrainLiveStatusStation {
  code: string;
  name: string;
  scheduledArrival: string | null;
  scheduledDeparture: string | null;
  actualArrival: string | null;
  actualDeparture: string | null;
  delayMinutes: number | null;
}

/** Running status. When `supported` is false nothing else is meaningful (no data is invented). */
export interface TrainLiveStatus {
  supported: boolean;
  trainNumber: string;
  date: string;
  message: string;
  lastUpdatedAt: string | null;
  /** True when the provider's data is older than the freshness window. */
  stale: boolean;
  state: 'NOT_STARTED' | 'RUNNING' | 'ARRIVED' | null;
  currentStation: { code: string; name: string } | null;
  delayMinutes: number | null;
  stations: TrainLiveStatusStation[];
}
