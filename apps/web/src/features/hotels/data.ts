export type HotelAmenity =
  | 'Wi-Fi'
  | 'Breakfast'
  | 'Pool'
  | 'Parking'
  | 'AC'
  | 'Restaurant'
  | 'Gym'
  | 'Spa'
  | 'Airport transfer'
  | 'Room service'
  | 'Pet friendly'
  | 'Family friendly';

export const ALL_AMENITIES: readonly HotelAmenity[] = [
  'Wi-Fi',
  'Breakfast',
  'Parking',
  'Pool',
  'Gym',
  'Restaurant',
  'Room service',
  'AC',
  'Spa',
  'Airport transfer',
  'Pet friendly',
  'Family friendly',
];

export type PropertyType =
  | 'Hotel'
  | 'Resort'
  | 'Villa'
  | 'Apartment'
  | 'Hostel'
  | 'Guest house'
  | 'Homestay'
  | 'Lodge';

export const PROPERTY_TYPES: readonly PropertyType[] = [
  'Hotel',
  'Resort',
  'Villa',
  'Apartment',
  'Hostel',
  'Guest house',
  'Homestay',
  'Lodge',
];

export type MealPlan = 'ROOM_ONLY' | 'BREAKFAST' | 'HALF_BOARD' | 'FULL_BOARD';

export const MEAL_PLAN_LABEL: Record<MealPlan, string> = {
  ROOM_ONLY: 'Room only',
  BREAKFAST: 'Breakfast included',
  HALF_BOARD: 'Half board (breakfast + dinner)',
  FULL_BOARD: 'Full board (all meals)',
};

export const MEAL_PLAN_SHORT: Record<MealPlan, string> = {
  ROOM_ONLY: 'Room only',
  BREAKFAST: 'Breakfast',
  HALF_BOARD: 'Half board',
  FULL_BOARD: 'Full board',
};

export type LocationTag = 'CITY_CENTER' | 'AIRPORT' | 'RAILWAY' | 'BEACH';

export const LOCATION_TAG_LABEL: Record<LocationTag, string> = {
  CITY_CENTER: 'City center',
  AIRPORT: 'Near airport',
  RAILWAY: 'Near railway station',
  BEACH: 'Near beach',
};

/** How a room can be cancelled. Hours are counted back from the hotel check-in time. */
export interface CancellationTerms {
  /** Full refund up to this many hours before check-in. Omit/0 = no free cancellation. */
  freeUntilHours?: number;
  /** After the free window, this percent of the stay is refunded until `partialUntilHours`. */
  partialPercent?: number;
  partialUntilHours?: number;
}

export interface HotelRoom {
  id: string;
  name: string;
  beds: string;
  /** Maximum guests (adults + children) in one room. */
  guests: number;
  maxAdults: number;
  maxChildren: number;
  size: string;
  view: string;
  image: string;
  amenities: string[];
  mealPlan: MealPlan;
  refundable: boolean;
  breakfast: boolean;
  payAtProperty: boolean;
  cancellation: CancellationTerms;
  /** Price per room per night before taxes. */
  pricePerNightPaise: number;
  /** Struck-through price when the room is on offer. */
  originalPricePerNightPaise?: number;
  roomsLeft: number;
}

export interface Landmark {
  name: string;
  distanceKm: number;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  cityCode: string;
  area: string;
  address: string;
  propertyType: PropertyType;
  rating: number;
  reviewCount: number;
  stars: number;
  distance: string;
  /** Distance in km from the main point of interest used in `distance`. */
  distanceKm: number;
  locationTags: LocationTag[];
  landmarks: Landmark[];
  tags: string[];
  amenities: HotelAmenity[];
  highlights: string[];
  description: string;
  image: string;
  gallery: string[];
  checkInTime: string;
  checkOutTime: string;
  coordinates: { lat: number; lng: number };
  /** Bookings in the last 30 days: drives the "Popularity" sort. */
  popularity: number;
  /** Extra search words (state, nicknames) so "kerala" finds Alleppey. */
  keywords: string[];
  rooms: HotelRoom[];
}

const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const PHOTO = {
  seaResort: 'photo-1566073771259-6a8506099945',
  cityHotel: 'photo-1551882547-ff40c63fe5fa',
  modernHotel: 'photo-1564501049412-61c2a3083791',
  airportHotel: 'photo-1542314831-068cd1dbfeeb',
  poolResort: 'photo-1520250497591-112f2f40a3f4',
  lobby: 'photo-1571896349842-33c89424de2d',
  suite: 'photo-1445019980597-93fa8acb246c',
  kingRoom: 'photo-1578683010236-d716f9a3f461',
  twinRoom: 'photo-1582719478250-c89cae4dc85b',
  bedroom: 'photo-1590490360182-c33d57733427',
  cosy: 'photo-1618773928121-c32242e63f39',
  loft: 'photo-1611892440504-42a792e24d32',
  deluxe: 'photo-1584132967334-10e028bd69f7',
} as const;

const ROOM_IMAGES = [
  PHOTO.kingRoom,
  PHOTO.suite,
  PHOTO.twinRoom,
  PHOTO.bedroom,
  PHOTO.cosy,
  PHOTO.deluxe,
  PHOTO.loft,
];

function gallery(main: string, ...extra: string[]): string[] {
  return [main, ...extra].map((id) => img(id));
}

