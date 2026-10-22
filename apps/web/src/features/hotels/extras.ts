import type { Hotel, HotelRoom } from './data';
import { HOTEL_DATA } from './data';

/**
 * Front-end content derived from the hotel catalogue: reviews, policies, FAQ, photo categories,
 * urgency labels and extra filter facts. Everything is deterministic (seeded from the hotel id),
 * so the numbers never change between renders. When a backend exists, replace these helpers with
 * API calls; the UI only depends on the shapes exported here.
 */

/** Small seeded random generator (mulberry32) so generated content is stable. */
function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ───────────────────────── Reviews ───────────────────────── */

export type TravellerType = 'Couple' | 'Family' | 'Business' | 'Solo' | 'Friends';
export const TRAVELLER_TYPES: readonly TravellerType[] = ['Couple', 'Family', 'Business', 'Solo', 'Friends'];

export interface ScoreBreakdown {
  cleanliness: number;
  location: number;
  service: number;
  value: number;
}

export interface HotelReview {
  id: string;
  hotelId: string;
  author: string;
  travellerType: TravellerType;
  /** 1–5 */
  rating: number;
  title: string;
  text: string;
  /** ISO date (yyyy-mm-dd) */
  stayedOn: string;
  helpful: number;
  /** True for reviews written on this device after a stay. */
  own?: boolean;
}

const AUTHORS = ['Aarav S.', 'Priya N.', 'Rohan K.', 'Meera J.', 'Vikram P.', 'Ananya R.', 'Karan M.', 'Sneha D.', 'Rahul T.', 'Isha B.', 'Arjun V.', 'Neha G.'];

const POSITIVE = [
  ['Spotless rooms and friendly staff', 'The room was spotless and the staff went out of their way to help us. Check-in was quick and the bed was very comfortable.'],
  ['Great location', 'Easy to reach the main sights from here. We walked to most places and the front desk gave us useful local tips.'],
  ['Worth the price', 'Good value for money. The breakfast spread was fresh and the room matched the photos.'],
  ['Lovely stay', 'Quiet at night, clean bathroom and strong Wi-Fi. Would happily stay again on our next trip.'],
  ['Excellent service', 'The team arranged an early check-in and an airport pickup without any fuss. Very professional.'],
  ['Perfect for families', 'Plenty of space for the kids, helpful staff and a safe, relaxed atmosphere throughout.'],
];
const MIXED = [
  ['Good, with small niggles', 'Overall a good stay. The AC was a little noisy and hot water took a minute, but the staff fixed things quickly.'],
  ['Decent for the price', 'Clean and comfortable. Breakfast was average and the lift was slow at peak hours.'],
];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function scoreBreakdown(hotel: Hotel): ScoreBreakdown {
  const rand = seeded(`${hotel.id}:score`);
  const base = hotel.rating;
  const jitter = () => (rand() - 0.5) * 0.5;
  const valueBias = hotel.stars >= 5 ? -0.15 : hotel.stars <= 2 ? 0.15 : 0;
  return {
    cleanliness: round1(clamp(base + jitter(), 3, 5)),
    location: round1(clamp(base + jitter(), 3, 5)),
    service: round1(clamp(base + jitter(), 3, 5)),
    value: round1(clamp(base + jitter() + valueBias, 3, 5)),
  };
}

export function reviewsFor(hotel: Hotel, count = 8): HotelReview[] {
  const rand = seeded(`${hotel.id}:reviews`);
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)] as T;
  const list: HotelReview[] = [];
  for (let i = 0; i < count; i += 1) {
    const mixed = hotel.rating < 4.4 && rand() < 0.35;
    const [title, text] = pick(mixed ? MIXED : POSITIVE) as [string, string];
    const rating = mixed ? (rand() < 0.5 ? 3 : 4) : rand() < 0.65 ? 5 : 4;
    const daysAgo = 10 + Math.floor(rand() * 300);
    const d = new Date(Date.UTC(2026, 9, 9) - daysAgo * 86_400_000);
    const travellerType = hotel.amenities.includes('Family friendly') && rand() < 0.4 ? 'Family' : pick(TRAVELLER_TYPES);
    list.push({
      id: `${hotel.id}-r${i}`,
      hotelId: hotel.id,
      author: pick(AUTHORS),
      travellerType,
      rating,
      title,
      text,
      stayedOn: d.toISOString().slice(0, 10),
      helpful: Math.floor(rand() * 60),
    });
  }
  return list;
}

