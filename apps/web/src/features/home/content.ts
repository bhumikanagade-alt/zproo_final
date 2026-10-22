import type { ImageId } from '@/config/images';

/**
 * Home page merchandising. Fares are indicative "starting from" prices shown as such on the
 * page; from Phase 4 these rows come from live supplier data instead of this file.
 * Amounts are in paise.
 */

export const FLIGHT_DEALS = [
  {
    from: 'PNQ',
    to: 'DEL',
    fromCity: 'Pune',
    toCity: 'New Delhi',
    farePaise: 485000,
    duration: '2h 20m',
  },
  {
    from: 'BOM',
    to: 'GOI',
    fromCity: 'Mumbai',
    toCity: 'Goa',
    farePaise: 289900,
    duration: '1h 15m',
  },
  {
    from: 'BLR',
    to: 'DEL',
    fromCity: 'Bengaluru',
    toCity: 'New Delhi',
    farePaise: 549900,
    duration: '2h 50m',
  },
  {
    from: 'DEL',
    to: 'SXR',
    fromCity: 'New Delhi',
    toCity: 'Srinagar',
    farePaise: 399900,
    duration: '1h 30m',
  },
  {
    from: 'HYD',
    to: 'COK',
    fromCity: 'Hyderabad',
    toCity: 'Kochi',
    farePaise: 369900,
    duration: '1h 40m',
  },
  {
    from: 'BOM',
    to: 'DXB',
    fromCity: 'Mumbai',
    toCity: 'Dubai',
    farePaise: 1149900,
    duration: '3h 10m',
  },
] as const;

/** Popular bus routes, Maharashtra first. Fares are indicative lowest seat prices. */
export const BUS_ROUTES = [
  { from: 'pune', to: 'mumbai', label: 'Pune → Mumbai', farePaise: 29900, duration: '3h 30m' },
  { from: 'mumbai', to: 'goa', label: 'Mumbai → Goa', farePaise: 64900, duration: '12h' },
  { from: 'pune', to: 'goa', label: 'Pune → Goa', farePaise: 59900, duration: '10h' },
  { from: 'pune', to: 'nashik', label: 'Pune → Nashik', farePaise: 32900, duration: '5h' },
  { from: 'mumbai', to: 'kolhapur', label: 'Mumbai → Kolhapur', farePaise: 44900, duration: '8h' },
  { from: 'pune', to: 'nagpur', label: 'Pune → Nagpur', farePaise: 84900, duration: '14h 30m' },
  {
    from: 'mumbai',
    to: 'sambhajinagar',
    label: 'Mumbai → Chhatrapati Sambhajinagar',
    farePaise: 42900,
    duration: '7h 30m',
  },
  { from: 'pune', to: 'bengaluru', label: 'Pune → Bengaluru', farePaise: 89900, duration: '16h' },
] as const;

export const TRAIN_ROUTES = [
  { from: 'PUNE', to: 'NDLS', label: 'Pune → New Delhi', classes: ['1A', '2A', '3A', 'SL'] },
  { from: 'CSMT', to: 'MAO', label: 'Mumbai → Madgaon (Goa)', classes: ['2A', '3A', 'SL', 'CC'] },
  { from: 'NDLS', to: 'JP', label: 'New Delhi → Jaipur', classes: ['CC', 'EC', '3A'] },
  { from: 'SBC', to: 'MAS', label: 'Bengaluru → Chennai', classes: ['CC', 'EC', '2S'] },
] as const;

export const HOTEL_DESTINATIONS: readonly {
  city: string;
  code: string;
  image: ImageId;
  fromPaise: number;
  tagline: string;
}[] = [
  {
    city: 'Goa',
    code: 'goa',
    image: 'hotels/goa',
    fromPaise: 249900,
    tagline: 'Beach resorts & villas',
  },
  {
    city: 'Udaipur',
    code: 'udaipur',
    image: 'hotels/udaipur',
    fromPaise: 319900,
    tagline: 'Lake-view heritage stays',
  },
  {
    city: 'Manali',
    code: 'manali',
    image: 'hotels/manali',
    fromPaise: 179900,
    tagline: 'Mountain lodges & cottages',
  },
  {
    city: 'Mumbai',
    code: 'mumbai',
    image: 'hotels/mumbai',
    fromPaise: 299900,
    tagline: 'Sea-facing city hotels',
  },
  {
    city: 'Kerala',
    code: 'alleppey',
    image: 'hotels/kerala',
    fromPaise: 229900,
    tagline: 'Backwater resorts',
  },
  {
    city: 'Dubai',
    code: 'dubai',
    image: 'hotels/dubai',
    fromPaise: 849900,
    tagline: 'Skyline luxury',
  },
];

export const DESTINATIONS: readonly { name: string; image: ImageId; tagline: string }[] = [
  { name: 'Goa', image: 'destinations/goa', tagline: 'Beaches & nightlife' },
  { name: 'Kashmir', image: 'destinations/kashmir', tagline: 'Paradise on earth' },
  { name: 'Kerala', image: 'destinations/kerala', tagline: 'Backwaters & hills' },
  { name: 'Manali', image: 'destinations/manali', tagline: 'Snow & adventure' },
  { name: 'Rajasthan', image: 'destinations/rajasthan', tagline: 'Forts & deserts' },
  { name: 'Dubai', image: 'destinations/dubai', tagline: 'City of superlatives' },
  { name: 'Mumbai', image: 'destinations/mumbai', tagline: 'The city of dreams' },
  { name: 'Delhi', image: 'destinations/delhi', tagline: 'History meets hustle' },
  { name: 'Pune', image: 'destinations/pune', tagline: 'Culture & weekend treks' },
  { name: 'Bangalore', image: 'destinations/bangalore', tagline: 'Garden city' },
  { name: 'Hyderabad', image: 'destinations/hyderabad', tagline: 'Biryani & heritage' },
];

export const OFFERS = [
  {
    code: 'WELCOME500',
    title: '₹500 off your first booking',
    detail: 'On any service, minimum spend ₹2,000.',
    service: 'All services',
  },
  {
    code: 'FIRSTFLIGHT',
    title: 'Flat ₹750 off your first flight',
    detail: 'Domestic flights, minimum fare ₹4,000.',
    service: 'Flights',
  },
  {
    code: 'BUS100',
    title: '₹100 off bus tickets',
    detail: 'Minimum booking ₹500, twice per user.',
    service: 'Buses',
  },
  {
    code: 'HOTEL10',
    title: '10% off hotels',
    detail: 'Up to ₹1,500 off, stays of 2+ nights.',
    service: 'Hotels',
  },
] as const;
