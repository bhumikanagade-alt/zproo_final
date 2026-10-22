import type { CabinClass, PassengerType, PaxFare } from '@zproo/types';
import { unitHash } from './hash';

/**
 * Demand pricing for the development flight provider. Deterministic: the same service, date and
 * cabin always price the same on the same day, so search results, offer pages and booking agree.
 */

const CABIN_MULTIPLIER: Record<CabinClass, number> = {
  ECONOMY: 1,
  PREMIUM_ECONOMY: 1.7,
  BUSINESS: 3.4,
  FIRST: 5.5,
};

function demandFactor(daysAhead: number): number {
  if (daysAhead <= 2) return 1.5;
  if (daysAhead <= 6) return 1.3;
  if (daysAhead <= 13) return 1.12;
  if (daysAhead <= 30) return 1;
  return 0.92;
}

/** Rounded to the nearest ₹100, minus ₹1 (e.g. ₹3,899). */
const roundFare = (paise: number) => Math.max(99_900, Math.round(paise / 10_000) * 10_000 - 100);
const roundRupee = (paise: number) => Math.round(paise / 100) * 100;

export interface FareInputs {
  key: string;
  baseFarePaise: number;
  cabin: CabinClass;
  daysAhead: number;
  weekday: number;
  international: boolean;
}

export interface FareQuote {
  fares: Record<PassengerType, PaxFare>;
  fareFamily: string;
  refundable: boolean;
  cancellationFeePaise: number | null;
  baggage: { cabinKg: number; checkInKg: number };
}

export function quoteFare(input: FareInputs): FareQuote {
  const jitter = 0.93 + unitHash(`${input.key}:price`) * 0.14;
  const weekday = input.weekday === 5 || input.weekday === 7 ? 1.08 : 1;
  const lite = input.cabin === 'ECONOMY' && unitHash(`${input.key}:family`) < 0.3;
  const adultBase = roundFare(
    input.baseFarePaise *
      CABIN_MULTIPLIER[input.cabin] *
      demandFactor(input.daysAhead) *
      weekday *
      jitter *
      (lite ? 0.95 : 1),
  );
  const gstRate = input.cabin === 'ECONOMY' ? 0.05 : 0.12;
  const airportFees = input.international ? 240_000 : 65_000;
  const tax = (base: number, fees: number) => roundRupee(fees + base * gstRate);
  const pax = (basePaise: number, fees: number): PaxFare => {
    const taxesPaise = tax(basePaise, fees);
    return { basePaise, taxesPaise, totalPaise: basePaise + taxesPaise };
  };

  const refundable = !lite;
  const cancellationFeePaise = !refundable
    ? null
    : input.cabin === 'ECONOMY'
      ? input.international
        ? 700_000
        : 350_000
      : input.cabin === 'PREMIUM_ECONOMY'
        ? 250_000
        : 100_000;

  return {
    fares: {
      ADULT: pax(adultBase, airportFees),
      CHILD: pax(roundFare(adultBase * 0.75), airportFees),
      INFANT: pax(input.international ? 400_000 : 150_000, input.international ? 80_000 : 30_000),
    },
    fareFamily: lite
      ? 'Lite'
      : { ECONOMY: 'Saver', PREMIUM_ECONOMY: 'Comfort', BUSINESS: 'Business Flex', FIRST: 'First' }[
          input.cabin
        ],
    refundable,
    cancellationFeePaise,
    baggage: {
      cabinKg: input.cabin === 'BUSINESS' || input.cabin === 'FIRST' ? 12 : 7,
      checkInKg:
        input.cabin === 'BUSINESS' || input.cabin === 'FIRST'
          ? 35
          : input.international || input.cabin === 'PREMIUM_ECONOMY'
            ? 25
            : 15,
    },
  };
}