export type ReviewSort = 'helpful' | 'newest' | 'highest' | 'lowest';
export const REVIEW_SORTS: readonly { value: ReviewSort; label: string }[] = [
  { value: 'helpful', label: 'Most helpful' },
  { value: 'newest', label: 'Newest first' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
];

export function sortReviews(reviews: readonly HotelReview[], sort: ReviewSort): HotelReview[] {
  const cmp: Record<ReviewSort, (a: HotelReview, b: HotelReview) => number> = {
    helpful: (a, b) => b.helpful - a.helpful,
    newest: (a, b) => b.stayedOn.localeCompare(a.stayedOn),
    highest: (a, b) => b.rating - a.rating || b.helpful - a.helpful,
    lowest: (a, b) => a.rating - b.rating || b.helpful - a.helpful,
  };
  return [...reviews].sort(cmp[sort]);
}

/* ───────────────────────── Policies & FAQ ───────────────────────── */

export interface PolicyItem {
  title: string;
  text: string;
}

export function policiesFor(hotel: Hotel): PolicyItem[] {
  const pets = hotel.amenities.includes('Pet friendly');
  const family = hotel.amenities.includes('Family friendly');
  return [
    { title: 'Check-in & check-out', text: `Check-in from ${hotel.checkInTime}. Check-out until ${hotel.checkOutTime}. Early check-in and late check-out depend on availability.` },
    { title: 'ID requirements', text: 'Every adult guest must show a valid government photo ID (Aadhaar, passport, driving licence or voter ID) at check-in. Foreign nationals need a passport and visa.' },
    { title: 'Children & extra beds', text: family ? 'Children of all ages are welcome. Extra beds can be requested at the property for a fee, subject to room capacity.' : 'Children are welcome in rooms that allow them. Extra beds depend on the room type and capacity.' },
    { title: 'Pets', text: pets ? 'Pets are allowed on request. Charges may apply and the hotel may restrict pets in some areas.' : 'Pets are not allowed at this property.' },
    { title: 'House rules', text: 'Quiet hours are 10:00 PM to 7:00 AM. Smoking is allowed only in designated areas. Parties and events need prior approval from the hotel.' },
    { title: 'Payments at the property', text: 'Some properties ask for a refundable deposit at check-in. Local couples may be asked for additional ID as per hotel policy.' },
  ];
}

export interface FaqItem {
  q: string;
  a: string;
}

export function faqFor(hotel: Hotel): FaqItem[] {
  const has = (a: Hotel['amenities'][number]) => hotel.amenities.includes(a);
  const anyBreakfast = hotel.rooms.some((r) => r.breakfast);
  const allBreakfast = hotel.rooms.every((r) => r.breakfast);
  const payLater = hotel.rooms.some((r) => r.payAtProperty);
  const free = hotel.rooms.some((r) => r.refundable);
  return [
    { q: 'Is breakfast included?', a: allBreakfast ? 'Yes, breakfast is included in every room plan.' : anyBreakfast ? 'It depends on the room plan. Look for “Breakfast included” on the rooms page.' : 'Breakfast is not included in the room rates.' },
    { q: 'Is parking free?', a: has('Parking') ? 'Yes, free on-site parking is available for guests, subject to space.' : 'There is no on-site parking. Nearby public parking may be available.' },
    { q: 'Is Wi-Fi available?', a: has('Wi-Fi') ? 'Yes, free Wi-Fi is available in rooms and common areas.' : 'Wi-Fi is not listed for this property.' },
    { q: 'Is there a swimming pool?', a: has('Pool') ? 'Yes, there is a swimming pool for guests.' : 'No, this property does not have a swimming pool.' },
    { q: 'Can I pay at the hotel?', a: payLater ? 'Yes, some room plans let you pay at the property. Look for “Pay at property”.' : 'No, rooms here are prepaid.' },
    { q: 'Can I cancel for free?', a: free ? 'Yes, many room plans offer free cancellation until a set time before check-in. Check each room for the exact deadline.' : 'No, all room plans here are non-refundable.' },
    { q: 'Is there an airport transfer?', a: has('Airport transfer') ? 'Yes, airport transfers can be arranged with the hotel, usually for an extra charge.' : 'The hotel does not list an airport transfer. You can book a cab separately.' },
    { q: 'Are pets allowed?', a: has('Pet friendly') ? 'Yes, pets are allowed on request.' : 'No, pets are not allowed.' },
  ];
}

/* ───────────────────────── Photo categories ───────────────────────── */

export type PhotoCategory = 'All' | 'Rooms' | 'Pool' | 'Food' | 'Exterior';
export const PHOTO_CATEGORIES: readonly PhotoCategory[] = ['All', 'Rooms', 'Pool', 'Food', 'Exterior'];

const FOOD_PHOTOS = [
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c6?auto=format&fit=crop&w=1200&q=80',
];

export interface CategorisedPhoto {
  src: string;
  category: Exclude<PhotoCategory, 'All'>;
}

/** Sorts a hotel's gallery into tabs. Room photos come from the rooms, the rest from the gallery. */
export function categorisePhotos(hotel: Hotel): CategorisedPhoto[] {
  const out: CategorisedPhoto[] = [];
  hotel.gallery.forEach((src, i) => {
    const isPoolPhoto = src.includes('photo-1520250497591');
    out.push({ src, category: isPoolPhoto ? 'Pool' : i === 0 ? 'Exterior' : 'Rooms' });
  });
  for (const room of hotel.rooms) out.push({ src: room.image, category: 'Rooms' });
  if (hotel.amenities.includes('Restaurant') || hotel.amenities.includes('Breakfast')) {
    FOOD_PHOTOS.forEach((src) => out.push({ src, category: 'Food' }));
  }
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.src) ? false : (seen.add(p.src), true)));
}

