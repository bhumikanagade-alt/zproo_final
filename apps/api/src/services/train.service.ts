import type {
  StationSuggestion,
  TrainCapabilities,
  TrainLiveStatus,
  TrainOffer,
  TrainQuota,
  TrainQuote,
  TrainSearchResult,
} from '@zproo/types';
import type { TrainQuoteInput, TrainSearch } from '@zproo/validation';
import { trainAvailabilityWarnings, trainQuotePrice } from '@zproo/utils';
import type { TrainProvider } from '../providers/train';
import { NotFoundError, OfferExpiredError, ValidationError } from '../utils/errors';
import type { CacheService } from './cache.service';

/** Short: availability changes as people book. Quotes and bookings always ask the provider live. */
const SEARCH_CACHE_SECONDS = 60;
const STATION_CACHE_SECONDS = 24 * 3600;

export class TrainService {
  constructor(
    private readonly provider: TrainProvider,
    private readonly cache: CacheService,
    private readonly feePaise: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  get providerName(): string {
    return this.provider.name;
  }

  capabilities(): TrainCapabilities {
    return this.provider.capabilities();
  }

  stations(query: string, limit: number): Promise<StationSuggestion[]> {
    const q = query.trim().toLowerCase().slice(0, 40);
    return this.cache.getOrSet(
      `trains:stations:v1:${this.provider.name}:${q}:${limit}`,
      STATION_CACHE_SECONDS,
      () => this.provider.searchStations(q, limit),
    );
  }

  async search(search: TrainSearch): Promise<TrainSearchResult> {
    const capabilities = this.provider.capabilities();
    this.checkQuota(search.quota, 'query.quota');
    const travelClass = search.travelClass === 'ALL' ? undefined : search.travelClass;
    const key = `trains:search:v1:${this.provider.name}:${search.from}:${search.to}:${search.date}:${search.quota}:${search.travelClass}`;
    const trains = await this.cache.getOrSet(key, SEARCH_CACHE_SECONDS, () =>
      this.provider.search({
        from: search.from,
        to: search.to,
        date: search.date,
        quota: search.quota,
        travelClass,
      }),
    );
    return {
      from: search.from,
      to: search.to,
      date: search.date,
      quota: search.quota,
      travelClass: search.travelClass,
      passengers: search.passengers,
      trains: travelClass
        ? trains.map((t) => ({
            ...t,
            classes: t.classes.filter((c) => c.travelClass === travelClass),
          }))
        : trains,
      demo: this.provider.isDemo,
      capabilities,
    };
  }

  /** Live availability for one train (the "refresh availability" action). Never cached. */
  async offer(offerId: string, quota: TrainQuota): Promise<TrainOffer> {
    this.checkQuota(quota, 'query.quota');
    const offer = await this.provider.getOffer(offerId, quota);
    if (!offer)
      throw new NotFoundError(
        'This train is no longer available on this date. Please search again.',
      );
    return offer;
  }

  /** Server-side fare and availability for a class, quota and passenger count. */
  async quote(input: TrainQuoteInput): Promise<TrainQuote> {
    const caps = this.provider.capabilities();
    this.checkQuota(input.quota, 'body.quota');
    const max = input.quota === 'TQ' ? caps.maxTatkalPassengers : caps.maxPassengers;
    if (input.passengers > max) {
      throw new ValidationError([
        { path: 'body.passengers', message: `Up to ${max} passengers per ticket` },
      ]);
    }
    const offer = await this.provider.getOffer(input.offerId, input.quota, input.travelClass);
    const option = offer?.classes.find((c) => c.travelClass === input.travelClass);
    if (!offer || !option?.fare)
      throw new OfferExpiredError(
        'This train or class is no longer available. Please search again.',
      );
    return {
      offerId: offer.id,
      travelClass: option.travelClass,
      quota: option.quota,
      passengers: input.passengers,
      availability: option.availability,
      perPassenger: option.fare,
      price: trainQuotePrice(option.fare, input.passengers, this.feePaise),
      quotedAt: this.now().toISOString(),
      warnings: trainAvailabilityWarnings(option.availability, input.passengers, input.quota),
      demo: this.provider.isDemo,
    };
  }

  liveStatus(trainNumber: string, date: string): Promise<TrainLiveStatus> {
    return this.provider.liveStatus(trainNumber, date);
  }

  private checkQuota(quota: TrainQuota, path: string) {
    if (!this.provider.capabilities().quotas.includes(quota)) {
      throw new ValidationError([
        { path, message: 'This quota is not offered by the railway provider' },
      ]);
    }
  }
}
