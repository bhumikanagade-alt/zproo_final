import type { BusSearchResult, BusSeatMap, BusTripOffer } from '@zproo/types';
import type { BusSearch } from '@zproo/validation';
import type { BusProvider } from '../providers/bus';
import type { CacheService } from './cache.service';

/** Short, because seats sell as people book; the seat map and booking re-check live. */
const SEARCH_CACHE_SECONDS = 60;

export class BusService {
  constructor(
    private readonly provider: BusProvider,
    private readonly cache: CacheService,
  ) {}

  async search(search: BusSearch): Promise<BusSearchResult> {
    const key = `buses:search:v1:${this.provider.name}:${search.from}:${search.to}:${search.date}`;
    const trips = await this.cache.getOrSet(key, SEARCH_CACHE_SECONDS, () =>
      this.provider.search(search),
    );
    return {
      from: search.from,
      to: search.to,
      date: search.date,
      trips,
      demo: this.provider.isDemo,
    };
  }

  getTrip(tripId: string): Promise<BusTripOffer | null> {
    return this.provider.getTrip(tripId);
  }

  /** Never cached: customers pick seats from this. */
  seatMap(tripId: string): Promise<BusSeatMap | null> {
    return this.provider.seatMap(tripId);
  }
}
