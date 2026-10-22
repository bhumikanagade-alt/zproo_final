import { describe, expect, it } from 'vitest';
import { filterPlaces } from './filterPlaces';
import { AIRPORT_OPTIONS, CITY_OPTIONS, STATION_OPTIONS } from './options';

describe('filterPlaces', () => {
  it('puts an exact code match first', () => {
    expect(filterPlaces(AIRPORT_OPTIONS, 'goi')[0]?.value).toBe('GOI');
  });

  it('matches city names by prefix before substrings', () => {
    const values = filterPlaces(AIRPORT_OPTIONS, 'mum').map((o) => o.value);
    expect(values[0]).toBe('BOM');
  });

  it('matches airport names, countries and station cities', () => {
    expect(filterPlaces(AIRPORT_OPTIONS, 'kempegowda').map((o) => o.value)).toEqual(['BLR']);
    expect(filterPlaces(AIRPORT_OPTIONS, 'emirates').map((o) => o.value)).toEqual(['DXB']);
    expect(filterPlaces(STATION_OPTIONS, 'goa').map((o) => o.value)).toEqual(['MAO']);
  });

  it('returns everything for an empty query and nothing for nonsense', () => {
    expect(filterPlaces(AIRPORT_OPTIONS, '  ')).toHaveLength(AIRPORT_OPTIONS.length);
    expect(filterPlaces(AIRPORT_OPTIONS, 'zzzz')).toEqual([]);
  });

  it('lists Maharashtra first, starting with Pune, then India, then international', () => {
    for (const options of [AIRPORT_OPTIONS, CITY_OPTIONS, STATION_OPTIONS]) {
      const groups = options.map((o) => o.group);
      expect(groups[0]).toBe('Maharashtra');
      expect(options[0]?.label).toMatch(/^Pune/);
      // Groups are contiguous and in order.
      const order = [...new Set(groups)];
      expect(order).toEqual(
        ['Maharashtra', 'Across India', 'International'].filter((g) => order.includes(g as never)),
      );
    }
  });

  it('finds places by state and by former names', () => {
    expect(filterPlaces(AIRPORT_OPTIONS, 'aurangabad').map((o) => o.value)).toEqual(['IXU']);
    expect(filterPlaces(AIRPORT_OPTIONS, 'bombay')[0]?.value).toBe('BOM');
    expect(filterPlaces(CITY_OPTIONS, 'ahmednagar').map((o) => o.value)).toEqual(['ahilyanagar']);
    const maharashtra = filterPlaces(CITY_OPTIONS, 'maharashtra');
    expect(maharashtra.length).toBeGreaterThan(40);
    expect(maharashtra.every((o) => o.group === 'Maharashtra')).toBe(true);
  });

  it('prefers Maharashtra among equally good matches', () => {
    // "Na…" matches Nagpur, Nashik, Nanded (Maharashtra) before places elsewhere.
    expect(filterPlaces(CITY_OPTIONS, 'na')[0]?.group).toBe('Maharashtra');
  });
});
