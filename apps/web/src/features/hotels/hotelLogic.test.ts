/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from 'vitest';
import { HOTEL_DATA, findHotel, formatINR, hotelTotal, nightsBetween } from './data';
import {
  addRoom,
  decodeLayout,
  distributeGuests,
  encodeLayout,
  guestsLabel,
  normaliseChildAges,
  occupancyLabel,
  parseChildAges,
  removeRoom,
  setAdults,
  setChildAge,
  setChildCount,
  validateOccupancy,
} from './occupancy';
import { checkCoupon, couponSelection, offerPercent, priceStay } from './pricing';
import { describeCancellation, refundAmount } from './cancellation';
import { addDays, diffNights, formatDate, isIsoDate } from './dates';
import { buildResultsUrl, parseHotelSearch, stayQuery, validateHotelSearch } from './search';
import { destinationLabel, distanceFromDestination, matchesDestination, suggestDestinations } from './suggest';
import {
  DEFAULT_FILTERS,
  activeFilters,
  guestScore,
  priceBounds,
  removeFilter,
  roomBlockReason,
  roomFitsOccupancy,
  searchHotels,
  toggle,
  type HotelFilters,
  type HotelSort,
} from './filters';
import {
  isValidEmail,
  isValidExpiry,
  isValidName,
  isValidPhone,
  nameError,
  sanitizeName,
  normalisePhone,
  formatInternationalPhone,
  phoneCountry,
  PHONE_COUNTRIES,
  isValidUpi,
  validateContact,
  validateGuests,
  validatePayment,
  validateSpecialRequests,
} from './validation';
import {
  buildBooking,
  buildConfirmationText,
  generateReference,
  verifyPayment,
} from './booking';

const TODAY = '2026-10-02';
const ctx = (query: string, nights = 2, rooms = 1, adults = 2, ages: number[] = []) => ({
  query,
  nights,
  occupancy: distributeGuests(rooms, adults, ages),
});
const filters = (patch: Partial<HotelFilters>): HotelFilters => ({ ...DEFAULT_FILTERS, ...patch });
const names = (q: string, f: Partial<HotelFilters> = {}, sort: HotelSort = 'recommended', c = ctx(q)) =>
  searchHotels(c, filters(f), sort).results.map((r) => r.hotel.id);

describe('hotel catalog integrity', () => {
  it('has unique ids, valid rooms and consistent policy flags', () => {
    const ids = HOTEL_DATA.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const hotel of HOTEL_DATA) {
      expect(hotel.rooms.length).toBeGreaterThan(0);
      expect(hotel.gallery.length).toBeGreaterThanOrEqual(3);
      expect(hotel.stars).toBeGreaterThanOrEqual(1);
      expect(hotel.stars).toBeLessThanOrEqual(5);
      for (const room of hotel.rooms) {
        expect(room.guests).toBeLessThanOrEqual(4);
        expect(room.maxAdults).toBeGreaterThanOrEqual(1);
        expect(room.refundable).toBe((room.cancellation.freeUntilHours ?? 0) > 0);
        expect(room.breakfast).toBe(room.mealPlan !== 'ROOM_ONLY');
        if (room.originalPricePerNightPaise) {
          expect(room.originalPricePerNightPaise).toBeGreaterThan(room.pricePerNightPaise);
        }
      }
    }
  });

  it('keeps the original helpers working', () => {
    expect(findHotel('zp-goa-001')?.city).toBe('Goa');
    expect(nightsBetween('2026-10-10', '2026-10-13')).toBe(3);
    expect(nightsBetween('2026-10-13', '2026-10-13')).toBe(1);
    expect(nightsBetween('bad', 'worse')).toBe(1);
    const room = HOTEL_DATA[0]!.rooms[0]!;
    expect(hotelTotal(room, 2, 1)).toBe(Math.round(room.pricePerNightPaise * 2 * 1.12));
    expect(formatINR(1904000)).toBe('₹19,040');
  });
});

describe('landing page destinations', () => {
  it('every popular destination and top hotel city has at least one stay', () => {
    const tiles = ['Goa', 'Kashmir', 'Kerala', 'Manali', 'Rajasthan', 'Dubai', 'Mumbai', 'Delhi', 'Pune', 'Bangalore', 'Hyderabad'];
    const rail = ['goa', 'udaipur', 'manali', 'mumbai', 'alleppey', 'dubai'];
    for (const q of [...tiles, ...rail]) expect(names(q, {}, 'recommended', ctx(q)).length).toBeGreaterThan(0);
  });
});

