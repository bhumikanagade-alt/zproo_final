import type { FlightOffer } from '@zproo/types';
import { inr } from './format';

/**
 * One purchasable fare for a flight. Everything here comes from the flight API's offer; nothing
 * is assumed. A flight that the API returns with a single fare has a single fare option.
 */
export interface FareOption {
  /** The API offer this fare is bought with. */
  offerId: string;
  name: string;
  /** Total for the passengers in the search. */
  pricePaise: number;
  perAdultPaise: number;
  cabinBaggageKg: number;
  checkedBaggageKg: number;
  refundable: boolean;
  /** Airline cancellation charge per passenger; null when non-refundable. */
  cancellationFeePaise: number | null;
  seatsLeft: number;
  /** Human-readable benefits, built only from the offer's own data. */
  benefits: string[];
}

export function cancellationLabel(f: Pick<FareOption, 'refundable' | 'cancellationFeePaise'>) {
  if (!f.refundable) return 'Non-refundable';
  return f.cancellationFeePaise === null
    ? 'Refundable'
    : `Refundable · ${inr(f.cancellationFeePaise)} cancellation fee per passenger`;
}

export function fareOptionFor(offer: FlightOffer): FareOption {
  const option: FareOption = {
    offerId: offer.id,
    name: offer.fareFamily,
    pricePaise: offer.totalPaise,
    perAdultPaise: offer.fares.ADULT.totalPaise,
    cabinBaggageKg: offer.baggage.cabinKg,
    checkedBaggageKg: offer.baggage.checkInKg,
    refundable: offer.refundable,
    cancellationFeePaise: offer.cancellationFeePaise,
    seatsLeft: offer.seatsLeft,
    benefits: [],
  };
  option.benefits = [
    option.cabinBaggageKg > 0
      ? `${option.cabinBaggageKg} Kg cabin baggage per adult`
      : 'No cabin baggage included',
    option.checkedBaggageKg > 0
      ? `${option.checkedBaggageKg} Kg checked baggage per adult`
      : 'No checked baggage included',
    cancellationLabel(option),
  ];
  return option;
}

/**
 * Every fare the results list offers for the same flight (same number and departure), cheapest
 * first. With today's flight API that is one fare per flight and cabin; if the API returns
 * several fare families for a flight they appear here without further changes.
 */
export function fareOptionsFor(offer: FlightOffer, offers: FlightOffer[]): FareOption[] {
  const same = offers.filter(
    (o) =>
      o.flightNumber === offer.flightNumber &&
      o.departureAt === offer.departureAt &&
      o.cabin === offer.cabin,
  );
  const list = same.some((o) => o.id === offer.id) ? same : [offer, ...same];
  return list.map(fareOptionFor).sort((a, b) => a.pricePaise - b.pricePaise);
}
