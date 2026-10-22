/** Where a bus picks up or drops off, with the scheduled time there. */
export interface BusPoint {
  id: string;
  name: string;
  address: string;
  /** ISO 8601 instant */
  time: string;
}

export type BusType = 'SEATER' | 'SLEEPER' | 'SEATER_SLEEPER';
export type BusDeck = 'LOWER' | 'UPPER';

export interface BusCancellationRule {
  /** Applies when cancelling at least this many hours before departure (0 = up to departure). */
  hoursBefore: number;
  /** Share of the fare refunded, in percent. */
  refundPercent: number;
}

export interface BusTripOffer {
  /** Opaque, provider-scoped; pass back to fetch seats or book. */
  id: string;
  provider: string;
  serviceNumber: string;
  operator: { code: string; name: string; rating: number; ratingCount: number };
  bus: { name: string; type: BusType; ac: boolean; electric: boolean };
  from: { code: string; name: string };
  to: { code: string; name: string };
  /** Travel date (IST) of the first boarding point, YYYY-MM-DD */
  date: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  distanceKm: number;
  amenities: string[];
  /** Cheapest available seat including taxes */
  fromPaise: number;
  seatsAvailable: number;
  totalSeats: number;
  boardingPoints: BusPoint[];
  droppingPoints: BusPoint[];
  cancellationPolicy: BusCancellationRule[];
}

export interface BusSeatInfo {
  number: string;
  deck: BusDeck;
  row: number;
  column: number;
  kind: 'SEATER' | 'SLEEPER';
  available: boolean;
  /** Reserved for women travellers */
  ladiesOnly: boolean;
  basePaise: number;
  taxPaise: number;
  pricePaise: number;
}

export interface BusSeatMap {
  tripId: string;
  decks: { deck: BusDeck; rows: number; columns: number; seats: BusSeatInfo[] }[];
  /** Most seats one booking may take */
  maxSeats: number;
}

export interface BusSearchResult {
  from: string;
  to: string;
  date: string;
  trips: BusTripOffer[];
  /** True when results come from the development provider, not real operator inventory. */
  demo: boolean;
}

/** What cancelling a bus booking would cost and refund right now (before the customer confirms). */
export interface BusCancellationQuote {
  eligible: boolean;
  /** Why it cannot be cancelled (when `eligible` is false). */
  reason: string | null;
  /** True when money was captured, so a refund applies. False for an unpaid booking. */
  paid: boolean;
  farePaise: number;
  /** Share of the fare that is refunded, in percent. */
  refundPercent: number;
  chargesPaise: number;
  refundPaise: number;
  /** Whole hours left before departure (negative once departed). */
  hoursBeforeDeparture: number;
  rules: BusCancellationRule[];
}

export interface BusBookingInfo {
  offer: BusTripOffer;
  seatNumbers: string[];
  boardingPoint: BusPoint;
  droppingPoint: BusPoint;
  /** Operator ticket/PNR number, set on confirmation */
  pnr: string | null;
}
