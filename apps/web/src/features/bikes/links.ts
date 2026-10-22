export const bikeLinks = {
  /** Landing page: search, categories, popular bikes. */
  home: () => '/bikes',
  /** Search results with filters. */
  results: (query = '') => `/bikes/results${query ? `?${query}` : ''}`,
  /** Pickup hubs. */
  locations: () => '/bikes/locations',
  details: (id: string) => `/bikes/${encodeURIComponent(id)}`,
  /** Checkout step 1: rental dates, add-ons and rider details. */
  book: (id: string) => `/bikes/${encodeURIComponent(id)}/book`,
  /** Checkout step 2: booking summary. */
  review: (id: string) => `/bikes/${encodeURIComponent(id)}/review`,
  /** Checkout step 3: (demo) payment. */
  payment: (id: string) => `/bikes/${encodeURIComponent(id)}/payment`,
  /** Mock booking confirmation. */
  confirmation: (reference: string) => `/bikes/confirmation/${encodeURIComponent(reference)}`,
  /** Mock bookings made on this device. */
  bookings: () => '/bikes/bookings',
} as const;
