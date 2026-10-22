/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from 'vitest';
import { HOTEL_DATA, findHotel } from './data';
import {
  BED_TYPES,
  COLLECTIONS,
  allDestinations,
  beachDistanceKm,
  categorisePhotos,
  currentDeals,
  destinationInfo,
  faqFor,
  hasFrontDesk24,
  isCoupleFriendly,
  policiesFor,
  reviewsFor,
  roomBedTypes,
  scoreBreakdown,
  similarHotels,
  sortReviews,
  trendingDestinations,
  urgencyLabels,
} from './extras';
import { DEFAULT_FILTERS, activeFilters, priceHistogram, priceBounds, removeFilter, searchHotels, type HotelFilters } from './filters';
import { distributeGuests } from './occupancy';

const goa = findHotel('zp-goa-001')!;
const ctx = (query: string) => ({ query, nights: 2, occupancy: distributeGuests(1, 2, []) });
const filters = (patch: Partial<HotelFilters>): HotelFilters => ({ ...DEFAULT_FILTERS, ...patch });

describe('reviews, policies and FAQ', () => {
  it('generates the same reviews every time', () => {
    expect(reviewsFor(goa)).toEqual(reviewsFor(goa));
    expect(reviewsFor(goa)).toHaveLength(8);
  });

  it('keeps the score breakdown between 3 and 5', () => {
    const b = scoreBreakdown(goa);
    for (const v of Object.values(b)) {
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('sorts reviews by helpful, newest, highest and lowest', () => {
    const list = reviewsFor(goa);
    const helpful = sortReviews(list, 'helpful');
    expect(helpful[0]!.helpful).toBeGreaterThanOrEqual(helpful[1]!.helpful);
    const newest = sortReviews(list, 'newest');
    expect(newest[0]!.stayedOn >= newest[1]!.stayedOn).toBe(true);
    expect(sortReviews(list, 'highest')[0]!.rating).toBeGreaterThanOrEqual(sortReviews(list, 'lowest')[0]!.rating);
  });

  it('answers FAQs from the hotel data', () => {
    const faq = faqFor(goa);
    expect(faq.find((f) => f.q === 'Is parking free?')!.a).toMatch(/^Yes/);
    const hostel = findHotel('zp-del-015')!;
    expect(faqFor(hostel).find((f) => f.q === 'Is there a swimming pool?')!.a).toMatch(/^No/);
    expect(policiesFor(goa).map((p) => p.title)).toContain('ID requirements');
  });
});

describe('photos, urgency and similar hotels', () => {
  it('sorts photos into categories without duplicates', () => {
    const photos = categorisePhotos(goa);
    expect(new Set(photos.map((p) => p.src)).size).toBe(photos.length);
    const cats = new Set(photos.map((p) => p.category));
    expect(cats.has('Rooms')).toBe(true);
    expect(cats.has('Food')).toBe(true);
  });

  it('labels scarce and discounted rooms', () => {
    const premium = goa.rooms.find((r) => r.id === 'sea-premium')!; // 2 left, no offer
    expect(urgencyLabels(goa, premium).map((l) => l.key)).toContain('left');
    const deluxe = goa.rooms.find((r) => r.id === 'sea-deluxe')!; // offer
    expect(urgencyLabels(goa, deluxe).map((l) => l.key)).toContain('drop');
  });

  it('suggests other hotels, same city first', () => {
    const list = similarHotels(findHotel('zp-mum-002')!, 3);
    expect(list.every((h) => h.id !== 'zp-mum-002')).toBe(true);
    expect(list[0]!.cityCode).toBe('mumbai');
  });
});

describe('extra filters', () => {
  it('reads bed types from the bed text', () => {
    expect(roomBedTypes(goa.rooms[0]!)).toEqual(['King']);
    expect(BED_TYPES).toContain('Twin');
  });

  it('filters by couple friendly, 24h desk and beach distance', () => {
    const all = searchHotels(ctx(''), DEFAULT_FILTERS, 'recommended').results;
    const couple = searchHotels(ctx(''), filters({ coupleFriendly: true }), 'recommended').results;
    expect(couple.length).toBeLessThanOrEqual(all.length);
    expect(couple.every((r) => isCoupleFriendly(r.hotel))).toBe(true);
    const desk = searchHotels(ctx(''), filters({ frontDesk24: true }), 'recommended').results;
    expect(desk.every((r) => hasFrontDesk24(r.hotel))).toBe(true);
    const beach = searchHotels(ctx(''), filters({ maxBeachKm: 1 }), 'recommended').results;
    expect(beach.every((r) => (beachDistanceKm(r.hotel) ?? 99) <= 1)).toBe(true);
    expect(beach.map((r) => r.hotel.id)).toContain('zp-goa-001');
  });

  it('filters by bed type and distance, with removable chips', () => {
    const king = searchHotels(ctx(''), filters({ bedTypes: ['King'] }), 'recommended').results;
    expect(king.length).toBeGreaterThan(0);
    const near = searchHotels(ctx(''), filters({ maxDistanceKm: 1 }), 'recommended').results;
    expect(near.every((r) => r.hotel.distanceKm <= 1)).toBe(true);
    let f = filters({ maxDistanceKm: 3, maxBeachKm: 2, bedTypes: ['Queen'], coupleFriendly: true, frontDesk24: true });
    expect(activeFilters(f)).toHaveLength(5);
    for (const chip of activeFilters(f)) f = removeFilter(f, chip.key);
    expect(f).toEqual(DEFAULT_FILTERS);
  });

  it('builds a price histogram that counts every room', () => {
    const bins = priceHistogram(priceBounds(), 12);
    expect(bins).toHaveLength(12);
    expect(bins.reduce((a, b) => a + b, 0)).toBe(HOTEL_DATA.flatMap((h) => h.rooms).length);
  });
});

describe('discovery', () => {
  it('lists deals with the biggest discount first', () => {
    const deals = currentDeals();
    expect(deals.length).toBeGreaterThan(0);
    for (let i = 1; i < deals.length; i += 1) expect(deals[i - 1]!.percent).toBeGreaterThanOrEqual(deals[i]!.percent);
  });

  it('builds collections and destination pages from the catalogue', () => {
    expect(COLLECTIONS.every((c) => HOTEL_DATA.filter(c.match).length >= 0)).toBe(true);
    expect(HOTEL_DATA.filter(COLLECTIONS.find((c) => c.slug === 'luxury')!.match).every((h) => h.stars >= 5)).toBe(true);
    const info = destinationInfo('goa')!;
    expect(info.city).toBe('Goa');
    expect(info.areas.length).toBeGreaterThan(0);
    expect(destinationInfo('nowhere')).toBeNull();
    expect(allDestinations().length).toBeGreaterThan(3);
  });

  it('ranks trending destinations and counts local bookings', () => {
    const base = trendingDestinations();
    const boosted = trendingDestinations(['Manali', 'Manali', 'Manali', 'Manali']);
    const rank = (list: typeof base, code: string) => list.findIndex((t) => t.cityCode === code);
    expect(rank(boosted, 'manali')).toBeLessThanOrEqual(rank(base, 'manali'));
  });
});
