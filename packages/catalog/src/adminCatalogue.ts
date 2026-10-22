import { findAirport, findCity, findStation } from '@zproo/config';
import type { AdminInventoryItem, ServiceType } from '@zproo/types';
import { buildBusTimetable, MOCK_BUS_OPERATORS } from './buses';
import { buildTimetable, MOCK_AIRLINES } from './flights';
import { buildTrainTimetable } from './trains';

/**
 * The flight, bus and train catalogue as admin-panel rows (shared by the API and the demo engine).
 * Ids are stable: flight number without spaces, bus service number, train number.
 */

export interface AdminCatalogue {
  columns: string[];
  items: Omit<AdminInventoryItem, 'listed'>[];
}

const hhmm = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
const weekdays = (days: number[]) =>
  days.length === 7 ? 'Daily' : days.map((d) => ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]).join(' ');

const cache = new Map<ServiceType, AdminCatalogue>();

/** Catalogue of a transport service; other services return null (their catalogues live elsewhere). */
export function transportCatalogue(service: ServiceType): AdminCatalogue | null {
  if (service !== 'FLIGHT' && service !== 'BUS' && service !== 'TRAIN') return null;
  const hit = cache.get(service);
  if (hit) return hit;
  const built = build(service);
  cache.set(service, built);
  return built;
}

function build(service: 'FLIGHT' | 'BUS' | 'TRAIN'): AdminCatalogue {
  switch (service) {
    case 'FLIGHT': {
      const airline = (code: string) => MOCK_AIRLINES.find((a) => a.code === code)?.name ?? code;
      return {
        columns: ['Route', 'Departs', 'Duration', 'Days', 'Aircraft'],
        items: buildTimetable().map((f) => {
          const first = f.segments[0] as (typeof f.segments)[number];
          const last = f.segments.at(-1) as (typeof f.segments)[number];
          const minutes = f.segments.reduce((s, x) => s + x.durationMinutes, 0);
          return {
            id: f.flightNumber.replace(/\s+/g, ''),
            name: f.flightNumber,
            subtitle: `${airline(f.airline)} · ${findAirport(first.from)?.city ?? first.from} → ${findAirport(last.to)?.city ?? last.to}`,
            facts: {
              Route: f.segments.map((s) => s.from).concat(last.to).join(' → '),
              Departs: first.departureTime,
              Duration: hhmm(minutes),
              Days: weekdays(f.daysOfWeek),
              Aircraft: f.aircraft,
            },
            priceFromPaise: f.baseFareRupees * 100,
            rating: null,
          };
        }),
      };
    }
    case 'BUS': {
      const op = (code: string) => MOCK_BUS_OPERATORS.find((o) => o.code === code);
      return {
        columns: ['Route', 'Departs', 'Duration', 'Coach', 'Days'],
        items: buildBusTimetable().map((b) => ({
          id: b.serviceNumber,
          name: `${op(b.operatorCode)?.name ?? b.operatorCode} ${b.serviceNumber}`,
          subtitle: `${findCity(b.from)?.name ?? b.from} → ${findCity(b.to)?.name ?? b.to}`,
          facts: {
            Route: `${findCity(b.from)?.name ?? b.from} → ${findCity(b.to)?.name ?? b.to}`,
            Departs: b.departureTime,
            Duration: hhmm(b.durationMinutes),
            Coach: b.template.replace(/[-_]/g, ' '),
            Days: weekdays(b.daysOfWeek),
          },
          priceFromPaise: b.baseFarePaise,
          rating: op(b.operatorCode)?.rating ?? null,
        })),
      };
    }
    case 'TRAIN':
      return {
        columns: ['Route', 'Departs', 'Type', 'Classes', 'Days'],
        items: buildTrainTimetable().map((t) => {
          const from = t.stations[0]?.[0] ?? '';
          const to = t.stations.at(-1)?.[0] ?? '';
          return {
            id: t.number,
            name: `${t.number} ${t.name}`,
            subtitle: `${findStation(from)?.name ?? from} → ${findStation(to)?.name ?? to} · ${t.stations.length} stops`,
            facts: { Route: `${from} → ${to}`, Departs: t.departure, Type: t.kind, Classes: t.classes.join(' '), Days: weekdays(t.daysOfWeek) },
            priceFromPaise: null,
            rating: null,
          };
        }),
      };
  }
}
