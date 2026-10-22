import type { ServiceType } from '@zproo/types';
import type { RequestHandler } from 'express';
import type { AdminService } from '../services/admin.service';
import { ServiceUnavailableError } from '../utils/errors';

/** Every booking endpoint, for all 8 services Settings lists (a service without an API yet is simply never matched). */
const BOOK: Record<string, ServiceType> = {
  '/flights/book': 'FLIGHT',
  '/buses/book': 'BUS',
  '/trains/book': 'TRAIN',
  '/hotels/book': 'HOTEL',
  '/cabs/book': 'CAB',
  '/bikes/book': 'BIKE',
  '/holidays/book': 'HOLIDAY',
  '/parcels/book': 'PARCEL',
};
const SEARCH: Record<string, ServiceType> = {
  '/flights/search': 'FLIGHT',
  '/buses/search': 'BUS',
  '/trains/search': 'TRAIN',
};

/**
 * Applies admin settings to the customer API: maintenance mode and paused services refuse new
 * bookings (503), and catalogue items an admin has hidden are removed from search results.
 */
export function bookingGate(admin: AdminService): RequestHandler {
  return async (req, res, next) => {
    const book = req.method === 'POST' ? BOOK[req.path] : undefined;
    if (book) {
      const s = await admin.settings();
      if (s.maintenanceMode) throw new ServiceUnavailableError('ZPROO GO is down for maintenance. Please try again shortly.');
      if (s.disabledServices.includes(book)) throw new ServiceUnavailableError('Bookings for this service are paused right now. Please try again later.');
      return next();
    }
    const search = req.method === 'GET' ? SEARCH[req.path] : undefined;
    if (!search) return next();
    const hidden = await admin.unlisted(search);
    if (hidden.size === 0) return next();
    const json = res.json.bind(res);
    res.json = (body: unknown) => {
      const data = (body as { data?: Record<string, unknown> } | null)?.data;
      if (data && typeof data === 'object') {
        if (search === 'FLIGHT' && Array.isArray(data.legs)) {
          data.legs = (data.legs as { offers: { flightNumber: string }[] }[]).map((leg) => ({
            ...leg,
            offers: leg.offers.filter((o) => !hidden.has(o.flightNumber.replace(/\s+/g, ''))),
          }));
        }
        if (search === 'BUS' && Array.isArray(data.trips)) {
          data.trips = (data.trips as { serviceNumber: string }[]).filter((t) => !hidden.has(t.serviceNumber));
        }
        if (search === 'TRAIN' && Array.isArray(data.trains)) {
          data.trains = (data.trains as { trainNumber: string }[]).filter((t) => !hidden.has(t.trainNumber));
        }
      }
      return json(body);
    };
    next();
  };
}
