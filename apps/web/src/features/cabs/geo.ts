import { useEffect, useState } from 'react';
import { LOCATIONS } from './data';
import { routeKey } from './fare';
import { useCabStore } from './store';

export interface LatLng { lat: number; lng: number }
export interface Road { coords: [number, number][]; km: number; minutes: number }
export type RoadState =
  | { status: 'loading' | 'notfound'; a: LatLng | null; b: LatLng | null }
  | { status: 'ready' | 'fallback'; a: LatLng; b: LatLng; road: Road | null };

const placeCache = new Map<string, LatLng | null>();
const roadCache = new Map<string, Road | null>();
const norm = (s: string) => s.trim().toLowerCase();

/** Saved places first, then OpenStreetMap Nominatim search (India only). */
export async function resolvePlace(text: string, signal?: AbortSignal): Promise<LatLng | null> {
  const t = norm(text);
  if (!t) return null;
  const known = LOCATIONS.find((l) => norm(l.name) === t) ?? LOCATIONS.find((l) => norm(l.name).includes(t) || t.includes(norm(l.name)));
  if (known) return { lat: known.lat, lng: known.lng };
  if (placeCache.has(t)) return placeCache.get(t) ?? null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    const json = (await res.json()) as { lat: string; lon: string }[];
    const hit = json[0] ? { lat: Number(json[0].lat), lng: Number(json[0].lon) } : null;
    placeCache.set(t, hit);
    return hit;
  } catch {
    return null;
  }
}

export interface PlaceHit { id: string; name: string; area: string; lat: number; lng: number }

/** Live place suggestions (OpenStreetMap Nominatim, India only). Returns [] when offline or on error. */
export async function searchPlaces(text: string, signal?: AbortSignal): Promise<PlaceHit[]> {
  const q = text.trim();
  if (q.length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&addressdetails=0&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    const json = (await res.json()) as { place_id: number; display_name: string; lat: string; lon: string }[];
    return json.map((r) => {
      const parts = r.display_name.split(',').map((x) => x.trim());
      return { id: `osm-${r.place_id}`, name: parts.slice(0, 2).join(', '), area: parts.slice(2, 5).join(', '), lat: Number(r.lat), lng: Number(r.lon) };
    });
  } catch {
    return [];
  }
}

/** Real driving route from the public OSRM server. Returns null if the service is unreachable. */
export async function fetchRoad(a: LatLng, b: LatLng, signal?: AbortSignal): Promise<Road | null> {
  const key = `${a.lat},${a.lng}>${b.lat},${b.lng}`;
  if (roadCache.has(key)) return roadCache.get(key) ?? null;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal });
    const json = (await res.json()) as { routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
    const r = json.routes?.[0];
    if (!r) { roadCache.set(key, null); return null; }
    const road: Road = {
      coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
      km: Math.round((r.distance / 1000) * 10) / 10,
      minutes: Math.max(1, Math.round(r.duration / 60)),
    };
    roadCache.set(key, road);
    return road;
  } catch {
    return null;
  }
}

export function pointAt(coords: [number, number][], t: number): [number, number] | null {
  if (coords.length === 0) return null;
  const f = Math.min(1, Math.max(0, t)) * (coords.length - 1);
  const i = Math.floor(f);
  const p = coords[i]!;
  const q = coords[Math.min(i + 1, coords.length - 1)]!;
  const k = f - i;
  return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
}

/** Resolves both places and the road between them, and saves the measured distance for fare calculation. */
export function useRoad(pickup: string, drop: string): RoadState {
  const [state, setState] = useState<RoadState>({ status: 'loading', a: null, b: null });
  const patch = useCabStore((s) => s.patch);
  useEffect(() => {
    const ctl = new AbortController();
    setState({ status: 'loading', a: null, b: null });
    (async () => {
      const [a, b] = await Promise.all([resolvePlace(pickup, ctl.signal), resolvePlace(drop, ctl.signal)]);
      if (ctl.signal.aborted) return;
      if (!a || !b) { setState({ status: 'notfound', a, b }); return; }
      const road = await fetchRoad(a, b, ctl.signal);
      if (ctl.signal.aborted) return;
      if (road) {
        patch({ routeInfo: { key: routeKey({ pickup, drop }), km: road.km, minutes: road.minutes } });
        setState({ status: 'ready', a, b, road });
      } else setState({ status: 'fallback', a, b, road: null });
    })();
    return () => ctl.abort();
  }, [pickup, drop, patch]);
  return state;
}
