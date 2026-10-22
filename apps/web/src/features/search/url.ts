import type {
  BikeSearch,
  BusSearch,
  CabSearch,
  FlightSearch,
  HolidaySearch,
  HotelSearch,
  ParcelQuote,
  TrainSearch,
} from '@zproo/validation';

/**
 * Search forms navigate to result pages with the search encoded in the URL, so results are
 * shareable and survive reloads. Each `…Url` has a matching `parse…` used by the result page;
 * parsed values are raw (strings) and must still go through the shared schema.
 */

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
};

// ───────── Flights ─────────
// One-way / round trip: ?trip=ROUND_TRIP&from=PNQ&to=DEL&date=…&return=…
// Multi-city:           ?trip=MULTI_CITY&legs=PNQ.DEL.2026-10-25,DEL.GOI.2026-10-28

export function flightsUrl(s: FlightSearch): string {
  const travellers = {
    adults: s.adults,
    children: s.children || undefined,
    infants: s.infants || undefined,
    cabin: s.cabin,
    cabinBag: s.cabinBagKg,
    checkedBag: s.checkedBagKg,
  };
  if (s.tripType === 'MULTI_CITY') {
    const legs = s.legs.map((l) => `${l.from}.${l.to}.${l.date}`).join(',');
    return `/flights/results?${qs({ trip: s.tripType, legs, ...travellers })}`;
  }
  const [leg] = s.legs;
  return `/flights/results?${qs({
    trip: s.tripType,
    from: leg?.from,
    to: leg?.to,
    date: leg?.date,
    return: s.tripType === 'ROUND_TRIP' ? s.returnDate : undefined,
    ...travellers,
  })}`;
}

// Parsing lives in @zproo/validation (`flightSearchInputFromParams`, `trainSearchInputFromParams`)
// so the API reads search URLs exactly like the web app. It is deliberately NOT re-exported here:
// this module is used by the home page, and a re-export would pull zod into the first download.

// ───────── Other services ─────────

export const busesUrl = (s: BusSearch) =>
  `/buses/results?${qs({ from: s.from, to: s.to, date: s.date })}`;

export const trainsUrl = (s: TrainSearch) =>
  `/trains/results?${qs({
    from: s.from,
    to: s.to,
    date: s.date,
    class: s.travelClass === 'ALL' ? undefined : s.travelClass,
    quota: s.quota === 'GN' ? undefined : s.quota,
    passengers: s.passengers > 1 ? s.passengers : undefined,
  })}`;

export const hotelsUrl = (s: HotelSearch) =>
  `/hotels/results?${qs({
    city: s.city,
    checkIn: s.checkIn,
    checkOut: s.checkOut,
    rooms: s.rooms,
    adults: s.adults,
    children: s.children || undefined,
  })}`;

export const cabsUrl = (s: CabSearch) =>
  `/cabs?${qs({ pickup: s.pickup, drop: s.drop, when: s.when, date: s.when === 'LATER' ? s.date : undefined, time: s.when === 'LATER' ? s.time : undefined })}`;

export const bikesUrl = (s: BikeSearch) => `/bikes?${qs({ pickup: s.pickup, drop: s.drop })}`;

export const holidaysUrl = (s: HolidaySearch) =>
  `/holidays?${qs({ destination: s.destination, month: s.month, travellers: s.travellers, category: s.category })}`;

export const parcelUrl = (s: ParcelQuote) =>
  `/parcel?${qs({ from: s.fromPincode, to: s.toPincode, weight: s.weightKg })}`;

// ───────── Date-free links for prerendered merchandising ─────────

export const flightDealUrl = (from: string, to: string) =>
  `/flights/results?${qs({ trip: 'ONE_WAY', from, to, adults: 1, cabin: 'ECONOMY' })}`;
export const busRouteUrl = (from: string, to: string) => `/buses/results?${qs({ from, to })}`;
export const trainRouteUrl = (from: string, to: string) => `/trains/results?${qs({ from, to })}`;
export const hotelCityUrl = (city: string) =>
  `/hotels/results?${qs({ city, rooms: 1, adults: 2 })}`;
