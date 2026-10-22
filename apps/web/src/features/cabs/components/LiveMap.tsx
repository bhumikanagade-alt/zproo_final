import 'leaflet/dist/leaflet.css';
import { cn } from '@zproo/ui';
import type { Map as LMap, LayerGroup, Marker } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { pointAt, type RoadState } from '../geo';

/**
 * Real OpenStreetMap (Leaflet) with a real road route from OSRM. Tiles and routes load from the
 * public internet in the visitor's browser. `progress` (0-1) moves the vehicle along the route.
 */
export function LiveMap({ state, progress, className, pickupLabel = 'Pickup', dropLabel = 'Drop' }: {
  state: RoadState; progress?: number; className?: string; pickupLabel?: string; dropLabel?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const car = useRef<Marker | null>(null);
  const lib = useRef<typeof import('leaflet') | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    let ro: ResizeObserver | undefined;
    (async () => {
      const L = (await import('leaflet')).default ?? (await import('leaflet'));
      if (dead || !box.current) return;
      lib.current = L;
      const m = L.map(box.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView([18.52, 73.86], 11);
      L.control.zoom({ position: 'topright' }).addTo(m);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      map.current = m;
      ro = new ResizeObserver(() => m.invalidateSize());
      ro.observe(box.current);
      setReady(true);
    })();
    return () => { dead = true; ro?.disconnect(); map.current?.remove(); map.current = null; setReady(false); };
  }, []);

  useEffect(() => {
    const L = lib.current, m = map.current, g = layer.current;
    if (!ready || !L || !m || !g || !state.a || !state.b) return;
    g.clearLayers();
    car.current = null;
    const a: [number, number] = [state.a.lat, state.a.lng];
    const b: [number, number] = [state.b.lat, state.b.lng];
    const road = 'road' in state ? state.road : null;
    const line = road?.coords ?? [a, b];
    L.polyline(line, { color: '#ffffff', weight: 10, opacity: 0.95 }).addTo(g);
    L.polyline(line, { color: '#2563eb', weight: 5, opacity: 1, ...(road ? {} : { dashArray: '8 10' }) }).addTo(g);
    const dot = (bg: string, round: boolean) => L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15],
      html: `<div class="cab-pin" style="width:30px;height:30px;background:${bg};border:4px solid #fff;border-radius:${round ? '50%' : '8px'};display:grid;place-items:center"><div style="width:8px;height:8px;background:#fff;border-radius:${round ? '50%' : '2px'}"></div></div>` });
    L.marker(a, { icon: dot('#16813d', true) }).bindTooltip(pickupLabel, { permanent: true, direction: 'top', offset: [0, -14] }).addTo(g);
    L.marker(b, { icon: dot('#e31118', false) }).bindTooltip(dropLabel, { permanent: true, direction: 'top', offset: [0, -14] }).addTo(g);
    m.fitBounds(L.latLngBounds(line), { padding: [48, 48] });
  }, [ready, state, pickupLabel, dropLabel]);

  useEffect(() => {
    const L = lib.current, g = layer.current;
    if (!ready || !L || !g || progress === undefined || !('road' in state)) return;
    const pos = pointAt(state.road?.coords ?? [[state.a.lat, state.a.lng], [state.b.lat, state.b.lng]], progress);
    if (!pos) return;
    if (!car.current) {
      car.current = L.marker(pos, { zIndexOffset: 1000, icon: L.divIcon({ className: 'cab-car-marker', iconSize: [40, 40], iconAnchor: [20, 20],
        html: '<div class="cab-pin" style="width:40px;height:40px;background:#1f1a1b;border:3px solid #fff;border-radius:50%;display:grid;place-items:center;font-size:20px">🚕</div>' }) }).addTo(g);
    } else car.current.setLatLng(pos);
  }, [ready, state, progress]);

  const note =
    state.status === 'loading' ? 'Locating places on the map…'
    : state.status === 'notfound' ? 'We could not find one of these places on the map. Try a more specific address.'
    : state.status === 'fallback' ? 'Road routing is unavailable right now — showing a straight line.'
    : null;
  return (
    <div className={cn('relative isolate overflow-hidden rounded-2xl border border-border bg-[#e8eef3] shadow-sm', className)}>
      <div ref={box} className="absolute inset-0 z-0" role="application" aria-label="Map showing pickup, drop-off and route" />
      {note && <p role="status" className="absolute inset-x-3 bottom-3 z-[500] rounded-lg bg-card/95 px-3 py-2 text-xs font-medium shadow">{note}</p>}
      {state.status === 'ready' && state.road && <p className="absolute left-3 top-3 z-[500] rounded-full bg-card px-3 py-1 text-xs font-semibold shadow">{state.road.km} km · {state.road.minutes} min by road</p>}
    </div>
  );
}