describe('occupancy', () => {
  it('parses and normalises child ages', () => {
    expect(parseChildAges('7, 5,x,13,99')).toEqual([7, 5]);
    expect(parseChildAges(null)).toEqual([]);
    expect(normaliseChildAges([3], 3)).toEqual([3, 8, 8]);
    expect(normaliseChildAges([3, 4, 5], 1)).toEqual([3]);
  });

  it('splits 2 rooms / 3 adults / 1 child sensibly', () => {
    const layout = distributeGuests(2, 3, [7]);
    expect(layout).toEqual([
      { adults: 2, childAges: [7] },
      { adults: 1, childAges: [] },
    ]);
    expect(validateOccupancy(layout)).toEqual([]);
    expect(occupancyLabel(layout)).toBe('2 rooms · 3 adults, 1 child');
    expect(guestsLabel(1, 0)).toBe('1 adult');
  });

  it('rejects impossible layouts', () => {
    expect(validateOccupancy([{ adults: 0, childAges: [] }]).length).toBe(1);
    expect(validateOccupancy([{ adults: 4, childAges: [5] }]).length).toBeGreaterThan(0);
    expect(validateOccupancy([{ adults: 2, childAges: [14] }]).length).toBe(1);
    expect(validateOccupancy([]).length).toBe(1);
    expect(validateOccupancy(Array.from({ length: 9 }, () => ({ adults: 1, childAges: [] }))).length).toBe(1);
  });

  it('edits rooms without breaking limits', () => {
    let layout = [{ adults: 2, childAges: [] as number[] }];
    layout = addRoom(layout);
    expect(layout.length).toBe(2);
    layout = setChildCount(layout, 0, 2);
    expect(layout[0]!.childAges).toEqual([8, 8]);
    layout = setChildAge(layout, 0, 1, 4);
    expect(layout[0]!.childAges).toEqual([8, 4]);
    // 2 adults + 2 children = 4 guests: cannot add an adult or a child
    expect(setAdults(layout, 0, 3)[0]!.adults).toBe(2);
    expect(setChildCount(layout, 0, 3)[0]!.childAges.length).toBe(2);
    expect(setAdults(layout, 1, 0)[1]!.adults).toBe(1); // never below 1
    layout = removeRoom(layout, 1);
    expect(layout.length).toBe(1);
    expect(removeRoom(layout, 0).length).toBe(1); // last room cannot be removed
  });

  it('round-trips an explicit layout through the URL encoding', () => {
    const layout = [
      { adults: 2, childAges: [7, 5] },
      { adults: 1, childAges: [] },
    ];
    expect(encodeLayout(layout)).toBe('2.7-5|1');
    expect(decodeLayout('2.7-5|1')).toEqual(layout);
    expect(decodeLayout('nonsense')).toBeNull();
    expect(decodeLayout(null)).toBeNull();
  });
});

describe('pricing', () => {
  it('matches the worked example: ₹8,500 × 2 nights', () => {
    const p = priceStay({ pricePerNightPaise: 850000 }, 2, 1);
    expect(p.roomSubtotalPaise).toBe(1700000);
    expect(p.taxesPaise).toBe(204000);
    expect(p.totalPaise).toBe(1904000);
    expect(formatINR(p.totalPaise)).toBe('₹19,040');
    expect(p.originalPerNightPaise).toBeNull();
    expect(p.offerDiscountPaise).toBe(0);
  });

  it('multiplies by rooms and applies coupons to the room price', () => {
    const p = priceStay({ pricePerNightPaise: 500000 }, 3, 2, 'zproo10');
    expect(p.roomSubtotalPaise).toBe(3000000);
    expect(p.couponDiscountPaise).toBe(300000);
    expect(p.couponCode).toBe('ZPROO10');
    expect(p.totalPaise).toBe(3000000 + 360000 - 300000);
    expect(priceStay({ pricePerNightPaise: 500000 }, 3, 2, 'NOPE').couponDiscountPaise).toBe(0);
  });

  it('reports offer savings', () => {
    const room = { pricePerNightPaise: 650000, originalPricePerNightPaise: 780000 };
    expect(offerPercent(room)).toBe(17);
    const p = priceStay(room, 2, 1);
    expect(p.offerDiscountPaise).toBe(260000);
    expect(p.originalPerNightPaise).toBe(780000);
    expect(offerPercent({ pricePerNightPaise: 1, originalPricePerNightPaise: 1 })).toBeNull();
  });

  it('is safe with bad inputs', () => {
    expect(priceStay({ pricePerNightPaise: 100000 }, 0, 0).nights).toBe(1);
    expect(priceStay({ pricePerNightPaise: 100000 }, Number.NaN, 1).rooms).toBe(1);
  });

  it('prices a server-checked admin coupon by the amount the server gave, never above the room price', () => {
    const room = { pricePerNightPaise: 500000 };
    const p = priceStay(room, 2, 1, { code: 'STAY12', discountPaise: 120000 });
    expect(p.couponCode).toBe('STAY12');
    expect(p.couponDiscountPaise).toBe(120000);
    expect(p.couponPercent).toBe(12);
    expect(p.totalPaise).toBe(1000000 + 120000 - 120000);
    expect(priceStay(room, 1, 1, { code: 'BIG', discountPaise: 99_999_999 }).couponDiscountPaise).toBe(500000);
    expect(priceStay(room, 1, 1, { code: 'NEG', discountPaise: -5 }).couponDiscountPaise).toBe(0);
  });

  it('turns the stored code and server amount into one coupon selection', () => {
    expect(couponSelection(null, 100)).toBeNull();
    expect(couponSelection('ZPROO10', null)).toBe('ZPROO10');
    expect(couponSelection('STAY12', 120000)).toEqual({ code: 'STAY12', discountPaise: 120000 });
  });

  it('validates coupons', () => {
    expect(checkCoupon(' stay15 ')).toEqual({ ok: true, code: 'STAY15', percent: 15 });
    expect(checkCoupon('')).toEqual({ ok: false, message: 'Enter a coupon code.' });
    expect(checkCoupon('BAD').ok).toBe(false);
  });
});

