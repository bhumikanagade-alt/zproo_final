import { MapPin } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { formatINR } from '../data';
import type { HotelResult } from '../filters';
import { hotelDetailsUrl } from '../links';

const W = 900;
const H = 600;
const TILE = 256;

const project = (lat: number, lng: number, z: number) => {
  const world = TILE * 2 ** z;
  const x = ((lng + 180) / 360) * world;
  const rad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * world;
  return { x, y };
};

/** Picks the biggest zoom where every pin fits inside the canvas with some padding. */
function fitZoom(points: readonly { lat: number; lng: number }[]): number {
  if (points.length <= 1) return 14;
  for (let z = 16; z >= 2; z -= 1) {
    const ps = points.map((p) => project(p.lat, p.lng, z));
    const xs = ps.map((p) => p.x);
    const ys = ps.map((p) => p.y);
    if (Math.max(...xs) - Math.min(...xs) <= W - 220 && Math.max(...ys) - Math.min(...ys) <= H - 160) return z;
  }
  return 2;
}

interface Props {
  results: readonly HotelResult[];
  query: string;
}

/**
 * Map of the current results with a price pin per hotel. Built from OpenStreetMap tiles and exact
 * Web-Mercator maths (no API key), so the pins always line up and follow the filters.
 */
export function ResultsMap({ results, query }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / W || 1));
    ro.observe(el);
    setScale(el.clientWidth / W || 1);
    return () => ro.disconnect();
  }, []);

  const view = useMemo(() => {
    const points = results.map((r) => r.hotel.coordinates);
    if (points.length === 0) return null;
    const z = fitZoom(points);
    const ps = points.map((p) => project(p.lat, p.lng, z));
    const cx = (Math.min(...ps.map((p) => p.x)) + Math.max(...ps.map((p) => p.x))) / 2;
    const cy = (Math.min(...ps.map((p) => p.y)) + Math.max(...ps.map((p) => p.y))) / 2;
    const originX = cx - W / 2;
    const originY = cy - H / 2;
    const max = 2 ** z - 1;
    const tiles: { key: string; src: string; left: number; top: number }[] = [];
    for (let tx = Math.floor(originX / TILE); tx <= Math.floor((originX + W) / TILE); tx += 1) {
      for (let ty = Math.floor(originY / TILE); ty <= Math.floor((originY + H) / TILE); ty += 1) {
        if (tx < 0 || ty < 0 || tx > max || ty > max) continue;
        tiles.push({ key: `${z}/${tx}/${ty}`, src: `https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`, left: tx * TILE - originX, top: ty * TILE - originY });
      }
    }
    const pins = results.map((r, i) => {
      const p = ps[i];
      return { result: r, left: (p?.x ?? 0) - originX, top: (p?.y ?? 0) - originY };
    });
    return { tiles, pins };
  }, [results]);

  const chosen = results.find((r) => r.hotel.id === selected);

  if (!view) {
    return (
      <div role="status" className="grid h-64 place-items-center rounded-2xl border border-dashed border-border bg-card text-sm text-muted">
        No hotels to show on the map.
      </div>
    );
  }

  return (
    <section aria-label="Map of results" data-testid="results-map" className="overflow-hidden rounded-2xl border border-border bg-card">
      <div ref={wrap} className="relative w-full overflow-hidden bg-slate-100" style={{ aspectRatio: `${W} / ${H}` }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
          {view.tiles.map((t) => (
            <img key={t.key} src={t.src} alt="" width={TILE} height={TILE} loading="lazy" draggable={false} className="absolute max-w-none select-none" style={{ left: t.left, top: t.top }} />
          ))}
          {view.pins.map(({ result, left, top }) => {
            const active = result.hotel.id === selected;
            return (
              <button
                key={result.hotel.id}
                type="button"
                aria-label={`${result.hotel.name}, ${formatINR(result.price.perNightPaise)} per night`}
                aria-pressed={active}
                onClick={() => setSelected(active ? null : result.hotel.id)}
                className={`absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full px-3 py-1 text-sm font-extrabold shadow-lg ring-2 ring-white transition-transform hover:scale-110 ${active ? 'z-20 bg-foreground text-background' : 'z-10 bg-primary text-primary-foreground'}`}
                style={{ left, top }}
              >
                {formatINR(result.price.perNightPaise)}
              </button>
            );
          })}
        </div>
        <p className="absolute bottom-1 right-1 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-700">© OpenStreetMap contributors</p>
      </div>
      <div className="border-t border-border p-3 text-sm" aria-live="polite">
        {chosen ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-extrabold">{chosen.hotel.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted"><MapPin aria-hidden className="size-3.5" /> {chosen.hotel.area}, {chosen.hotel.city}</p>
            </div>
            <Link to={hotelDetailsUrl(chosen.hotel.id, query)} className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">View hotel</Link>
          </div>
        ) : (
          <p className="text-muted">Tap a price pin to see the hotel. Pins update when you change filters.</p>
        )}
      </div>
    </section>
  );
}
