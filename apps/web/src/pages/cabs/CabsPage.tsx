import { cn } from '@zproo/ui';
import { ArrowLeftRight, CarTaxiFront, Clock, LocateFixed, PlaneLanding, PlaneTakeoff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { DemoNote, focusRing, LocationInput, TextField, VehicleIcon } from '@/features/cabs/components/ui';
import { LOCATIONS, POPULAR_CITIES, RIDE_MODES, VEHICLES, vehiclesForMode } from '@/features/cabs/data';
import { useCabStore } from '@/features/cabs/store';
import { RENTAL_KM_PER_HOUR, RENTAL_PACKAGES, scheduledTimestamp } from '@/features/cabs/fare';
import { todayIso } from '@zproo/validation';
import { isAirport, validateSearch } from '@/features/cabs/validation';
import type { RideMode } from '@/features/cabs/types';

function nearest(lat: number, lng: number) {
  return [...LOCATIONS].sort((a, b) => (a.lat - lat) ** 2 + (a.lng - lng) ** 2 - ((b.lat - lat) ** 2 + (b.lng - lng) ** 2))[0]!;
}

export default function CabsPage() {
  const { draft, patch, setLocation, swap, bookings, selectVehicle } = useCabStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [errors, setErrors] = useState<ReturnType<typeof validateSearch>>({});
  const [geoMsg, setGeoMsg] = useState('');

  // Pre-fill from the home-page cab widget (?pickup=&drop=&date=&time=).
  useEffect(() => {
    const p = params.get('pickup'), d = params.get('drop');
    if (p) setLocation('pickup', p);
    if (d) setLocation('drop', d);
    const date = params.get('date'), time = params.get('time');
    if (date) patch({ date });
    if (time) patch({ time });
    // Persisted drafts can hold a past date or no time: fix them so the search always has valid defaults.
    const cur = useCabStore.getState().draft;
    const today = todayIso();
    const fix: Partial<typeof cur> = {};
    if (!cur.date || cur.date < today) fix.date = today;
    const day = fix.date ?? cur.date;
    if (!cur.time || scheduledTimestamp(day, cur.time) < Date.now()) {
      const t = new Date(Date.now() + 30 * 60_000);
      t.setMinutes(Math.ceil(t.getMinutes() / 5) * 5, 0, 0);
      fix.time = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
      if (day === today || t.getDate() !== new Date().getDate()) fix.date = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }
    if (cur.rentalHours === undefined) fix.rentalHours = 4;
    if (cur.airportDir === undefined) fix.airportDir = 'to';
    if (cur.returnDate === undefined) fix.returnDate = '';
    if (cur.returnTime === undefined) fix.returnTime = '';
    if (Object.keys(fix).length) patch(fix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formRef = useRef<HTMLFormElement>(null);
  const mode = draft.mode;
  const rental = mode === 'rental';
  const dir = draft.airportDir ?? 'to';
  const AIRPORT = LOCATIONS.find((l) => l.id === 'pune-airport')!;

  /** Switch ride mode and prepare the fields that mode needs, so the choice visibly changes the search. */
  const chooseMode = (m: RideMode) => {
    if (m === mode) return;
    const next: Partial<typeof draft> = { mode: m, vehicleId: null };
    if (m === 'round-trip' || m === 'outstation') {
      next.returnDate = m === 'round-trip' ? (draft.returnDate || draft.date) : (draft.returnDate ?? '');
      next.returnTime = m === 'round-trip' ? (draft.returnTime || '18:00') : (draft.returnTime ?? '');
    }
    if (rental) next.drop = draft.drop === draft.pickup ? '' : draft.drop; // leaving rental: drop was mirrored
    if (m === 'rental') next.drop = draft.pickup;
    if (m === 'airport') {
      if (dir === 'to' && !isAirport(draft.drop)) next.drop = AIRPORT.name;
      if (dir === 'from' && !isAirport(draft.pickup)) next.pickup = AIRPORT.name;
    }
    patch(next);
    setErrors({});
  };
  const chooseDir = (d: 'to' | 'from') => {
    const next: Partial<typeof draft> = { airportDir: d, vehicleId: null };
    if (d === 'to') { if (isAirport(draft.pickup)) next.pickup = ''; next.drop = isAirport(draft.drop) ? draft.drop : AIRPORT.name; }
    else { if (isAirport(draft.drop)) next.drop = ''; next.pickup = isAirport(draft.pickup) ? draft.pickup : AIRPORT.name; }
    patch(next);
  };
  const setPickup = (v: string) => { setLocation('pickup', v); if (rental) patch({ drop: v }); };

  const recents = [...new Set(bookings.flatMap((b) => [b.pickup, b.drop]))].slice(0, 4);

  const locate = () => {
    if (!('geolocation' in navigator)) { setGeoMsg('Location is not supported on this device. Type your pickup instead.'); return; }
    setGeoMsg('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => { const n = nearest(pos.coords.latitude, pos.coords.longitude); setLocation('pickup', n.name); setGeoMsg(`Using ${n.name}, the closest saved place (approximate).`); },
      (err) => setGeoMsg(err.code === err.PERMISSION_DENIED ? 'Location permission was denied. You can still type your pickup.' : 'Could not get your location. Type your pickup instead.'),
      { timeout: 8000 },
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateSearch(rental ? { ...draft, drop: draft.pickup } : draft);
    setErrors(errs);
    if (Object.keys(errs).length === 0) { navigate('/cabs/results'); return; }
    // Make a failed search obvious: jump to the first problem field.
    window.setTimeout(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus(), 0);
  };

  return (
    <div className="bg-background pb-16">
      <Seo title="Book a cab" description="Safe, reliable, affordable cab rides." />
      <h1 className="sr-only">Book a cab: safe, reliable and affordable rides</h1>
      <section aria-label="Zproo Go cabs" className="relative overflow-hidden bg-[#f4a95a]">
        <picture>
          <source media="(min-width: 768px)" srcSet="/assets/banners/cab-1920.webp" />
          <img src="/assets/banners/cab-1024.webp" alt="Zproo Go cab — Safe, Reliable, Affordable" width={1962} height={802} fetchPriority="high" className="h-[220px] w-full object-cover object-[65%_center] sm:h-[300px] md:h-auto md:max-h-[460px]" />
        </picture>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/70 to-transparent" />
      </section>
      <div className="relative z-10 mx-auto -mt-12 max-w-[1200px] space-y-6 px-4">
        <form ref={formRef} onSubmit={submit} noValidate aria-label="Search rides" className="cab-fade-up rounded-[20px] border border-border bg-card p-4 shadow-xl sm:p-6">
          {Object.keys(errors).length > 0 && <p role="alert" className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger">Please fix the highlighted fields to search rides.</p>}
          <div role="radiogroup" aria-label="Ride mode" className="mb-4 flex flex-wrap gap-2">
            {RIDE_MODES.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={draft.mode === m.id} onClick={() => chooseMode(m.id)}
                className={cn('h-9 rounded-full px-4 text-sm font-semibold', focusRing, draft.mode === m.id ? 'bg-primary text-primary-foreground' : 'border border-border')}>{m.label}</button>
            ))}
          </div>
          {mode === 'airport' && (
            <div role="radiogroup" aria-label="Airport transfer direction" className="mb-3 inline-flex rounded-xl bg-neutral-100 p-1 text-sm font-semibold">
              {([['to', 'To airport', PlaneTakeoff], ['from', 'From airport', PlaneLanding]] as const).map(([id, label, I]) => (
                <button key={id} type="button" role="radio" aria-checked={dir === id} onClick={() => chooseDir(id)}
                  className={cn('inline-flex items-center gap-2 rounded-lg px-4 py-2 transition-colors', focusRing, dir === id ? 'bg-card text-primary shadow-sm' : 'text-muted')}><I aria-hidden className="size-4" />{label}</button>
              ))}
            </div>
          )}
          <div className={cn('grid gap-3 md:items-end', rental ? '' : 'md:grid-cols-[1fr_auto_1fr]')}>
            <LocationInput label={rental ? 'Pickup location' : 'Pickup location'} value={draft.pickup} onChange={setPickup} error={errors.pickup} placeholder="Search for pickup location" />
            {!rental && <button type="button" onClick={() => { swap(); if (mode === 'airport') patch({ airportDir: dir === 'to' ? 'from' : 'to' }); }} aria-label="Swap pickup and drop-off" title="Swap" className={cn('cab-swap mx-auto grid size-11 place-items-center rounded-full border border-border bg-card', focusRing)}><ArrowLeftRight aria-hidden className="size-4" /></button>}
            {!rental && <LocationInput label="Drop location" value={draft.drop} onChange={(v) => setLocation('drop', v)} error={errors.drop} placeholder="Search for drop location" />}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TextField label="Date" type="date" value={draft.date} min={todayIso()} onChange={(e) => patch({ date: e.target.value })} error={errors.date} />
            <TextField label="Time" type="time" value={draft.time} onChange={(e) => patch({ time: e.target.value })} error={errors.time} />
            <div>
              <label htmlFor="cab-type" className="mb-1 block text-xs font-medium text-muted">Ride type</label>
              <select id="cab-type" value={draft.vehicleId ?? ''} onChange={(e) => selectVehicle((e.target.value || null) as never)} className={cn('h-11 w-full rounded-lg border border-border bg-card px-3 text-[15px]', focusRing)}>
                <option value="">Any</option>
                {vehiclesForMode(mode).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cab-pax" className="mb-1 block text-xs font-medium text-muted">Passengers</label>
              <select id="cab-pax" value={draft.passengers} onChange={(e) => patch({ passengers: Number(e.target.value) })} className={cn('h-11 w-full rounded-lg border border-border bg-card px-3 text-[15px]', focusRing)}>
                {Array.from({ length: draft.vehicleId ? (VEHICLES.find((v) => v.id === draft.vehicleId)?.seats ?? 6) : 6 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              {errors.passengers && <p role="alert" className="mt-1 text-xs text-danger">{errors.passengers}</p>}
            </div>
          </div>
          {(mode === 'round-trip' || mode === 'outstation') && (
            <div className="cab-fade-up mt-3 grid gap-3 rounded-xl border border-primary/20 bg-primary-light/50 p-3 sm:grid-cols-2">
              <TextField label={mode === 'round-trip' ? 'Return date *' : 'Return date (optional)'} type="date" value={draft.returnDate ?? ''} min={draft.date || todayIso()} onChange={(e) => patch({ returnDate: e.target.value })} error={errors.returnDate} />
              <TextField label={mode === 'round-trip' ? 'Return time *' : 'Return time (optional)'} type="time" value={draft.returnTime ?? ''} onChange={(e) => patch({ returnTime: e.target.value })} error={errors.returnTime} />
              <p className="text-xs text-muted sm:col-span-2">{mode === 'round-trip' ? 'Round trips are billed for both ways plus one hour of driver waiting.' : 'Outstation trips go between cities. Add a return date if you want the same cab to bring you back.'}</p>
            </div>
          )}
          {rental && (
            <div className="cab-fade-up mt-3 rounded-xl border border-primary/20 bg-primary-light/50 p-3">
              <p id="rent-h" className="mb-2 text-xs font-medium text-muted">Rental package *</p>
              <div role="radiogroup" aria-labelledby="rent-h" className="flex flex-wrap gap-2">
                {RENTAL_PACKAGES.map((h) => (
                  <button key={h} type="button" role="radio" aria-checked={(draft.rentalHours ?? 4) === h} onClick={() => patch({ rentalHours: h })}
                    className={cn('rounded-xl border px-4 py-2 text-left text-sm font-semibold', focusRing, (draft.rentalHours ?? 4) === h ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>
                    {h} hrs<span className="block text-[11px] font-normal opacity-80">{h * RENTAL_KM_PER_HOUR} km included</span></button>
                ))}
              </div>
              {errors.rentalHours && <p role="alert" className="mt-1 text-xs text-danger">{errors.rentalHours}</p>}
              <p className="mt-2 text-xs text-muted">The cab stays with you for the whole package. No drop location needed.</p>
            </div>
          )}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1"><TextField label="Special request (optional)" value={draft.request} onChange={(e) => patch({ request: e.target.value })} maxLength={140} placeholder="Any special request?" /></div>
            <button type="submit" className={cn('cab-btn h-11 rounded-xl bg-primary px-8 font-semibold text-primary-foreground hover:bg-primary-hover', focusRing)}>Search rides</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
            <button type="button" onClick={locate} className={cn('inline-flex items-center gap-2 rounded text-primary', focusRing)}><LocateFixed aria-hidden className="size-4" /> Use current location</button>
            <button type="button" onClick={() => { const t = new Date(Date.now() + 3600_000); patch({ date: t.toISOString().slice(0, 10), time: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` }); }} className={cn('inline-flex items-center gap-2 rounded text-primary', focusRing)}><Clock aria-hidden className="size-4" /> Schedule a ride (1 hour from now)</button>
          </div>
          {geoMsg && <p role="status" className="mt-2 text-xs text-muted">{geoMsg}</p>}
        </form>

        <section aria-labelledby="pop-h">
          <h2 id="pop-h" className="mb-3 text-xl font-semibold">Popular locations</h2>
          <div className="flex flex-wrap gap-2">
            {[...recents.map((r) => ({ r, recent: true })), ...POPULAR_CITIES.map((c) => ({ r: LOCATIONS.find((l) => l.name.includes(c))?.name ?? c, recent: false }))].slice(0, 10).map(({ r, recent }) => (
              <button key={`${recent}-${r}`} type="button" onClick={() => setLocation(draft.pickup ? 'drop' : 'pickup', r)} className={cn('rounded-full border border-border bg-card px-4 py-1.5 text-sm transition-colors hover:border-primary hover:bg-primary-light', focusRing)}>{recent && <span className="sr-only">Recent: </span>}{r}</button>
            ))}
          </div>
        </section>

        <section aria-labelledby="cat-h">
          <h2 id="cat-h" className="mb-3 text-xl font-semibold">Ride categories</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[...VEHICLES.map((v) => ({ id: v.id, label: v.label })), { id: 'sedan' as const, label: 'Airport transfer', mode: 'airport' as const }, { id: 'sedan' as const, label: 'Outstation', mode: 'outstation' as const }, { id: 'premium' as const, label: 'Rental', mode: 'rental' as const }].map((c) => (
              <li key={c.label}>
                <button type="button" onClick={() => { if ('mode' in c) { chooseMode(c.mode); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } else if (mode === 'outstation' && (c.id === 'bike' || c.id === 'auto')) chooseMode('one-way'); selectVehicle(c.id); }} className={cn('cab-lift flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left', focusRing, draft.vehicleId === c.id && !('mode' in c) && 'border-primary')}>
                  <VehicleIcon id={c.id} size="sm" /><span className="text-sm font-semibold">{c.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <DemoNote />
        <p className="flex items-center gap-2 text-xs text-muted"><CarTaxiFront aria-hidden className="size-4 text-success" /> Safe-ride tips: share your trip, verify the vehicle number before boarding.</p>
      </div>
    </div>
  );
}
