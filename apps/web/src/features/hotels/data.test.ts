/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from 'vitest';
import { HOTEL_COUPONS, HOTEL_DATA, findHotel, hotelTotal, nightsBetween } from './data';

describe('hotel catalog', () => {
  it('contains bookable hotels and rooms', () => {
    expect(HOTEL_DATA.length).toBeGreaterThanOrEqual(4);
    expect(HOTEL_DATA.every((hotel) => hotel.rooms.length > 0)).toBe(true);
  });
  it('calculates nights across dates', () => {
    expect(nightsBetween('2026-10-10', '2026-10-13')).toBe(3);
    expect(nightsBetween('2026-10-13', '2026-10-13')).toBe(1);
  });
  it('calculates tax-inclusive room totals', () => {
    const room = HOTEL_DATA[0]!.rooms[0]!;
    expect(hotelTotal(room, 2, 1)).toBe(Math.round(room.pricePerNightPaise * 2 * 1.12));
  });
  it('finds known hotels and exposes coupons', () => {
    expect(findHotel('zp-goa-001')?.city).toBe('Goa');
    expect(HOTEL_COUPONS.ZPROO10).toBe(10);
  });
});

describe('hotel map links', () => {
  it('builds embed, open and directions links from the hotel coordinates', async () => {
    const { hotelMapLinks } = await import('./data');
    const hotel = HOTEL_DATA[0]!;
    const { lat, lng } = hotel.coordinates;
    const links = hotelMapLinks(hotel);
    expect(links.embed).toBe(`https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`);
    expect(links.open).toContain(`query=${lat},${lng}`);
    expect(links.directions).toContain(`destination=${lat},${lng}`);
  });

  it('has valid coordinates for every hotel so the map always renders', () => {
    for (const h of HOTEL_DATA) {
      expect(Number.isFinite(h.coordinates.lat) && Math.abs(h.coordinates.lat) <= 90).toBe(true);
      expect(Number.isFinite(h.coordinates.lng) && Math.abs(h.coordinates.lng) <= 180).toBe(true);
    }
  });
});