interface RoomSpec {
  id: string;
  name: string;
  beds: string;
  maxAdults: number;
  maxChildren: number;
  size: string;
  view: string;
  amenities: string[];
  mealPlan: MealPlan;
  cancellation: CancellationTerms;
  payAtProperty?: boolean;
  price: number; // rupees per night
  was?: number; // original rupees per night
  left: number;
}

let roomImageCursor = 0;
function room(spec: RoomSpec): HotelRoom {
  const refundable = (spec.cancellation.freeUntilHours ?? 0) > 0;
  const image = img(ROOM_IMAGES[roomImageCursor % ROOM_IMAGES.length] ?? PHOTO.kingRoom, 900);
  roomImageCursor += 1;
  const result: HotelRoom = {
    id: spec.id,
    name: spec.name,
    beds: spec.beds,
    guests: Math.min(4, spec.maxAdults + spec.maxChildren),
    maxAdults: spec.maxAdults,
    maxChildren: spec.maxChildren,
    size: spec.size,
    view: spec.view,
    image,
    amenities: spec.amenities,
    mealPlan: spec.mealPlan,
    refundable,
    breakfast: spec.mealPlan !== 'ROOM_ONLY',
    payAtProperty: spec.payAtProperty ?? false,
    cancellation: spec.cancellation,
    pricePerNightPaise: spec.price * 100,
    roomsLeft: spec.left,
  };
  if (spec.was) result.originalPricePerNightPaise = spec.was * 100;
  return result;
}

const FREE_48 = { freeUntilHours: 48 } satisfies CancellationTerms;
const FREE_24 = { freeUntilHours: 24 } satisfies CancellationTerms;
const FLEX_PARTIAL = {
  freeUntilHours: 72,
  partialPercent: 50,
  partialUntilHours: 24,
} satisfies CancellationTerms;
const NON_REFUNDABLE: CancellationTerms = {};

