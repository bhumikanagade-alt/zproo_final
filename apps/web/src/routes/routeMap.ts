/**
 * UI page map. Every customer-facing route is registered from day one so navigation never
 * leads to a broken link; each renders a placeholder until its phase ships and replaces it
 * with the real page.
 */
export interface PlannedRoute {
  path: string;
  title: string;
  description: string;
  phase: number;
  /** Account pages: only for signed-in users. */
  requiresAuth?: boolean;
}

export const PUBLIC_ROUTES: readonly PlannedRoute[] = [
  // Hotels — Phase 7
  { path: '/hotels', title: 'Hotels', description: 'Stays in top destinations.', phase: 7 },
  {
    path: '/hotels/results',
    title: 'Hotel results',
    description: 'Filter by price, rating, amenities and location.',
    phase: 7,
  },
  {
    path: '/hotels/:id',
    title: 'Hotel details',
    description: 'Photos, amenities, policies and reviews.',
    phase: 7,
  },
  {
    path: '/hotels/:id/rooms',
    title: 'Choose a room',
    description: 'Room types, inclusions and cancellation terms.',
    phase: 7,
  },
  // Mobility — Phases 8–9
  {
    path: '/cabs',
    title: 'Cabs',
    description: 'Book a mini, sedan, SUV or premium ride.',
    phase: 8,
  },
  {
    path: '/cabs/booking',
    title: 'Confirm your cab',
    description: 'Fare estimate, ETA and driver assignment.',
    phase: 8,
  },
  {
    path: '/rides/:id',
    title: 'Track your ride',
    description: 'Live driver location and trip status.',
    phase: 8,
  },
  {
    path: '/bikes',
    title: 'Bike rental',
    description: 'Rent scooters, bikes and EVs by the hour or day.',
    phase: 9,
  },
  // Holidays, parcel — Phases 10–11
  {
    path: '/holidays',
    title: 'Holiday packages',
    description: 'Domestic, international, honeymoon, family and more.',
    phase: 10,
  },
  {
    path: '/holidays/:id',
    title: 'Holiday details',
    description: 'Itinerary, inclusions and terms.',
    phase: 10,
  },
  {
    path: '/parcel',
    title: 'Parcel delivery',
    description: 'Send parcels safely, tracked end to end.',
    phase: 11,
  },
  {
    path: '/parcel/track/:id',
    title: 'Track parcel',
    description: 'Live status of your parcel.',
    phase: 11,
  },
  // Account & money — Phases 2, 13, 15


  // Support & company — Phases 3, 17
  { path: '/help', title: 'Help center', description: 'Answers and 24×7 support.', phase: 17 },
  { path: '/contact', title: 'Contact us', description: 'Reach the ZPROO GO team.', phase: 17 },
];