/* ───────────────────────── Urgency labels ───────────────────────── */

export interface UrgencyLabel {
  key: string;
  text: string;
  tone: 'danger' | 'warn' | 'good';
}

export function urgencyLabels(hotel: Hotel, room: HotelRoom): UrgencyLabel[] {
  const labels: UrgencyLabel[] = [];
  if (room.roomsLeft <= 3) labels.push({ key: 'left', text: `Only ${room.roomsLeft} room${room.roomsLeft === 1 ? '' : 's'} left`, tone: 'danger' });
  const weekly = Math.max(1, Math.round(hotel.popularity / 4));
  if (weekly >= 10) labels.push({ key: 'booked', text: `Booked ${weekly} times this week`, tone: 'warn' });
  const was = room.originalPricePerNightPaise;
  if (typeof was === 'number' && was > room.pricePerNightPaise) labels.push({ key: 'drop', text: 'Price drop', tone: 'good' });
  return labels;
}

/* ───────────────────────── Extra filter facts ───────────────────────── */

export type BedType = 'King' | 'Queen' | 'Twin' | 'Double';
export const BED_TYPES: readonly BedType[] = ['King', 'Queen', 'Twin', 'Double'];

export function roomBedTypes(room: HotelRoom): BedType[] {
  const beds = room.beds.toLowerCase();
  const found: BedType[] = [];
  if (beds.includes('king')) found.push('King');
  if (beds.includes('queen')) found.push('Queen');
  if (beds.includes('single')) found.push('Twin');
  if (beds.includes('double')) found.push('Double');
  return found;
}

