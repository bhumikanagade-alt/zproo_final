import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { addDays, diffNights, isIsoDate, todayIso } from './dates';
import { distributeGuests } from './occupancy';
import { parseHotelSearch, type HotelSearchState } from './search';
import { useHotelBooking } from './store';

/**
 * The stay (dates, rooms, guests) for details and rooms pages. URL first, then the saved search,
 * then defaults, so direct links and refreshes both work.
 */
export function useStay(): HotelSearchState {
  const [params] = useSearchParams();
  // Separate selectors: returning a fresh object from one selector would re-render forever.
  const city = useHotelBooking((s) => s.city);
  const savedIn = useHotelBooking((s) => s.checkIn);
  const savedOut = useHotelBooking((s) => s.checkOut);
  const savedRooms = useHotelBooking((s) => s.rooms);
  const savedAdults = useHotelBooking((s) => s.adults);
  const savedChildren = useHotelBooking((s) => s.children);
  const savedAges = useHotelBooking((s) => s.childAges);
  return useMemo(() => {
    if (params.has('checkIn') || params.has('layout') || params.has('rooms')) return parseHotelSearch(params);
    if (isIsoDate(savedIn) && isIsoDate(savedOut) && savedIn >= todayIso()) {
      const occupancy = distributeGuests(savedRooms, savedAdults, savedAges);
      return {
        query: city, checkIn: savedIn, checkOut: savedOut, occupancy,
        nights: Math.max(1, diffNights(savedIn, savedOut)), rooms: occupancy.length,
        adults: savedAdults, children: savedChildren, childAges: savedAges,
      };
    }
    const base = parseHotelSearch(new URLSearchParams());
    const checkIn = addDays(todayIso(), 7);
    return { ...base, checkIn, checkOut: addDays(checkIn, 2), nights: 2 };
  }, [params, city, savedIn, savedOut, savedRooms, savedAdults, savedChildren, savedAges]);
}
