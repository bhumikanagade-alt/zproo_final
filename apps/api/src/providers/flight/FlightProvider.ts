import type { CabinClass, FlightOffer } from '@zproo/types';
import type { Db } from '../../repositories/db';
import type { PaxCounts } from '../../services/flightPricing';

export interface FlightLegQuery {
  from: string;
  to: string;
  /** Local departure date at the origin, YYYY-MM-DD. */
  date: string;
  cabin: CabinClass;
  pax: PaxCounts;
}

export interface IssuedTickets {
  pnr: string;
  /** One per passenger, in the order given. */
  ticketNumbers: string[];
}

/**
 * A flight supplier (GDS, NDC or airline API). The booking engine depends only on this
 * interface; select the implementation with FLIGHT_PROVIDER.
 *
 * `hold`/`release` take the booking's database transaction so a provider that keeps inventory
 * locally (the mock) can hold seats atomically with the booking; remote providers ignore it.
 */
export interface FlightProvider {
  readonly name: string;
  /** True for development inventory that must never be sold as real travel. */
  readonly isDemo: boolean;
  search(query: FlightLegQuery): Promise<FlightOffer[]>;
  /** Current price and availability of an offer, or null if it no longer exists. */
  getOffer(offerId: string, pax: PaxCounts): Promise<FlightOffer | null>;
  /** Reserve seats; throws SoldOutError if there aren't enough. */
  hold(offerId: string, seats: number, db: Db): Promise<void>;
  release(offerId: string, seats: number, db: Db): Promise<void>;
  /** Ticket a paid booking with the airline. */
  issue(
    offerId: string,
    passengers: { firstName: string; lastName: string }[],
  ): Promise<IssuedTickets>;
}
