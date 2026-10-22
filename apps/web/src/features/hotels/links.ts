export const hotelResultsUrl = (
  city: string,
  checkIn: string,
  checkOut: string,
  rooms = 1,
  adults = 2,
  children = 0,
) =>
  `/hotels/results?city=${encodeURIComponent(city)}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&rooms=${rooms}&adults=${adults}&children=${children}`;

/** Details / rooms links carry the stay's query string so dates and guests never get lost. */
const withQuery = (path: string, query?: string) => (query ? `${path}?${query}` : path);

export const hotelDetailsUrl = (id: string, query?: string) =>
  withQuery(`/hotels/${encodeURIComponent(id)}`, query);
export const hotelRoomsUrl = (id: string, query?: string) =>
  withQuery(`/hotels/${encodeURIComponent(id)}/rooms`, query);
export const hotelBookingUrl = '/hotels/booking';
export const hotelReviewUrl = '/hotels/review';
export const hotelPaymentUrl = '/hotels/payment';
export const hotelConfirmationUrl = (reference: string) =>
  `/hotels/confirmation?ref=${encodeURIComponent(reference)}`;
/** "Booking confirmed" page shown right after payment (the e-voucher is one click away). */
export const hotelBookedUrl = (reference: string) =>
  `/hotels/booked?ref=${encodeURIComponent(reference)}`;