export const hotelHasBedType = (hotel: Hotel, bed: BedType) => hotel.rooms.some((r) => roomBedTypes(r).includes(bed));

/** Couples: not a hostel, and quiet enough to suit couples (3 stars and up or a resort/villa). */
export const isCoupleFriendly = (hotel: Hotel) =>
  hotel.propertyType !== 'Hostel' && (hotel.stars >= 3 || hotel.propertyType === 'Villa' || hotel.propertyType === 'Resort');

/** 24-hour front desk: shown for hotels and resorts with room service or 4 stars and up. */
export const hasFrontDesk24 = (hotel: Hotel) =>
  (hotel.propertyType === 'Hotel' || hotel.propertyType === 'Resort') &&
  (hotel.stars >= 4 || hotel.amenities.includes('Room service'));

/** Distance to the beach in km, from the landmark list (null when there is no beach landmark). */
export function beachDistanceKm(hotel: Hotel): number | null {
  const beach = hotel.landmarks.filter((l) => /beach|sea|shore|lake/i.test(l.name)).map((l) => l.distanceKm);
  if (beach.length > 0) return Math.min(...beach);
  return hotel.locationTags.includes('BEACH') ? hotel.distanceKm : null;
}

/** Nearest landmark distance (km) for the “distance from landmark” filter. */
export const nearestLandmarkKm = (hotel: Hotel): number =>
  hotel.landmarks.length > 0 ? Math.min(...hotel.landmarks.map((l) => l.distanceKm)) : hotel.distanceKm;

/* ───────────────────────── Similar hotels ───────────────────────── */

export function similarHotels(hotel: Hotel, limit = 4, catalog: readonly Hotel[] = HOTEL_DATA): Hotel[] {
  const cheapest = (h: Hotel) => Math.min(...h.rooms.map((r) => r.pricePerNightPaise));
  const mine = cheapest(hotel);
  return catalog
    .filter((h) => h.id !== hotel.id)
    .map((h) => {
      let score = 0;
      if (h.cityCode === hotel.cityCode) score += 50;
      if (h.stars === hotel.stars) score += 15;
      if (h.propertyType === hotel.propertyType) score += 10;
      score -= Math.abs(Math.log((cheapest(h) || 1) / (mine || 1))) * 10;
      return { h, score };
    })
    .sort((a, b) => b.score - a.score || a.h.name.localeCompare(b.h.name))
    .slice(0, limit)
    .map((x) => x.h);
}

/* ───────────────────────── Discovery ───────────────────────── */

export interface Collection {
  slug: string;
  title: string;
  blurb: string;
  match: (hotel: Hotel) => boolean;
}

const cheapestRupees = (h: Hotel) => Math.min(...h.rooms.map((r) => r.pricePerNightPaise)) / 100;

export const COLLECTIONS: readonly Collection[] = [
  { slug: 'beach-resorts', title: 'Beach resorts', blurb: 'Sea views, pools and sand a short walk away.', match: (h) => h.locationTags.includes('BEACH') || (h.propertyType === 'Resort' && /goa|kerala/.test(h.cityCode)) },
  { slug: 'budget-stays', title: 'Budget stays', blurb: 'Clean, safe rooms under ₹3,000 a night.', match: (h) => cheapestRupees(h) < 3000 },
  { slug: 'luxury', title: 'Luxury', blurb: 'Five-star comfort, spas and signature dining.', match: (h) => h.stars >= 5 },
  { slug: 'pet-friendly', title: 'Pet friendly', blurb: 'Bring your four-legged family along.', match: (h) => h.amenities.includes('Pet friendly') },
  { slug: 'family-stays', title: 'Family stays', blurb: 'Roomy suites and family-friendly facilities.', match: (h) => h.amenities.includes('Family friendly') },
];

export const findCollection = (slug: string) => COLLECTIONS.find((c) => c.slug === slug);

export const hotelsInCollection = (c: Collection, catalog: readonly Hotel[] = HOTEL_DATA) => catalog.filter(c.match);