describe('cancellation', () => {
  const now = new Date(2026, 9, 2, 10, 0);
  it('describes free cancellation with an exact deadline', () => {
    const info = describeCancellation({ freeUntilHours: 48 }, '2026-10-10', '14:00', now);
    expect(info.kind).toBe('FREE');
    expect(info.headline).toMatch(/Free cancellation until 8 Oct 2026/);
    expect(info.freeUntil?.getDate()).toBe(8);
  });

  it('describes non-refundable rooms', () => {
    const info = describeCancellation({}, '2026-10-10', '14:00', now);
    expect(info.kind).toBe('NON_REFUNDABLE');
    expect(info.headline).toBe('Non-refundable');
  });

  it('describes partial refunds and tells when the free window has closed', () => {
    const terms = { freeUntilHours: 72, partialPercent: 50, partialUntilHours: 24 };
    expect(describeCancellation(terms, '2026-10-10', '14:00', now).kind).toBe('FREE');
    const late = new Date(2026, 9, 8, 9, 0); // inside the last 72h, before the last 24h
    const info = describeCancellation(terms, '2026-10-10', '14:00', late);
    expect(info.kind).toBe('PARTIAL');
    expect(info.rules.join(' ')).toMatch(/50% refund/);
    expect(info.rules.join(' ')).toMatch(/window closed/);
    const tooLate = new Date(2026, 9, 10, 9, 0);
    expect(describeCancellation(terms, '2026-10-10', '14:00', tooLate).kind).toBe('NON_REFUNDABLE');
  });

  it('calculates refunds', () => {
    const terms = { freeUntilHours: 72, partialPercent: 50, partialUntilHours: 24 };
    expect(refundAmount(terms, 1000000, '2026-10-10', '14:00', now)).toBe(1000000);
    expect(refundAmount(terms, 1000000, '2026-10-10', '14:00', new Date(2026, 9, 8, 9, 0))).toBe(500000);
    expect(refundAmount(terms, 1000000, '2026-10-10', '14:00', new Date(2026, 9, 10, 13, 0))).toBe(0);
    expect(refundAmount({}, 1000000, '2026-10-10', '14:00', now)).toBe(0);
  });
});

describe('dates', () => {
  it('validates and does arithmetic', () => {
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-10-02')).toBe(true);
    expect(isIsoDate(null)).toBe(false);
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffNights('2026-10-10', '2026-10-13')).toBe(3);
    expect(formatDate('2026-10-10')).toMatch(/10 Oct,? 2026/);
  });
});

