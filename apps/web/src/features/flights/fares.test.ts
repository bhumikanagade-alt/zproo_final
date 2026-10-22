import { describe, expect, it } from 'vitest';
import { baggagePreferenceSummary, offerBaggageSummary } from './baggage';
import { cancellationLabel, fareOptionFor, fareOptionsFor } from './fares';
import { makeOffer, OFFERS } from './test/fixtures';

const first = makeOffer();

describe('fare options', () => {
  it('describes the fare exactly as the API reports it', () => {
    const fare = fareOptionFor(first);
    expect(fare).toMatchObject({
      name: 'Saver',
      pricePaise: 480_000,
      perAdultPaise: 480_000,
      cabinBaggageKg: 7,
      checkedBaggageKg: 15,
      refundable: false,
    });
    expect(fare.benefits).toContain('15 Kg checked baggage per adult');
    expect(cancellationLabel(fare)).toBe('Non-refundable');
  });

  it('says plainly when checked baggage is not included', () => {
    const fare = fareOptionFor(makeOffer({ baggage: { cabinKg: 7, checkInKg: 0 } }));
    expect(fare.benefits).toContain('No checked baggage included');
    expect(offerBaggageSummary({ baggage: { cabinKg: 7, checkInKg: 0 } })).toBe(
      '7 Kg Cabin + No Checked Bag',
    );
  });

  it('shows one fare per flight unless the API returns more for it', () => {
    expect(fareOptionsFor(first, OFFERS)).toHaveLength(1);
    const flexi = makeOffer({
      id: 'mk_f1_20261025_E_flexi',
      fareFamily: 'Flexi',
      totalPaise: 560_000,
      refundable: true,
      cancellationFeePaise: 300_000,
    });
    expect(fareOptionsFor(first, [...OFFERS, flexi]).map((f) => f.name)).toEqual([
      'Saver',
      'Flexi',
    ]);
  });
});

describe('baggage preference summary', () => {
  it('reads like "7 Kg Cabin + 15 Kg Checked"', () => {
    expect(baggagePreferenceSummary(7, 15)).toBe('7 Kg Cabin + 15 Kg Checked');
    expect(baggagePreferenceSummary(0, 20)).toBe('No Cabin Bag + 20 Kg Checked');
    expect(baggagePreferenceSummary(undefined, 30)).toBe('30 Kg Checked');
    expect(baggagePreferenceSummary(undefined, undefined)).toBeNull();
  });
});