export const HOTEL_DATA: readonly Hotel[] = [
  {
    id: 'zp-goa-001',
    name: 'ZPROO Seaview Resort',
    city: 'Goa',
    cityCode: 'goa',
    area: 'Candolim',
    address: 'Candolim Beach Road, Candolim, Bardez, Goa 403515',
    propertyType: 'Resort',
    rating: 4.7,
    reviewCount: 1842,
    stars: 5,
    distance: '650 m from Candolim Beach',
    distanceKm: 0.65,
    locationTags: ['BEACH'],
    landmarks: [
      { name: 'Candolim Beach', distanceKm: 0.65 },
      { name: 'Fort Aguada', distanceKm: 3.2 },
      { name: 'Goa International Airport (GOI)', distanceKm: 38 },
    ],
    tags: ['Beachfront', 'Couples choice', 'Breakfast included'],
    amenities: ['Wi-Fi', 'Breakfast', 'Pool', 'Parking', 'AC', 'Restaurant', 'Gym', 'Spa', 'Room service', 'Family friendly'],
    highlights: ['Infinity pool facing the Arabian Sea', 'Spa and wellness centre', 'Short walk to Candolim Beach'],
    description:
      'A premium coastal stay with a pool, spacious rooms and easy access to North Goa beaches.',
    image: img(PHOTO.seaResort),
    gallery: gallery(PHOTO.seaResort, PHOTO.poolResort, PHOTO.lobby, PHOTO.suite, PHOTO.kingRoom),
    checkInTime: '14:00',
    checkOutTime: '11:00',
    coordinates: { lat: 15.518, lng: 73.762 },
    popularity: 940,
    keywords: ['north goa', 'beach', 'baga', 'calangute'],
    rooms: [
      room({ id: 'sea-deluxe', name: 'Deluxe Sea View', beds: '1 King Bed', maxAdults: 2, maxChildren: 0, size: '32 m²', view: 'Sea view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Balcony', 'Mini bar'], mealPlan: 'BREAKFAST', cancellation: FREE_48, price: 6500, was: 7800, left: 4 }),
      room({ id: 'sea-premium', name: 'Premium Sea View', beds: '1 King Bed', maxAdults: 2, maxChildren: 1, size: '42 m²', view: 'Sea view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Private balcony', 'Bathtub'], mealPlan: 'HALF_BOARD', cancellation: FLEX_PARTIAL, price: 8200, left: 2 }),
      room({ id: 'family-suite', name: 'Family Suite', beds: '1 King + 1 Sofa Bed', maxAdults: 3, maxChildren: 2, size: '55 m²', view: 'Garden & pool view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Living area', 'Kitchenette'], mealPlan: 'BREAKFAST', cancellation: NON_REFUNDABLE, price: 10400, was: 12000, left: 3 }),
    ],
  },
  {
    id: 'zp-goa-012',
    name: 'Palm Grove Beach Villa',
    city: 'Goa',
    cityCode: 'goa',
    area: 'Palolem',
    address: 'Palolem Beach Road, Canacona, South Goa 403702',
    propertyType: 'Villa',
    rating: 4.3,
    reviewCount: 312,
    stars: 3,
    distance: '300 m from Palolem Beach',
    distanceKm: 0.3,
    locationTags: ['BEACH'],
    landmarks: [
      { name: 'Palolem Beach', distanceKm: 0.3 },
      { name: 'Cabo de Rama Fort', distanceKm: 11 },
    ],
    tags: ['Private villa', 'Pet friendly', 'Pay at property'],
    amenities: ['Wi-Fi', 'Parking', 'AC', 'Pet friendly', 'Family friendly', 'Room service'],
    highlights: ['Private garden and sit-out', 'Pets welcome', 'Self check-in available'],
    description:
      'A quiet South Goa villa a few steps from Palolem, ideal for families and small groups.',
    image: img(PHOTO.poolResort),
    gallery: gallery(PHOTO.poolResort, PHOTO.bedroom, PHOTO.cosy, PHOTO.lobby),
    checkInTime: '13:00',
    checkOutTime: '11:00',
    coordinates: { lat: 15.01, lng: 74.0232 },
    popularity: 310,
    keywords: ['south goa', 'beach', 'canacona'],
    rooms: [
      room({ id: 'pg-garden', name: 'Garden Room', beds: '1 Queen Bed', maxAdults: 2, maxChildren: 1, size: '24 m²', view: 'Garden view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Sit-out'], mealPlan: 'ROOM_ONLY', cancellation: FREE_24, payAtProperty: true, price: 2800, left: 5 }),
      room({ id: 'pg-villa', name: 'Two-Bedroom Villa', beds: '2 Queen Beds', maxAdults: 4, maxChildren: 0, size: '70 m²', view: 'Garden view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Kitchen', 'Private garden'], mealPlan: 'BREAKFAST', cancellation: FREE_48, payAtProperty: true, price: 5900, was: 6900, left: 2 }),
    ],
  },
  {
    id: 'zp-mum-002',
    name: 'ZPROO Central Mumbai',
    city: 'Mumbai',
    cityCode: 'mumbai',
    area: 'Andheri East',
    address: 'Sahar Road, Andheri East, Mumbai, Maharashtra 400099',
    propertyType: 'Hotel',
    rating: 4.5,
    reviewCount: 967,
    stars: 4,
    distance: '1.2 km from Mumbai Airport',
    distanceKm: 1.2,
    locationTags: ['AIRPORT', 'CITY_CENTER'],
    landmarks: [
      { name: 'Chhatrapati Shivaji Maharaj Airport', distanceKm: 1.2 },
      { name: 'Andheri Metro Station', distanceKm: 1.6 },
      { name: 'Bandra Kurla Complex', distanceKm: 7.5 },
    ],
    tags: ['Business stay', 'Airport nearby', 'Free cancellation'],
    amenities: ['Wi-Fi', 'Breakfast', 'Parking', 'AC', 'Restaurant', 'Gym', 'Room service', 'Airport transfer'],
    highlights: ['Complimentary airport shuttle', 'Work desks and fast Wi-Fi', 'Walkable to the metro'],
    description:
      'A convenient business hotel close to the airport, metro and major commercial districts.',
    image: img(PHOTO.cityHotel),
    gallery: gallery(PHOTO.cityHotel, PHOTO.lobby, PHOTO.kingRoom, PHOTO.twinRoom),
    checkInTime: '14:00',
    checkOutTime: '12:00',
    coordinates: { lat: 19.1136, lng: 72.8697 },
    popularity: 720,
    keywords: ['bombay', 'andheri', 'airport'],
    rooms: [
      room({ id: 'city-deluxe', name: 'Deluxe City Room', beds: '1 Queen Bed', maxAdults: 2, maxChildren: 0, size: '28 m²', view: 'City view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Work desk'], mealPlan: 'BREAKFAST', cancellation: FREE_48, price: 4900, left: 6 }),
      room({ id: 'business', name: 'Business King', beds: '1 King Bed', maxAdults: 2, maxChildren: 1, size: '34 m²', view: 'City view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Work desk', 'Lounge access'], mealPlan: 'BREAKFAST', cancellation: FLEX_PARTIAL, price: 5900, was: 6800, left: 5 }),
      room({ id: 'city-saver', name: 'Saver Room (Room Only)', beds: '1 Double Bed', maxAdults: 2, maxChildren: 0, size: '22 m²', view: 'Courtyard view', amenities: ['Free Wi-Fi', 'Air conditioning'], mealPlan: 'ROOM_ONLY', cancellation: NON_REFUNDABLE, price: 3900, left: 8 }),
    ],
  },
  {
    id: 'zp-mum-013',
    name: 'Juhu Shore Residency',
    city: 'Mumbai',
    cityCode: 'mumbai',
    area: 'Juhu',
    address: 'Juhu Tara Road, Juhu, Mumbai, Maharashtra 400049',
    propertyType: 'Hotel',
    rating: 4.2,
    reviewCount: 538,
    stars: 4,
    distance: '400 m from Juhu Beach',
    distanceKm: 0.4,
    locationTags: ['BEACH', 'CITY_CENTER'],
    landmarks: [
      { name: 'Juhu Beach', distanceKm: 0.4 },
      { name: 'ISKCON Temple Juhu', distanceKm: 1.3 },
      { name: 'Mumbai Airport', distanceKm: 6.1 },
    ],
    tags: ['Sea breeze', 'Family friendly', 'Pay at property'],
    amenities: ['Wi-Fi', 'Breakfast', 'Parking', 'AC', 'Restaurant', 'Room service', 'Family friendly'],
    highlights: ['Rooftop restaurant', 'Close to Juhu Beach', 'Family rooms available'],
    description: 'A comfortable seaside hotel in Juhu with easy access to the beach and Bollywood hangouts.',
    image: img(PHOTO.lobby),
    gallery: gallery(PHOTO.lobby, PHOTO.cityHotel, PHOTO.twinRoom, PHOTO.deluxe),
    checkInTime: '14:00',
    checkOutTime: '11:00',
    coordinates: { lat: 19.1075, lng: 72.8263 },
    popularity: 455,
    keywords: ['bombay', 'juhu', 'beach'],
    rooms: [
      room({ id: 'juhu-std', name: 'Standard Twin', beds: '2 Single Beds', maxAdults: 2, maxChildren: 1, size: '24 m²', view: 'City view', amenities: ['Free Wi-Fi', 'Air conditioning'], mealPlan: 'BREAKFAST', cancellation: FREE_24, payAtProperty: true, price: 4200, left: 7 }),
      room({ id: 'juhu-family', name: 'Family Room', beds: '1 King + 1 Single', maxAdults: 3, maxChildren: 1, size: '38 m²', view: 'Sea glimpse', amenities: ['Free Wi-Fi', 'Air conditioning', 'Sofa'], mealPlan: 'HALF_BOARD', cancellation: FREE_48, price: 6800, was: 7900, left: 2 }),
    ],
  },
  {
    id: 'zp-pune-003',
    name: 'ZPROO Koregaon Park',
    city: 'Pune',
    cityCode: 'pune',
    area: 'Koregaon Park',
    address: 'Lane 5, Koregaon Park, Pune, Maharashtra 411001',
    propertyType: 'Hotel',
    rating: 4.6,
    reviewCount: 721,
    stars: 4,
    distance: '900 m from Osho Garden',
    distanceKm: 0.9,
    locationTags: ['CITY_CENTER'],
    landmarks: [
      { name: 'Osho Garden', distanceKm: 0.9 },
      { name: 'Pune Railway Station', distanceKm: 3.4 },
      { name: 'Pune Airport', distanceKm: 8.6 },
    ],
    tags: ['City centre', 'Breakfast available', 'Quiet rooms'],
    amenities: ['Wi-Fi', 'Breakfast', 'Pool', 'AC', 'Restaurant', 'Gym', 'Room service'],
    highlights: ['Rooftop pool', 'Cafés and nightlife on the doorstep', 'Work-friendly lounges'],
    description:
      'A modern city stay in Koregaon Park with comfortable rooms and work-friendly spaces.',
    image: img(PHOTO.modernHotel),
    gallery: gallery(PHOTO.modernHotel, PHOTO.lobby, PHOTO.bedroom, PHOTO.suite),
    checkInTime: '14:00',
    checkOutTime: '12:00',
    coordinates: { lat: 18.5362, lng: 73.8939 },
    popularity: 610,
    keywords: ['poona', 'kp', 'osho'],
    rooms: [
      room({ id: 'kp-superior', name: 'Superior Room', beds: '1 Queen Bed', maxAdults: 2, maxChildren: 0, size: '30 m²', view: 'City view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Work desk'], mealPlan: 'ROOM_ONLY', cancellation: FREE_24, price: 3900, left: 7 }),
      room({ id: 'kp-suite', name: 'Executive Suite', beds: '1 King Bed', maxAdults: 3, maxChildren: 0, size: '46 m²', view: 'Pool view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Lounge access', 'Bathtub'], mealPlan: 'BREAKFAST', cancellation: FLEX_PARTIAL, price: 6100, was: 7000, left: 3 }),
    ],
  },
  {
    id: 'zp-pune-014',
    name: 'Hinjewadi Tech Inn',
    city: 'Pune',
    cityCode: 'pune',
    area: 'Hinjewadi',
    address: 'Phase 1, Rajiv Gandhi Infotech Park, Hinjewadi, Pune 411057',
    propertyType: 'Guest house',
    rating: 4.0,
    reviewCount: 214,
    stars: 3,
    distance: '1.1 km from Rajiv Gandhi IT Park',
    distanceKm: 1.1,
    locationTags: [],
    landmarks: [
      { name: 'Rajiv Gandhi Infotech Park', distanceKm: 1.1 },
      { name: 'Pune Railway Station', distanceKm: 19 },
    ],
    tags: ['Budget', 'Pay at property', 'Work-friendly'],
    amenities: ['Wi-Fi', 'Breakfast', 'Parking', 'AC', 'Restaurant'],
    highlights: ['Shuttle to IT park campuses', '24-hour front desk', 'Pay at the property'],
    description: 'A practical guest house for IT-park travellers with quick check-in and breakfast.',
    image: img(PHOTO.deluxe),
    gallery: gallery(PHOTO.deluxe, PHOTO.cosy, PHOTO.twinRoom),
    checkInTime: '12:00',
    checkOutTime: '11:00',
    coordinates: { lat: 18.5912, lng: 73.7389 },
    popularity: 260,
    keywords: ['it park', 'hinjawadi', 'phase 1'],
    rooms: [
      room({ id: 'ht-std', name: 'Standard Room', beds: '1 Double Bed', maxAdults: 2, maxChildren: 1, size: '20 m²', view: 'City view', amenities: ['Free Wi-Fi', 'Air conditioning'], mealPlan: 'BREAKFAST', cancellation: FREE_24, payAtProperty: true, price: 2100, left: 9 }),
      room({ id: 'ht-twin', name: 'Twin Room (Room Only)', beds: '2 Single Beds', maxAdults: 2, maxChildren: 0, size: '20 m²', view: 'City view', amenities: ['Free Wi-Fi', 'Air conditioning'], mealPlan: 'ROOM_ONLY', cancellation: NON_REFUNDABLE, payAtProperty: false, price: 1700, left: 6 }),
    ],
  },
  {
    id: 'zp-del-004',
    name: 'ZPROO Aerocity',
    city: 'Delhi',
    cityCode: 'delhi',
    area: 'Aerocity',
    address: 'Hospitality District, Aerocity, New Delhi 110037',
    propertyType: 'Hotel',
    rating: 4.4,
    reviewCount: 1104,
    stars: 5,
    distance: '1.8 km from Delhi Airport',
    distanceKm: 1.8,
    locationTags: ['AIRPORT'],
    landmarks: [
      { name: 'Indira Gandhi International Airport', distanceKm: 1.8 },
      { name: 'Aerocity Metro Station', distanceKm: 0.5 },
      { name: 'Connaught Place', distanceKm: 15 },
    ],
    tags: ['Airport hotel', 'Luxury', 'Free Wi-Fi'],
    amenities: ['Wi-Fi', 'Breakfast', 'Pool', 'Parking', 'AC', 'Restaurant', 'Gym', 'Spa', 'Airport transfer', 'Room service'],
    highlights: ['Metro station next door', 'Airport transfers on request', 'Rooftop pool and spa'],
    description:
      'A full-service airport hotel designed for short business trips and premium city stays.',
    image: img(PHOTO.airportHotel),
    gallery: gallery(PHOTO.airportHotel, PHOTO.poolResort, PHOTO.lobby, PHOTO.suite, PHOTO.kingRoom),
    checkInTime: '15:00',
    checkOutTime: '12:00',
    coordinates: { lat: 28.5562, lng: 77.1 },
    popularity: 805,
    keywords: ['new delhi', 'igi', 'airport', 'aerocity'],
    rooms: [
      room({ id: 'aero-deluxe', name: 'Deluxe King', beds: '1 King Bed', maxAdults: 2, maxChildren: 0, size: '35 m²', view: 'City view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Work desk'], mealPlan: 'BREAKFAST', cancellation: FREE_48, price: 7200, was: 8400, left: 4 }),
      room({ id: 'aero-suite', name: 'Executive Suite', beds: '1 King Bed + Sofa', maxAdults: 3, maxChildren: 1, size: '58 m²', view: 'Runway view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Lounge access', 'Bathtub'], mealPlan: 'FULL_BOARD', cancellation: FLEX_PARTIAL, price: 11200, left: 2 }),
    ],
  },
  {
    id: 'zp-del-015',
    name: 'Paharganj Backpackers Hostel',
    city: 'Delhi',
    cityCode: 'delhi',
    area: 'Paharganj',
    address: 'Main Bazaar, Paharganj, New Delhi 110055',
    propertyType: 'Hostel',
    rating: 3.9,
    reviewCount: 689,
    stars: 2,
    distance: '600 m from New Delhi Railway Station',
    distanceKm: 0.6,
    locationTags: ['RAILWAY', 'CITY_CENTER'],
    landmarks: [
      { name: 'New Delhi Railway Station', distanceKm: 0.6 },
      { name: 'Connaught Place', distanceKm: 1.9 },
    ],
    tags: ['Budget', 'Social', 'Pay at property'],
    amenities: ['Wi-Fi', 'Breakfast', 'AC', 'Restaurant'],
    highlights: ['Rooftop common area', 'Lockers in every room', 'Walk to the railway station'],
    description: 'A friendly budget hostel next to the railway station, great for solo travellers.',
    image: img(PHOTO.cosy),
    gallery: gallery(PHOTO.cosy, PHOTO.loft, PHOTO.bedroom),
    checkInTime: '12:00',
    checkOutTime: '10:00',
    coordinates: { lat: 28.643, lng: 77.213 },
    popularity: 530,
    keywords: ['new delhi', 'railway', 'station', 'backpacker'],
    rooms: [
      room({ id: 'ph-private', name: 'Private Double Room', beds: '1 Double Bed', maxAdults: 2, maxChildren: 0, size: '14 m²', view: 'Street view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Locker'], mealPlan: 'BREAKFAST', cancellation: FREE_24, payAtProperty: true, price: 1500, left: 6 }),
      room({ id: 'ph-family', name: 'Family Room', beds: '2 Double Beds', maxAdults: 3, maxChildren: 1, size: '22 m²', view: 'Courtyard view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Locker'], mealPlan: 'ROOM_ONLY', cancellation: NON_REFUNDABLE, price: 2400, left: 3 }),
    ],
  },
  {
    id: 'zp-udr-016',
    name: 'Lake Pichola Heritage Haveli',
    city: 'Udaipur',
    cityCode: 'udaipur',
    area: 'Lake Pichola',
    address: 'Gangaur Ghat Marg, Lake Pichola, Udaipur, Rajasthan 313001',
    propertyType: 'Hotel',
    rating: 4.8,
    reviewCount: 1275,
    stars: 5,
    distance: '250 m from Lake Pichola',
    distanceKm: 0.25,
    locationTags: ['CITY_CENTER'],
    landmarks: [
      { name: 'Lake Pichola', distanceKm: 0.25 },
      { name: 'City Palace', distanceKm: 0.7 },
      { name: 'Udaipur City Railway Station', distanceKm: 2.8 },
    ],
    tags: ['Heritage', 'Lake view', 'Couples choice'],
    amenities: ['Wi-Fi', 'Breakfast', 'Pool', 'AC', 'Restaurant', 'Spa', 'Room service', 'Airport transfer'],
    highlights: ['Rooftop dining with lake views', 'Restored 18th-century haveli', 'Sunset boat rides on request'],
    description: 'A restored haveli on the lake with carved balconies, rooftop dining and palace views.',
    image: img(PHOTO.suite),
    gallery: gallery(PHOTO.suite, PHOTO.lobby, PHOTO.kingRoom, PHOTO.poolResort),
    checkInTime: '14:00',
    checkOutTime: '11:00',
    coordinates: { lat: 24.5714, lng: 73.6803 },
    popularity: 690,
    keywords: ['rajasthan', 'lake', 'city palace', 'haveli'],
    rooms: [
      room({ id: 'udr-lake', name: 'Lake View Room', beds: '1 King Bed', maxAdults: 2, maxChildren: 1, size: '30 m²', view: 'Lake view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Balcony'], mealPlan: 'BREAKFAST', cancellation: FREE_48, price: 8500, was: 9800, left: 3 }),
      room({ id: 'udr-royal', name: 'Royal Suite', beds: '1 King + Daybed', maxAdults: 3, maxChildren: 1, size: '60 m²', view: 'Palace & lake view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Private terrace', 'Bathtub'], mealPlan: 'HALF_BOARD', cancellation: FLEX_PARTIAL, price: 14500, left: 1 }),
    ],
  },
  {
    id: 'zp-mnl-017',
    name: 'Snowline Mountain Lodge',
    city: 'Manali',
    cityCode: 'manali',
    area: 'Old Manali',
    address: 'Old Manali Road, Manali, Himachal Pradesh 175131',
    propertyType: 'Lodge',
    rating: 4.4,
    reviewCount: 402,
    stars: 3,
    distance: '1.4 km from Mall Road',
    distanceKm: 1.4,
    locationTags: [],
    landmarks: [
      { name: 'Mall Road', distanceKm: 1.4 },
      { name: 'Hadimba Temple', distanceKm: 2.6 },
      { name: 'Solang Valley', distanceKm: 13 },
    ],
    tags: ['Mountain view', 'Bonfire evenings', 'Pet friendly'],
    amenities: ['Wi-Fi', 'Breakfast', 'Parking', 'Restaurant', 'Pet friendly', 'Family friendly', 'Room service'],
    highlights: ['Valley-facing balconies', 'Bonfire and live music evenings', 'Heated rooms'],
    description: 'A wooden lodge with valley views, warm rooms and a bonfire courtyard in Old Manali.',
    image: img(PHOTO.loft),
    gallery: gallery(PHOTO.loft, PHOTO.cosy, PHOTO.bedroom),
    checkInTime: '13:00',
    checkOutTime: '10:00',
    coordinates: { lat: 32.2396, lng: 77.1887 },
    popularity: 380,
    keywords: ['himachal', 'snow', 'mountain', 'hill'],
    rooms: [
      room({ id: 'mnl-cottage', name: 'Valley Cottage', beds: '1 Queen Bed', maxAdults: 2, maxChildren: 1, size: '26 m²', view: 'Mountain view', amenities: ['Free Wi-Fi', 'Room heater', 'Balcony'], mealPlan: 'BREAKFAST', cancellation: FREE_48, payAtProperty: true, price: 3400, left: 5 }),
      room({ id: 'mnl-family', name: 'Family Attic Suite', beds: '2 Queen Beds', maxAdults: 4, maxChildren: 0, size: '44 m²', view: 'Mountain view', amenities: ['Free Wi-Fi', 'Room heater', 'Living area'], mealPlan: 'FULL_BOARD', cancellation: FREE_24, price: 6200, was: 7200, left: 2 }),
    ],
  },
  {
    id: 'zp-alp-018',
    name: 'Kuttanad Backwater Homestay',
    city: 'Alleppey',
    cityCode: 'alleppey',
    area: 'Punnamada',
    address: 'Punnamada Kayal Road, Alappuzha, Kerala 688006',
    propertyType: 'Homestay',
    rating: 4.6,
    reviewCount: 233,
    stars: 3,
    distance: '800 m from Alleppey Backwaters Jetty',
    distanceKm: 0.8,
    locationTags: [],
    landmarks: [
      { name: 'Alleppey Backwaters Jetty', distanceKm: 0.8 },
      { name: 'Alappuzha Railway Station', distanceKm: 4.1 },
      { name: 'Alleppey Beach', distanceKm: 5.2 },
    ],
    tags: ['Backwater view', 'Home-cooked meals', 'Family friendly'],
    amenities: ['Wi-Fi', 'Breakfast', 'Parking', 'AC', 'Family friendly', 'Restaurant'],
    highlights: ['Home-cooked Kerala meals', 'Canoe rides at sunrise', 'Hosted by a local family'],
    description: 'A family-run homestay on the backwaters with home-cooked meals and canoe rides.',
    image: img(PHOTO.bedroom),
    gallery: gallery(PHOTO.bedroom, PHOTO.cosy, PHOTO.deluxe),
    checkInTime: '12:00',
    checkOutTime: '10:00',
    coordinates: { lat: 9.4981, lng: 76.3388 },
    popularity: 290,
    keywords: ['kerala', 'backwater', 'alappuzha', 'houseboat'],
    rooms: [
      room({ id: 'alp-lake', name: 'Lakeside Room', beds: '1 Double Bed', maxAdults: 2, maxChildren: 1, size: '25 m²', view: 'Backwater view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Sit-out'], mealPlan: 'FULL_BOARD', cancellation: FREE_48, payAtProperty: true, price: 3600, left: 4 }),
      room({ id: 'alp-family', name: 'Family Cottage', beds: '2 Double Beds', maxAdults: 3, maxChildren: 1, size: '38 m²', view: 'Garden view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Private sit-out'], mealPlan: 'HALF_BOARD', cancellation: FREE_24, price: 5200, was: 5900, left: 2 }),
    ],
  },
  {
    id: 'zp-dxb-019',
    name: 'Marina Skyline Apartments',
    city: 'Dubai',
    cityCode: 'dubai',
    area: 'Dubai Marina',
    address: 'Marina Walk, Dubai Marina, Dubai, UAE',
    propertyType: 'Apartment',
    rating: 4.5,
    reviewCount: 856,
    stars: 4,
    distance: '350 m from Dubai Marina Mall',
    distanceKm: 0.35,
    locationTags: ['CITY_CENTER', 'BEACH'],
    landmarks: [
      { name: 'Dubai Marina Mall', distanceKm: 0.35 },
      { name: 'JBR Beach', distanceKm: 1.2 },
      { name: 'Dubai International Airport', distanceKm: 32 },
    ],
    tags: ['Skyline view', 'Apartment stay', 'Free cancellation'],
    amenities: ['Wi-Fi', 'Pool', 'Parking', 'AC', 'Gym', 'Family friendly', 'Airport transfer'],
    highlights: ['Full kitchen in every apartment', 'Rooftop pool with skyline views', 'Tram and beach nearby'],
    description: 'Serviced apartments in Dubai Marina with kitchens, skyline views and a rooftop pool.',
    image: img(PHOTO.lobby),
    gallery: gallery(PHOTO.lobby, PHOTO.suite, PHOTO.loft, PHOTO.poolResort),
    checkInTime: '15:00',
    checkOutTime: '12:00',
    coordinates: { lat: 25.0805, lng: 55.1403 },
    popularity: 575,
    keywords: ['uae', 'marina', 'jbr', 'emirates'],
    rooms: [
      room({ id: 'dxb-1br', name: 'One-Bedroom Apartment', beds: '1 King Bed + Sofa Bed', maxAdults: 3, maxChildren: 1, size: '62 m²', view: 'Skyline view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Full kitchen', 'Washer'], mealPlan: 'ROOM_ONLY', cancellation: FREE_48, price: 13800, was: 15900, left: 4 }),
      room({ id: 'dxb-2br', name: 'Two-Bedroom Apartment', beds: '1 King + 2 Single Beds', maxAdults: 4, maxChildren: 0, size: '98 m²', view: 'Marina view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Full kitchen', 'Washer'], mealPlan: 'BREAKFAST', cancellation: FLEX_PARTIAL, price: 21500, left: 2 }),
    ],
  },
  {
    id: 'zp-blr-020',
    name: 'ZPROO Indiranagar Suites',
    city: 'Bangalore',
    cityCode: 'bangalore',
    area: 'Indiranagar',
    address: '100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038',
    propertyType: 'Hotel',
    rating: 4.4,
    reviewCount: 648,
    stars: 4,
    distance: '700 m from Indiranagar Metro Station',
    distanceKm: 0.7,
    locationTags: ['CITY_CENTER'],
    landmarks: [
      { name: 'Indiranagar Metro Station', distanceKm: 0.7 },
      { name: 'MG Road', distanceKm: 4.2 },
      { name: 'Kempegowda International Airport', distanceKm: 36 },
    ],
    tags: ['Garden city', 'Cafés nearby', 'Free cancellation'],
    amenities: ['Wi-Fi', 'Breakfast', 'Parking', 'AC', 'Restaurant', 'Gym', 'Room service'],
    highlights: ['Walkable to cafés and breweries', 'Fast Wi-Fi and work lounge', 'Metro station nearby'],
    description: 'A stylish business and leisure hotel in the heart of Indiranagar, close to the metro.',
    image: img(PHOTO.modernHotel),
    gallery: gallery(PHOTO.modernHotel, PHOTO.lobby, PHOTO.kingRoom, PHOTO.suite),
    checkInTime: '14:00',
    checkOutTime: '12:00',
    coordinates: { lat: 12.9784, lng: 77.6408 },
    popularity: 560,
    keywords: ['bengaluru', 'bangalore', 'garden city', 'karnataka'],
    rooms: [
      room({ id: 'blr-deluxe', name: 'Deluxe Room', beds: '1 Queen Bed', maxAdults: 2, maxChildren: 1, size: '28 m²', view: 'City view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Work desk'], mealPlan: 'BREAKFAST', cancellation: FREE_48, price: 4600, was: 5400, left: 6 }),
      room({ id: 'blr-suite', name: 'Studio Suite', beds: '1 King Bed + Sofa', maxAdults: 3, maxChildren: 1, size: '45 m²', view: 'Garden view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Kitchenette', 'Lounge access'], mealPlan: 'HALF_BOARD', cancellation: FLEX_PARTIAL, price: 7400, left: 3 }),
    ],
  },
  {
    id: 'zp-hyd-021',
    name: 'Banjara Heritage Residency',
    city: 'Hyderabad',
    cityCode: 'hyderabad',
    area: 'Banjara Hills',
    address: 'Road No. 12, Banjara Hills, Hyderabad, Telangana 500034',
    propertyType: 'Hotel',
    rating: 4.3,
    reviewCount: 502,
    stars: 4,
    distance: '2.3 km from Charminar Road',
    distanceKm: 2.3,
    locationTags: ['CITY_CENTER'],
    landmarks: [
      { name: 'Charminar', distanceKm: 7.8 },
      { name: 'Hussain Sagar Lake', distanceKm: 5.1 },
      { name: 'Rajiv Gandhi International Airport', distanceKm: 28 },
    ],
    tags: ['Biryani trail', 'Heritage decor', 'Pay at property'],
    amenities: ['Wi-Fi', 'Breakfast', 'Pool', 'Parking', 'AC', 'Restaurant', 'Room service', 'Family friendly'],
    highlights: ['Rooftop pool', 'Hyderabadi cuisine restaurant', 'Close to Banjara Hills cafés'],
    description: 'A comfortable heritage-style hotel in Banjara Hills with a rooftop pool and local cuisine.',
    image: img(PHOTO.lobby),
    gallery: gallery(PHOTO.lobby, PHOTO.poolResort, PHOTO.bedroom, PHOTO.deluxe),
    checkInTime: '14:00',
    checkOutTime: '11:00',
    coordinates: { lat: 17.4126, lng: 78.4482 },
    popularity: 410,
    keywords: ['telangana', 'banjara hills', 'biryani', 'charminar'],
    rooms: [
      room({ id: 'hyd-classic', name: 'Classic Room', beds: '1 Queen Bed', maxAdults: 2, maxChildren: 1, size: '26 m²', view: 'City view', amenities: ['Free Wi-Fi', 'Air conditioning'], mealPlan: 'BREAKFAST', cancellation: FREE_24, payAtProperty: true, price: 3800, left: 8 }),
      room({ id: 'hyd-family', name: 'Family Suite', beds: '1 King + 1 Single', maxAdults: 3, maxChildren: 1, size: '42 m²', view: 'Pool view', amenities: ['Free Wi-Fi', 'Air conditioning', 'Sofa'], mealPlan: 'HALF_BOARD', cancellation: FREE_48, price: 6300, was: 7200, left: 3 }),
    ],
  },
  {
    id: 'zp-srn-022',
    name: 'Dal Lake Shikara Resort',
    city: 'Srinagar',
    cityCode: 'srinagar',
    area: 'Dal Lake',
    address: 'Boulevard Road, Dal Lake, Srinagar, Jammu & Kashmir 190001',
    propertyType: 'Resort',
    rating: 4.7,
    reviewCount: 389,
    stars: 4,
    distance: '200 m from Dal Lake',
    distanceKm: 0.2,
    locationTags: [],
    landmarks: [
      { name: 'Dal Lake', distanceKm: 0.2 },
      { name: 'Mughal Gardens', distanceKm: 6 },
      { name: 'Srinagar Airport', distanceKm: 14 },
    ],
    tags: ['Lake view', 'Shikara rides', 'Couples choice'],
    amenities: ['Wi-Fi', 'Breakfast', 'Parking', 'Restaurant', 'Room service', 'Family friendly'],
    highlights: ['Shikara rides from the resort ghat', 'Kashmiri Wazwan dining', 'Heated rooms'],
    description: 'A lakeside resort on Dal Lake with warm rooms, Kashmiri cuisine and sunrise shikara rides.',
    image: img(PHOTO.suite),
    gallery: gallery(PHOTO.suite, PHOTO.cosy, PHOTO.lobby, PHOTO.loft),
    checkInTime: '13:00',
    checkOutTime: '11:00',
    coordinates: { lat: 34.0837, lng: 74.8731 },
    popularity: 350,
    keywords: ['kashmir', 'jammu', 'dal lake', 'shikara', 'srinagar'],
    rooms: [
      room({ id: 'srn-lake', name: 'Lake View Room', beds: '1 King Bed', maxAdults: 2, maxChildren: 1, size: '30 m²', view: 'Lake view', amenities: ['Free Wi-Fi', 'Room heater', 'Balcony'], mealPlan: 'BREAKFAST', cancellation: FREE_48, price: 5200, was: 6100, left: 4 }),
      room({ id: 'srn-family', name: 'Family Cottage', beds: '2 Queen Beds', maxAdults: 4, maxChildren: 0, size: '50 m²', view: 'Garden view', amenities: ['Free Wi-Fi', 'Room heater', 'Living area'], mealPlan: 'FULL_BOARD', cancellation: FLEX_PARTIAL, price: 8800, left: 2 }),
    ],
  },
];

export const HOTEL_COUPONS: Record<string, number> = {
  ZPROO10: 10,
  STAY15: 15,
};

/** Estimated taxes & service fees, as a share of the room price. */
export const HOTEL_TAX_RATE = 0.12;

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();
  const nights = Math.round((end - start) / 86_400_000);
  return Number.isFinite(nights) ? Math.max(1, nights) : 1;
}

export function findHotel(id: string): Hotel | undefined {
  return HOTEL_DATA.find((hotel) => hotel.id === id);
}

export function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function hotelTotal(room: HotelRoom, nights: number, rooms: number): number {
  const subtotal = room.pricePerNightPaise * nights * rooms;
  const taxes = Math.round(subtotal * HOTEL_TAX_RATE);
  return subtotal + taxes;
}

/** Google Maps links built from the hotel's coordinates (no API key needed). */
export function hotelMapLinks(hotel: Pick<Hotel, 'name' | 'coordinates'>) {
  const { lat, lng } = hotel.coordinates;
  return {
    embed: `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`,
    open: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  };
}
