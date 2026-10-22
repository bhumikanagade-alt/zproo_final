import type { BusSeatMap, BusTripOffer } from '@zproo/types';
import type { Db } from '../../repositories/db';

export interface BusSearchQuery {
  /** City codes from @zproo/config */
  from: string;
  to: string;
  /** Travel date (IST), YYYY-MM-DD */
  date: string;
}

/**
 * A bus inventory supplier (aggregator or operator API). The booking engine depends only on this
 * interface; select the implementation with BUS_PROVIDER.
 *
 * `hold`/`release` take the booking's database transaction so a provider that keeps inventory
 * locally (the mock) can hold seats atomically with the booking; remote providers ignore it.
 */
export interface BusProvider {
  readonly name: string;
  /** True for development inventory that must never be sold as real travel. */
  readonly isDemo: boolean;
  search(query: BusSearchQuery): Promise<BusTripOffer[]>;
  /** Current details of a trip, or null if it is no longer sold. */
  getTrip(tripId: string): Promise<BusTripOffer | null>;
  /** Seat layout with live availability and per-seat prices. */
  seatMap(tripId: string): Promise<BusSeatMap | null>;
  /** Hold these seats for a booking; throws SeatUnavailableError if any is taken. */
  hold(
    tripId: string,
    seatNumbers: string[],
    bookingId: string,
    db: Db,
  ): Promise<{ localTripId: string | null }>;
  release(bookingId: string, db: Db): Promise<void>;
  /** Confirm a paid booking with the operator. */
  issue(tripId: string, seatNumbers: string[]): Promise<{ pnr: string }>;
}
