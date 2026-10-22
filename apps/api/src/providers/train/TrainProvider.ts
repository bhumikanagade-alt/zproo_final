import type {
  BerthPreference,
  FoodChoice,
  StationSuggestion,
  TrainCapabilities,
  TrainClass,
  TrainLiveStatus,
  TrainOffer,
  TrainQuota,
} from '@zproo/types';

export interface TrainSearchQuery {
  /** Station codes */
  from: string;
  to: string;
  /** Boarding date (IST), YYYY-MM-DD */
  date: string;
  quota: TrainQuota;
  /** Only this class, when set */
  travelClass?: TrainClass | undefined;
}

export interface ProviderPassenger {
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  berthPreference: BerthPreference;
  foodChoice: FoodChoice | null;
}

export interface ProviderBookingRequest {
  /**
   * Our booking reference. Providers must treat it as an idempotency key: booking the same
   * reference twice returns the first result instead of reserving twice.
   */
  clientReference: string;
  offerId: string;
  travelClass: TrainClass;
  quota: TrainQuota;
  passengers: ProviderPassenger[];
  /** Book only if every passenger gets a confirmed berth. */
  confirmOnly: boolean;
  contact: { email: string; phone: string };
}

export interface ProviderPassengerStatus {
  status: 'CONFIRMED' | 'RAC' | 'WAITLIST' | 'CANCELLED';
  /** Status when booked, e.g. "CNF/B2/34/LOWER" or "GNWL 12" */
  bookingStatus: string;
  /** Latest status */
  currentStatus: string;
  coach: string | null;
  berth: string | null;
  berthType: string | null;
}

/** Outcome of a booking or status call. `PENDING` means the provider has not decided yet. */
export type ProviderBookingResult =
  | {
      outcome: 'BOOKED';
      pnr: string;
      providerReference: string;
      chartStatus: string | null;
      passengers: ProviderPassengerStatus[];
    }
  | { outcome: 'PENDING'; providerReference: string | null; message: string }
  | { outcome: 'FAILED'; providerReference: string | null; reason: string };

export interface ProviderBookingRef {
  clientReference: string;
  providerReference: string | null;
  pnr: string | null;
}

export interface CancellationQuoteRequest {
  travelClass: TrainClass;
  quota: TrainQuota;
  departureAt: Date;
  passengers: {
    status: 'CONFIRMED' | 'RAC' | 'WAITLIST';
    farePaise: number;
  }[];
}

export type CancellationQuoteResult =
  | { eligible: true; chargesPaise: number; refundPaise: number; rules: string[] }
  | { eligible: false; reason: string; rules: string[] };

export interface ProviderCancellationRequest extends ProviderBookingRef {
  /** Our cancellation id; providers must treat it as an idempotency key. */
  cancellationReference: string;
  /** 1-based positions of the passengers on the ticket */
  passengerNumbers: number[];
}

export type ProviderCancellationResult =
  | {
      outcome: 'CANCELLED';
      providerCancellationId: string;
      refundPaise: number;
      chargesPaise: number;
    }
  | { outcome: 'PENDING'; providerCancellationId: string | null; message: string }
  | { outcome: 'FAILED'; reason: string };

/**
 * An authorised railway reservation supplier. The booking engine depends only on this interface;
 * select the implementation with TRAIN_PROVIDER. Provider-specific HTTP, auth and payload shapes
 * stay inside the adapter.
 *
 * Indian Railways tickets may only be sold through IRCTC or one of its authorised partners
 * (principal / retail service providers). A public timetable or PNR-lookup API does not grant the
 * right to book — see docs/RAILWAY_PROVIDER.md.
 */
export interface TrainProvider {
  readonly name: string;
  /** True for development inventory that must never be sold as real travel. */
  readonly isDemo: boolean;
  capabilities(): TrainCapabilities;
  searchStations(query: string, limit: number): Promise<StationSuggestion[]>;
  search(query: TrainSearchQuery): Promise<TrainOffer[]>;
  /** Fresh availability and fares for one offer, or null if the train no longer runs it. */
  getOffer(
    offerId: string,
    quota: TrainQuota,
    travelClass?: TrainClass,
  ): Promise<TrainOffer | null>;
  /** Reserve after payment. Must be idempotent on `clientReference`. */
  book(request: ProviderBookingRequest): Promise<ProviderBookingResult>;
  /** Current state of a booking (pending outcome, chart and passenger status). */
  status(ref: ProviderBookingRef): Promise<ProviderBookingResult>;
  cancellationQuote(request: CancellationQuoteRequest): Promise<CancellationQuoteResult>;
  cancel(request: ProviderCancellationRequest): Promise<ProviderCancellationResult>;
  /** Running status; returns `supported: false` when the provider has no live data. */
  liveStatus(trainNumber: string, date: string): Promise<TrainLiveStatus>;
}
