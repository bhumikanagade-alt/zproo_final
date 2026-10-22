import type { FlightOffer, FlightSearchResult } from '@zproo/types';
import type { FlightSearch } from '@zproo/validation';
import type { FlightProvider } from '../providers/flight';
import type { CacheService } from './cache.service';
import type { PaxCounts } from './flightPricing';

/** Short, because availability changes as people book; the booking re-checks price anyway. */
const SEARCH_CACHE_SECONDS = 60;

export class FlightService {
  constructor(
    private readonly provider: FlightProvider,
    private readonly cache: CacheService,
  ) {}

  get isDemo(): boolean {
    return this.provider.isDemo;
  }

  async search(search: FlightSearch): Promise<FlightSearchResult> {
    const pax: PaxCounts = {
      adults: search.adults,
      children: search.children,
      infants: search.infants,
    };
    const legs =
      search.tripType === 'ROUND_TRIP' && search.returnDate && search.legs[0]
        ? [
            search.legs[0],
            { from: search.legs[0].to, to: search.legs[0].from, date: search.returnDate },
          ]
        : search.legs;

    const results = await Promise.all(
      legs.map(async (leg) => {
        const key = `flights:search:v1:${this.provider.name}:${leg.from}:${leg.to}:${leg.date}:${search.cabin}:${pax.adults}.${pax.children}.${pax.infants}`;
        const offers = await this.cache.getOrSet(key, SEARCH_CACHE_SECONDS, () =>
          this.provider.search({
            from: leg.from,
            to: leg.to,
            date: leg.date,
            cabin: search.cabin,
            pax,
          }),
        );
        return { from: leg.from, to: leg.to, date: leg.date, offers };
      }),
    );
    return { legs: results, passengers: pax, cabin: search.cabin, demo: this.provider.isDemo };
  }

  getOffer(offerId: string, pax: PaxCounts): Promise<FlightOffer | null> {
    return this.provider.getOffer(offerId, pax);
  }
}