/** Rooms with an offer, deepest discount first. */
export interface Deal {
  hotel: Hotel;
  room: HotelRoom;
  percent: number;
}

export function currentDeals(catalog: readonly Hotel[] = HOTEL_DATA): Deal[] {
  const deals: Deal[] = [];
  for (const hotel of catalog) {
    for (const room of hotel.rooms) {
      const was = room.originalPricePerNightPaise;
      if (typeof was === 'number' && was > room.pricePerNightPaise) {
        deals.push({ hotel, room, percent: Math.round(((was - room.pricePerNightPaise) / was) * 100) });
      }
    }
  }
  return deals.sort((a, b) => b.percent - a.percent || a.hotel.name.localeCompare(b.hotel.name));
}

export interface DestinationInfo {
  city: string;
  cityCode: string;
  hotels: Hotel[];
  areas: string[];
  fromPaise: number;
  bestTime: string;
  about: string;
}

const BEST_TIME: Record<string, { bestTime: string; about: string }> = {
  goa: { bestTime: 'November to February', about: 'Beaches, nightlife and Portuguese-era old towns. Stay in the north for parties and the south for quiet.' },
  mumbai: { bestTime: 'October to February', about: 'India’s busiest city: sea-facing promenades, street food and the Gateway of India.' },
  pune: { bestTime: 'June to February', about: 'A student city with cafés, forts nearby and easy weekend trips into the hills.' },
  delhi: { bestTime: 'October to March', about: 'Capital of monuments, markets and food. Aerocity suits flights, Paharganj suits budgets.' },
  udaipur: { bestTime: 'September to March', about: 'The city of lakes: palaces, rooftop dinners and boat rides on Lake Pichola.' },
  manali: { bestTime: 'March to June, December for snow', about: 'Mountain town for treks, snow and the Rohtang route, a popular escape from the plains.' },
  kerala: { bestTime: 'September to March', about: 'Backwaters, houseboats and spice-scented hill stations.' },
};

export function destinationInfo(cityCode: string, catalog: readonly Hotel[] = HOTEL_DATA): DestinationInfo | null {
  const hotels = catalog.filter((h) => h.cityCode === cityCode);
  const first = hotels[0];
  if (!first) return null;
  const extra = BEST_TIME[cityCode] ?? { bestTime: 'Year-round', about: `Stays in ${first.city}, from budget rooms to premium hotels.` };
  const areas = [...new Set(hotels.map((h) => h.area))];
  return {
    city: first.city,
    cityCode,
    hotels,
    areas,
    fromPaise: Math.min(...hotels.flatMap((h) => h.rooms.map((r) => r.pricePerNightPaise))),
    ...extra,
  };
}

export const allDestinations = (catalog: readonly Hotel[] = HOTEL_DATA): DestinationInfo[] =>
  [...new Set(catalog.map((h) => h.cityCode))].map((c) => destinationInfo(c, catalog)).filter((d): d is DestinationInfo => d !== null);

/**
 * Trending destinations: catalogue popularity plus each confirmed booking made on this device
 * (a booking counts as much as 5 recent catalogue bookings).
 */
export function trendingDestinations(
  localBookingCities: readonly string[] = [],
  catalog: readonly Hotel[] = HOTEL_DATA,
): { city: string; cityCode: string; score: number }[] {
  const score = new Map<string, { city: string; score: number }>();
  for (const h of catalog) {
    const cur = score.get(h.cityCode) ?? { city: h.city, score: 0 };
    cur.score += h.popularity;
    score.set(h.cityCode, cur);
  }
  for (const name of localBookingCities) {
    const code = catalog.find((h) => h.city.toLowerCase() === name.toLowerCase())?.cityCode;
    const cur = code ? score.get(code) : undefined;
    if (cur) cur.score += 5;
  }
  return [...score.entries()].map(([cityCode, v]) => ({ cityCode, ...v })).sort((a, b) => b.score - a.score);
}
