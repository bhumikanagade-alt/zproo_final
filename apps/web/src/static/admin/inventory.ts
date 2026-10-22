import { transportCatalogue } from '@zproo/catalog';
import type { AdminInventoryItem, ServiceType } from '@zproo/types';
import { MOCK_BIKES } from '@/features/bikes/mock/bikes.mock';
import { MOCK_LOCATIONS } from '@/features/bikes/mock/locations.mock';
import { VEHICLES } from '@/features/cabs/data';
import { HOTEL_DATA } from '@/features/hotels/data';
import { SERVICES as PARCEL_SERVICES } from '@/features/parcels/data';

/**
 * The catalogue each service sells, as admin rows. In demo mode the catalogue is the built-in
 * mock supplier data (the same data the website searches); "listed" is stored per item.
 */

type Catalogue = { columns: string[]; items: Omit<AdminInventoryItem, 'listed'>[] };

const HOLIDAY_PACKAGES = [
  ['goa-beach-bliss', 'Goa Beach Bliss', 'Goa, India', 4, 14999, 4.6, 'Beach'],
  ['kashmir-paradise', 'Kashmir Paradise Escape', 'Kashmir, India', 6, 28499, 4.8, 'Mountains'],
  ['kerala-backwaters', 'Kerala Backwater Retreat', 'Kerala, India', 5, 22999, 4.7, 'Nature'],
  ['royal-rajasthan', 'Royal Rajasthan Heritage', 'Rajasthan, India', 7, 31999, 4.5, 'Culture'],
  ['manali-snow', 'Manali Snow Adventure', 'Manali, India', 5, 17499, 4.4, 'Mountains'],
  ['andaman-island', 'Andaman Island Hopping', 'Andaman, India', 6, 36999, 4.9, 'Beach'],
  ['dubai-delight', 'Dubai Dazzle Getaway', 'Dubai, UAE', 5, 54999, 4.7, 'City'],
  ['bali-serenity', 'Bali Serenity Escape', 'Bali, Indonesia', 6, 48999, 4.8, 'Beach'],
] as const;

const cache = new Map<ServiceType, Catalogue>();

export function catalogue(service: ServiceType): Catalogue {
  const hit = cache.get(service);
  if (hit) return hit;
  const built = build(service);
  cache.set(service, built);
  return built;
}

function build(service: ServiceType): Catalogue {
  switch (service) {
    case 'FLIGHT':
    case 'BUS':
    case 'TRAIN':
      return transportCatalogue(service) ?? { columns: [], items: [] };
    case 'HOTEL':
      return {
        columns: ['City', 'Type', 'Stars', 'Rooms', 'Reviews'],
        items: HOTEL_DATA.map((h) => ({
          id: h.id,
          name: h.name,
          subtitle: `${h.area}, ${h.city}`,
          facts: { City: h.city, Type: h.propertyType, Stars: '★'.repeat(h.stars), Rooms: String(h.rooms.length), Reviews: h.reviewCount.toLocaleString('en-IN') },
          priceFromPaise: Math.min(...h.rooms.map((r) => r.pricePerNightPaise)),
          rating: h.rating,
        })),
      };
    case 'CAB':
      return {
        columns: ['Seats', 'Bags', 'AC', 'Per km', 'Pickup ETA'],
        items: VEHICLES.map((v) => ({
          id: v.id,
          name: v.label,
          subtitle: v.tag ?? v.luggageLabel,
          facts: { Seats: String(v.seats), Bags: String(v.bags), AC: v.ac ? 'Yes' : 'No', 'Per km': `₹${v.perKm}`, 'Pickup ETA': `${v.pickupMin} min` },
          priceFromPaise: v.baseFare * 100,
          rating: null,
        })),
      };
    case 'BIKE':
      return {
        columns: ['Category', 'Per hour', 'Per day', 'Units', 'Hubs'],
        items: MOCK_BIKES.map((b) => ({
          id: b.id,
          name: b.name,
          subtitle: `${b.brand} · ${b.year} · ${b.transmission}`,
          facts: {
            Category: b.category,
            'Per hour': `₹${b.pricing.hourly}`,
            'Per day': `₹${b.pricing.daily}`,
            Units: String(b.availability.unitsLeft),
            Hubs: b.availability.locationIds.map((id) => MOCK_LOCATIONS.find((l) => l.id === id)?.area ?? id).join(', '),
          },
          priceFromPaise: b.pricing.daily * 100,
          rating: b.rating,
        })),
      };
    case 'PARCEL':
      return {
        columns: ['Speed', 'Price multiplier'],
        items: PARCEL_SERVICES.map((s) => ({
          id: s.k.toLowerCase(),
          name: `${s.k} delivery`,
          subtitle: s.desc,
          facts: { Speed: s.desc, 'Price multiplier': `${s.m}×` },
          priceFromPaise: null,
          rating: null,
        })),
      };
    case 'HOLIDAY':
      return {
        columns: ['Destination', 'Duration', 'Theme'],
        items: HOLIDAY_PACKAGES.map(([id, name, dest, days, price, rating, theme]) => ({
          id,
          name,
          subtitle: dest,
          facts: { Destination: dest, Duration: `${days}D / ${days - 1}N`, Theme: theme },
          priceFromPaise: price * 100,
          rating,
        })),
      };
    default:
      return { columns: [], items: [] };
  }
}