describe('search parsing and validation', () => {
  it('reads the original URL params', () => {
    const s = parseHotelSearch(
      new URLSearchParams('city=Goa&checkIn=2026-10-10&checkOut=2026-10-13&rooms=2&adults=3&children=1&childAges=7'),
      TODAY,
    );
    expect(s.query).toBe('Goa');
    expect(s.nights).toBe(3);
    expect(s.rooms).toBe(2);
    expect(s.adults).toBe(3);
    expect(s.children).toBe(1);
    expect(s.childAges).toEqual([7]);
    expect(s.occupancy[0]).toEqual({ adults: 2, childAges: [7] });
  });

  it('falls back to safe defaults for broken links', () => {
    const s = parseHotelSearch(new URLSearchParams('checkIn=banana&rooms=-4&adults=x'), TODAY);
    expect(s.checkIn).toBe('2026-10-09');
    expect(s.checkOut).toBe('2026-10-11');
    expect(s.rooms).toBe(1);
    expect(s.adults).toBe(2);
  });

  it('honours an explicit layout and round-trips through buildResultsUrl', () => {
    const input = {
      query: 'Pune',
      checkIn: '2026-10-10',
      checkOut: '2026-10-12',
      occupancy: [
        { adults: 1, childAges: [6] },
        { adults: 2, childAges: [] },
      ],
    };
    const url = buildResultsUrl(input);
    expect(url.startsWith('/hotels/results?')).toBe(true);
    const back = parseHotelSearch(new URLSearchParams(url.split('?')[1]), TODAY);
    expect(back.occupancy).toEqual(input.occupancy);
    expect(stayQuery(input)).toBe(url.split('?')[1]);
  });

  it('keeps the plain URL shape when the split is automatic', () => {
    const url = buildResultsUrl({
      query: 'Goa', checkIn: '2026-10-10', checkOut: '2026-10-12',
      occupancy: distributeGuests(1, 2, []),
    });
    expect(url).toBe('/hotels/results?city=Goa&checkIn=2026-10-10&checkOut=2026-10-12&rooms=1&adults=2');
  });

  const ok = { query: 'Goa', checkIn: '2026-10-10', checkOut: '2026-10-12', occupancy: distributeGuests(1, 2, []) };
  it('accepts a valid search', () => {
    expect(validateHotelSearch(ok, TODAY)).toEqual([]);
  });
  it('blocks searches with problems and explains why', () => {
    expect(validateHotelSearch({ ...ok, query: '  ' }, TODAY)[0]?.field).toBe('query');
    expect(validateHotelSearch({ ...ok, checkIn: '2026-10-01' }, TODAY)[0]?.message).toMatch(/past/);
    expect(validateHotelSearch({ ...ok, checkOut: '2026-10-10' }, TODAY)[0]?.message).toMatch(/after check-in/);
    expect(validateHotelSearch({ ...ok, checkOut: '2026-10-09' }, TODAY).length).toBe(1);
    expect(validateHotelSearch({ ...ok, checkOut: '2026-12-01' }, TODAY)[0]?.message).toMatch(/30 nights/);
    expect(validateHotelSearch({ ...ok, occupancy: [{ adults: 0, childAges: [] }] }, TODAY)[0]?.field).toBe('occupancy');
    expect(validateHotelSearch({ ...ok, checkIn: '' }, TODAY)[0]?.field).toBe('checkIn');
  });
});

describe('destination search', () => {
  it('matches cities, codes, areas, hotels, landmarks and keywords', () => {
    const goa = findHotel('zp-goa-001')!;
    expect(matchesDestination(goa, 'goa')).toBe(true);
    expect(matchesDestination(goa, 'Candolim')).toBe(true);
    expect(matchesDestination(goa, 'Fort Aguada')).toBe(true);
    expect(matchesDestination(goa, 'seaview')).toBe(true);
    expect(matchesDestination(goa, 'mumbai')).toBe(false);
    expect(matchesDestination(goa, '')).toBe(true);
    expect(matchesDestination(findHotel('zp-alp-018')!, 'kerala')).toBe(true);
  });

  it('measures distance from a named landmark', () => {
    const goa = findHotel('zp-goa-001')!;
    expect(distanceFromDestination(goa, 'Fort Aguada')).toBe(3.2);
    expect(distanceFromDestination(goa, 'goa')).toBe(0.65);
  });

  it('labels destinations nicely', () => {
    expect(destinationLabel('goa')).toBe('Goa');
    expect(destinationLabel('alleppey')).toBe('Alleppey');
    expect(destinationLabel('Candolim Beach')).toBe('Candolim Beach');
    expect(destinationLabel('')).toBe('all destinations');
  });

  it('suggests across all kinds', () => {
    expect(suggestDestinations('').length).toBeGreaterThan(3);
    const kinds = new Set(suggestDestinations('a', 50).map((s) => s.kind));
    expect(kinds.has('city')).toBe(true);
    expect(suggestDestinations('palolem')[0]?.kind).toBe('area');
    expect(suggestDestinations('fort aguada')[0]?.kind).toBe('landmark');
    expect(suggestDestinations('seaview')[0]?.kind).toBe('hotel');
    expect(suggestDestinations('zzzzzz')).toEqual([]);
    expect(suggestDestinations('a', 3).length).toBeLessThanOrEqual(3);
  });
});

