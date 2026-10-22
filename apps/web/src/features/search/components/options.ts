import { AIRPORTS, CITIES, placeGroup, TRAIN_STATIONS } from '@zproo/config';
import type { PlaceOption } from './PlaceCombobox';

// Lists keep the source order: Maharashtra first (Pune at the top), then India, then abroad.

export const AIRPORT_OPTIONS: readonly PlaceOption[] = AIRPORTS.map((a) => ({
  value: a.code,
  label: a.city,
  detail: `${a.code} · ${a.name}`,
  keywords: [a.state, a.country, a.aliases].filter(Boolean).join(' '),
  badge: a.code,
  group: placeGroup(a),
}));

export const CITY_OPTIONS: readonly PlaceOption[] = CITIES.map((c) => ({
  value: c.code,
  label: c.name,
  detail: c.state,
  keywords: c.aliases,
  group: placeGroup(c),
}));

export const STATION_OPTIONS: readonly PlaceOption[] = TRAIN_STATIONS.map((s) => ({
  value: s.code,
  label: s.name,
  detail: `${s.code} · ${s.city}`,
  keywords: `${s.city} ${s.state}`,
  badge: s.code,
  group: placeGroup(s),
}));