describe('results, filters and sorting', () => {
  it('finds hotels by destination', () => {
    expect(names('goa').sort()).toEqual(['zp-goa-001', 'zp-goa-012']);
    expect(names('Mumbai').length).toBe(2);
    expect(names('nowhere')).toEqual([]);
    expect(names('').length).toBe(HOTEL_DATA.length);
  });

  it('filters by star rating, guest rating and property type', () => {
    expect(names('goa', { stars: [5] })).toEqual(['zp-goa-001']);
    expect(names('goa', { stars: [3] })).toEqual(['zp-goa-012']);
    expect(names('', { guestRatingMin: 8 }).every((id) => guestScore(findHotel(id)!) >= 8)).toBe(true);
    expect(names('', { guestRatingMin: 8 }).length).toBeLessThan(HOTEL_DATA.length);
    expect(names('', { propertyTypes: ['Hostel'] })).toEqual(['zp-del-015']);
    expect(names('', { propertyTypes: ['Villa', 'Lodge'] }).sort()).toEqual(['zp-goa-012', 'zp-mnl-017']);
  });

  it('filters by amenities (all selected must be present)', () => {
    const ids = names('', { amenities: ['Pool', 'Spa'] });
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(findHotel(id)!.amenities).toContain('Pool');
      expect(findHotel(id)!.amenities).toContain('Spa');
    }
    expect(names('', { amenities: ['Pet friendly'] }).sort()).toEqual(['zp-goa-012', 'zp-mnl-017']);
  });

  it('filters by price range per night (before taxes)', () => {
    const cheap = names('', { maxPricePaise: 250000 });
    expect(cheap).toContain('zp-del-015');
    expect(cheap).not.toContain('zp-dxb-019');
    const pricey = names('', { minPricePaise: 1000000 });
    expect(pricey.sort()).toEqual(['zp-del-004', 'zp-dxb-019', 'zp-goa-001', 'zp-udr-016']);
    expect(names('', { minPricePaise: 5000000 })).toEqual([]);
  });

  it('filters by booking policy and meal plan together on the same room', () => {
    const free = names('', { freeCancellation: true });
    expect(free.length).toBeGreaterThan(5);
    const payLater = searchHotels(ctx(''), filters({ payAtProperty: true }), 'recommended').results;
    expect(payLater.length).toBeGreaterThan(0);
    expect(payLater.every((r) => r.rooms.every((room) => room.payAtProperty))).toBe(true);
    const noPrepay = searchHotels(ctx(''), filters({ noPrepayment: true }), 'recommended').results;
    expect(noPrepay.every((r) => r.rooms.every((room) => room.payAtProperty && room.refundable))).toBe(true);
    const half = searchHotels(ctx(''), filters({ mealPlan: 'HALF_BOARD' }), 'recommended').results;
    expect(half.length).toBeGreaterThan(0);
    expect(half.every((r) => r.bestRoom.mealPlan === 'HALF_BOARD')).toBe(true);
    const roomOnly = searchHotels(ctx('pune'), filters({ mealPlan: 'ROOM_ONLY' }), 'price-asc').results;
    expect(roomOnly.every((r) => r.bestRoom.mealPlan === 'ROOM_ONLY')).toBe(true);
  });

  it('filters by location tag', () => {
    const airport = names('', { locations: ['AIRPORT'] }).sort();
    expect(airport).toEqual(['zp-del-004', 'zp-mum-002']);
    expect(names('', { locations: ['RAILWAY'] })).toEqual(['zp-del-015']);
  });

  it('quotes the cheapest matching room and prices the whole stay', () => {
    const r = searchHotels(ctx('goa', 3, 1), DEFAULT_FILTERS, 'recommended').results.find((x) => x.hotel.id === 'zp-goa-001')!;
    expect(r.bestRoom.id).toBe('sea-deluxe');
    expect(r.price.nights).toBe(3);
    expect(r.price.totalPaise).toBe(Math.round(650000 * 3 * 1.12));
    const two = searchHotels(ctx('goa', 3, 2, 4), DEFAULT_FILTERS, 'recommended').results.find((x) => x.hotel.id === 'zp-goa-001')!;
    expect(two.price.rooms).toBe(2);
    expect(two.price.totalPaise).toBe(Math.round(650000 * 3 * 2 * 1.12));
  });

  it('sorts every way, and sorting respects the active filters', () => {
    const all = (sort: HotelSort) => searchHotels(ctx(''), DEFAULT_FILTERS, sort).results;
    const asc = all('price-asc').map((r) => r.price.allInPerNightPaise);
    expect([...asc].sort((a, b) => a - b)).toEqual(asc);
    const desc = all('price-desc').map((r) => r.price.allInPerNightPaise);
    expect([...desc].sort((a, b) => b - a)).toEqual(desc);
    const rating = all('rating').map((r) => r.hotel.rating);
    expect([...rating].sort((a, b) => b - a)).toEqual(rating);
    const stars = all('stars').map((r) => r.hotel.stars);
    expect([...stars].sort((a, b) => b - a)).toEqual(stars);
    const dist = all('distance').map((r) => r.distanceKm);
    expect([...dist].sort((a, b) => a - b)).toEqual(dist);
    const pop = all('popularity').map((r) => r.hotel.popularity);
    expect([...pop].sort((a, b) => b - a)).toEqual(pop);
    expect(all('recommended').length).toBe(HOTEL_DATA.length);
    // sorted + filtered
    const filtered = searchHotels(ctx(''), filters({ stars: [4, 5] }), 'price-asc').results;
    expect(filtered.every((r) => r.hotel.stars >= 4)).toBe(true);
    const prices = filtered.map((r) => r.price.allInPerNightPaise);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('only returns hotels that can host the whole group', () => {
    // 4 adults in one room: only rooms with maxAdults >= 4
    const outcome = searchHotels(ctx('', 2, 1, 4), DEFAULT_FILTERS, 'recommended');
    for (const r of outcome.results) expect(r.rooms.every((room) => room.maxAdults >= 4)).toBe(true);
    expect(outcome.cannotHost).toBeGreaterThan(0);
    // Too many rooms: Udaipur Royal Suite has 1 left, deluxe has 3
    const rooms4 = searchHotels(ctx('udaipur', 2, 4, 4), DEFAULT_FILTERS, 'recommended');
    expect(rooms4.results).toEqual([]);
    expect(rooms4.cannotHost).toBe(1);
  });

  it('checks room fit and explains why a room is blocked', () => {
    const deluxe = findHotel('zp-goa-001')!.rooms[0]!; // 2 adults, 0 children, 4 left
    expect(roomFitsOccupancy(deluxe, distributeGuests(1, 2, []))).toBe(true);
    expect(roomFitsOccupancy(deluxe, distributeGuests(1, 2, [7]))).toBe(false);
    expect(roomBlockReason(deluxe, distributeGuests(1, 2, [7]))).toMatch(/children/);
    expect(roomBlockReason(deluxe, distributeGuests(1, 3, []))).toMatch(/adult/);
    expect(roomBlockReason(deluxe, distributeGuests(5, 5, []))).toMatch(/Only 4 rooms left/);
    expect(roomBlockReason(deluxe, distributeGuests(1, 2, []))).toBeNull();
    // 3 adults + 1 child over 2 rooms → biggest room is 2 adults + child; premium (2 adults,1 child) fits
    const premium = findHotel('zp-goa-001')!.rooms[1]!;
    expect(roomFitsOccupancy(premium, distributeGuests(2, 3, [7]))).toBe(true);
  });

  it('builds removable filter chips', () => {
    const f = filters({ stars: [4, 5], amenities: ['Pool'], freeCancellation: true, mealPlan: 'BREAKFAST', minPricePaise: 100000, guestRatingMin: 8, locations: ['AIRPORT'], propertyTypes: ['Hotel'], payAtProperty: true, noPrepayment: true });
    const chips = activeFilters(f);
    expect(chips.length).toBe(11);
    expect(activeFilters(DEFAULT_FILTERS)).toEqual([]);
    let current = f;
    for (const chip of chips) current = removeFilter(current, chip.key);
    expect(current).toEqual(DEFAULT_FILTERS);
    expect(removeFilter(f, 'star:4').stars).toEqual([5]);
    expect(removeFilter(f, 'unknown:thing')).toEqual(f);
  });

  it('toggles list values and exposes price bounds', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
    const bounds = priceBounds();
    expect(bounds.min).toBeLessThan(bounds.max);
    expect(bounds.min % 500).toBe(0);
  });
});

describe('guest, contact and special-request validation', () => {
  const adult = (over = {}) => ({ firstName: 'Asha', lastName: 'Patil', age: 30, type: 'ADULT' as const, ...over });
  const child = (over = {}) => ({ firstName: 'Riya', lastName: 'Patil', age: 7, type: 'CHILD' as const, ...over });

  it('validates names, email and phone', () => {
    expect(isValidName('Anne Marie')).toBe(true);
    expect(isValidName('A')).toBe(false);
    expect(isValidName('R2D2')).toBe(false);
    expect(isValidName("O'Neil")).toBe(false);
    expect(isValidName('Anne-Marie')).toBe(false);
    expect(isValidName('Asha  Patil')).toBe(false);
    expect(isValidName('Aaaaa')).toBe(false);
    expect(isValidName('अमित')).toBe(true);
    expect(nameError('Asha1', 'first name')).toBe('First name cannot contain numbers.');
    expect(sanitizeName('  As1ha@ #Pa-til  ')).toBe('Asha Patil ');
    expect(isValidEmail('a@example.com')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@example.com')).toBe(false);
    expect(isValidPhone('+91 98765 43210')).toBe(true);
    expect(isValidPhone('9876543210')).toBe(true);
    expect(isValidPhone('098765-43210')).toBe(true);
    expect(isValidPhone('+14155552671', 'US')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('5876543210')).toBe(false);
    expect(isValidPhone('9999999999')).toBe(false);
    expect(isValidPhone('98765abc10')).toBe(false);
    expect(isValidPhone('501234567', 'AE')).toBe(true);
    expect(isValidPhone('9876543210', 'AE')).toBe(false);
  });

  it('normalises numbers per country and formats them internationally', () => {
    expect(normalisePhone('+91 98765 43210')).toBe('9876543210');
    expect(normalisePhone('98765432101234')).toBe('9876543210');
    expect(normalisePhone('+971 50 123 4567', 'AE')).toBe('501234567');
    expect(formatInternationalPhone('98765 43210', 'IN')).toBe('+91 9876543210');
    expect(phoneCountry('XX').iso).toBe('IN');
    expect(PHONE_COUNTRIES.every((p) => p.pattern.test(p.example) && p.example.length >= p.min && p.example.length <= p.max)).toBe(true);
  });

  it('accepts a correct guest list and flags every problem otherwise', () => {
    expect(validateGuests([adult(), child()], { adults: 1, children: 1 })).toEqual({ byIndex: {}, general: null });
    const bad = validateGuests([adult({ firstName: '', age: 16 }), child({ age: 15, lastName: '1' })], { adults: 1, children: 1 });
    expect(bad.byIndex[0]?.firstName).toBe('Enter first name.');
    expect(bad.byIndex[0]?.age).toMatch(/18/);
    expect(bad.byIndex[1]?.age).toMatch(/0–12/);
    expect(bad.byIndex[1]?.lastName).toBeDefined();
    expect(validateGuests([adult()], { adults: 2, children: 0 }).general).toMatch(/2 adults/);
    expect(validateGuests([adult()], { adults: 1, children: 0 }, { requireGender: true }).byIndex[0]?.gender).toBeDefined();
    expect(validateGuests([adult({ gender: 'FEMALE' })], { adults: 1, children: 0 }, { requireGender: true }).byIndex).toEqual({});
  });

  it('validates contact details', () => {
    const good = { name: 'Asha Patil', email: 'asha@example.com', phone: '9876543210', country: 'India' };
    expect(validateContact(good)).toEqual({});
    const errors = validateContact({ name: '', email: 'x', phone: '1', country: '' });
    expect(Object.keys(errors).sort()).toEqual(['country', 'email', 'name', 'phone']);
  });

  it('limits the special-request note', () => {
    expect(validateSpecialRequests('late arrival')).toBeNull();
    expect(validateSpecialRequests('x'.repeat(251))).toMatch(/250/);
  });
});

describe('payment validation and verification', () => {
  const base = { method: 'upi' as const, upi: '', card: { number: '', expiry: '', cvv: '' }, bank: '' };
  const now = new Date(2026, 9, 2);

  it('validates UPI, card and net banking', () => {
    expect(validatePayment(base, now)).toMatch(/valid upi/i);
    expect(validatePayment({ ...base, upi: 'asha@okbank' }, now)).toBeNull();
    expect(isValidUpi('a@b')).toBe(false);
    const card = { ...base, method: 'card' as const };
    expect(validatePayment(card, now)).toMatch(/card number/i);
    expect(validatePayment({ ...card, card: { number: '4111 1111 1111 1112', expiry: '10/30', cvv: '123' } }, now)).toMatch(/not valid/i);
    expect(validatePayment({ ...card, card: { number: '4111 1111 1111 1111', expiry: '13/30', cvv: '123' } }, now)).toMatch(/MM\/YY/);
    expect(validatePayment({ ...card, card: { number: '4111 1111 1111 1111', expiry: '09/26', cvv: '123' } }, now)).toMatch(/expired/);
    expect(validatePayment({ ...card, card: { number: '4111 1111 1111 1111', expiry: '10/26', cvv: '12' } }, now)).toMatch(/CVV/);
    expect(validatePayment({ ...card, card: { number: '4111 1111 1111 1111', expiry: '10/26', cvv: '123' } }, now)).toBeNull();
    expect(validatePayment({ ...base, method: 'netbanking' }, now)).toMatch(/bank/);
    expect(validatePayment({ ...base, method: 'netbanking', bank: 'HDFC Bank' }, now)).toBeNull();
    expect(isValidExpiry('12/99', now)).toBe(true);
  });

  it('verifies payments deterministically', () => {
    const rand = () => 0;
    expect(verifyPayment({ ...base, upi: 'asha@okbank' }, 100000, rand)).toEqual({ status: 'SUCCESS', transactionId: 'TXNAAAAAAAAAA' });
    expect(verifyPayment({ ...base, upi: 'fail@upi' }, 100000).status).toBe('FAILED');
    const declined = verifyPayment({ ...base, method: 'card', card: { number: '4000 0000 0000 0002', expiry: '10/30', cvv: '123' } }, 100000);
    expect(declined.status).toBe('FAILED');
    expect(verifyPayment({ ...base, upi: 'asha@okbank' }, 0).status).toBe('FAILED');
  });
});

describe('booking snapshot and confirmation', () => {
  const hotel = findHotel('zp-goa-001')!;
  const room = hotel.rooms[1]!;
  const input = {
    hotel, room,
    checkIn: '2026-10-10', checkOut: '2026-10-13', nights: 3, rooms: 2, adults: 3, children: 1, childAges: [7],
    guests: [
      { firstName: 'Asha', lastName: 'Patil', age: 34, type: 'ADULT' as const },
      { firstName: 'Ravi', lastName: 'Patil', age: 36, type: 'ADULT' as const },
      { firstName: 'Meera', lastName: 'Shah', age: 31, type: 'ADULT' as const },
      { firstName: 'Riya', lastName: 'Patil', age: 7, type: 'CHILD' as const },
    ],
    contact: { email: 'asha@example.com', phone: '9876543210' },
    specialRequests: ['late-check-out', 'extra-bed'],
    specialNote: ' Quiet room please ',
    coupon: 'STAY15',
    method: 'upi' as const,
  };

  it('generates well-formed references', () => {
    expect(generateReference(new Date(2026, 9, 2), () => 0)).toBe('ZPH-2026-AAAAAA');
    expect(generateReference()).toMatch(/^ZPH-\d{4}-[A-Z2-9]{6}$/);
  });

  it('captures the whole booking including price and cancellation', () => {
    const b = buildBooking(input, 'ZPH-2026-ABC234', 'TXN1234567890', new Date(2026, 9, 2, 10));
    expect(b.price.totalPaise).toBe(priceStayTotal());
    expect(b.contact.name).toBe('Asha Patil'); // falls back to the first guest
    expect(b.contact.country).toBe('India');
    expect(b.specialNote).toBe('Quiet room please');
    expect(b.cancellationHeadline).toMatch(/Free cancellation|Partial|Non-refundable/);
    expect(b.guests.length).toBe(4);
    expect(b.checkInTime).toBe('14:00');
  });

  it('writes a complete text confirmation', () => {
    const b = buildBooking(input, 'ZPH-2026-ABC234', 'TXN1234567890', new Date(2026, 9, 2, 10));
    const text = buildConfirmationText(b);
    for (const needle of ['ZPH-2026-ABC234', 'TXN1234567890', hotel.name, room.name, 'Asha Patil', 'Late check-out', 'Extra bed', 'Quiet room please', 'Coupon STAY15', 'Total paid', '3 nights, 2 rooms, 3 adults, 1 child']) {
      expect(text).toContain(needle);
    }
    const payLater = buildBooking({ ...input, room: { ...room, payAtProperty: true } }, 'R', 'T');
    expect(buildConfirmationText(payLater)).toContain('payable at property');
  });

  function priceStayTotal() {
    const subtotal = room.pricePerNightPaise * 3 * 2;
    return subtotal + Math.round(subtotal * 0.12) - Math.round(subtotal * 0.15);
  }
});
