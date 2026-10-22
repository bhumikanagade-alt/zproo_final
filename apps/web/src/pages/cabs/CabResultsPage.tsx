import { cn } from '@zproo/ui';
import { Clock, Luggage, Snowflake, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useRoad } from '@/features/cabs/geo';
import { Seo } from '@/components/seo/Seo';
import { Card, DemoNote, FareTable, FlowHeader, focusRing, VehicleIcon } from '@/features/cabs/components/ui';
import { RIDE_MODES, vehiclesForMode } from '@/features/cabs/data';
import { calcFare, routeFor, rupees } from '@/features/cabs/fare';
import { useCabStore } from '@/features/cabs/store';
import type { VehicleId } from '@/features/cabs/types';

type Sort = 'fare' | 'pickup' | 'seats';

export default function CabResultsPage() {
  const { draft, selectVehicle } = useCabStore();
  const vehicles = vehiclesForMode(draft.mode);
  const navigate = useNavigate();
  const [sort, setSort] = useState<Sort>('fare');
  const [type, setType] = useState<VehicleId | 'all'>('all');
  const [minSeats, setMinSeats] = useState(draft.passengers);
  const [minBags, setMinBags] = useState(0);
  const [ac, setAc] = useState<'any' | 'ac' | 'non-ac'>('any');
  useRoad(draft.pickup, draft.drop);
  const route = useMemo(() => routeFor(draft), [draft]);

  const list = useMemo(() => {
    const rows = vehicles.filter((v) => (type === 'all' || v.id === type) && v.seats >= minSeats && v.bags >= minBags && (ac === 'any' || (ac === 'ac') === v.ac))
      .map((v) => ({ v, fare: calcFare(v, route) }));
    rows.sort((a, b) => sort === 'fare' ? a.fare.total - b.fare.total : sort === 'pickup' ? a.v.pickupMin - b.v.pickupMin : b.v.seats - a.v.seats);
    return rows;
  }, [vehicles, type, minSeats, minBags, ac, sort, route]);

  if (!draft.pickup || !draft.drop) return <Navigate to="/cabs" replace />;
  const selected = draft.vehicleId ? list.find((r) => r.v.id === draft.vehicleId) : undefined;
  const sel = 'h-10 rounded-lg border border-border bg-card px-3 text-sm ' + focusRing;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 pb-28">
      <Seo title="Choose your ride" noIndex />
      <FlowHeader title="Choose your ride" back="/cabs" step={0} />
      <p className="mb-4 text-sm text-muted">
        <span className="mr-2 rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">{RIDE_MODES.find((m) => m.id === draft.mode)?.label ?? 'One way'}</span>
        {draft.mode === 'rental' ? <>{draft.pickup} · {draft.rentalHours ?? 4} hrs · {route.km} km included</> : <>{draft.pickup} → {draft.drop} · about {route.km} km{draft.mode === 'round-trip' ? ' (both ways)' : ''}</>}
        {(draft.mode === 'round-trip' || draft.mode === 'outstation') && draft.returnDate ? <> · returns {draft.returnDate}{draft.returnTime ? ` ${draft.returnTime}` : ''}</> : null}
      </p>
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5" role="group" aria-label="Sort and filters">
        <label className="text-xs text-muted">Sort by<select className={cn(sel, 'mt-1 w-full')} value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="fare">Lowest fare</option><option value="pickup">Fastest pickup</option><option value="seats">Most seats</option></select></label>
        <label className="text-xs text-muted">Vehicle type<select className={cn(sel, 'mt-1 w-full')} value={type} onChange={(e) => setType(e.target.value as never)}><option value="all">All</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
        <label className="text-xs text-muted">Passenger capacity<select className={cn(sel, 'mt-1 w-full')} value={minSeats} onChange={(e) => setMinSeats(Number(e.target.value))}>{[1, 2, 3, 4, 6].map((n) => <option key={n} value={n}>{n}+ seats</option>)}</select></label>
        <label className="text-xs text-muted">Luggage<select className={cn(sel, 'mt-1 w-full')} value={minBags} onChange={(e) => setMinBags(Number(e.target.value))}><option value={0}>Any</option><option value={1}>1+ bag</option><option value={2}>2+ bags</option><option value={3}>3+ bags</option></select></label>
        <label className="text-xs text-muted">AC / Non-AC<select className={cn(sel, 'mt-1 w-full')} value={ac} onChange={(e) => setAc(e.target.value as never)}><option value="any">Any</option><option value="ac">AC</option><option value="non-ac">Non-AC</option></select></label>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div>
          {list.length === 0 ? (
            <Card className="text-center"><p className="font-semibold">No rides match your filters</p><p className="mt-1 text-sm text-muted">Try fewer passengers, less luggage, or clear a filter.</p>
              <button type="button" onClick={() => { setType('all'); setMinSeats(1); setMinBags(0); setAc('any'); }} className={cn('mt-3 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary', focusRing)}>Clear filters</button></Card>
          ) : (
            <ul role="radiogroup" aria-label="Ride options" className="cab-fade-up space-y-3">
              {list.map(({ v, fare }) => {
                const on = draft.vehicleId === v.id;
                return (
                  <li key={v.id}>
                    <button type="button" role="radio" aria-checked={on} onClick={() => selectVehicle(v.id)} className={cn('cab-lift flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left', focusRing, on ? 'border-primary bg-primary-light' : 'border-border')}>
                      <VehicleIcon id={v.id} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-semibold">{v.label}{v.tag && <span className="rounded-full bg-[#eaf7ee] px-2 py-0.5 text-[11px] text-[#16813d]">{v.tag}</span>}</span>
                        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                          <span className="inline-flex items-center gap-1"><Users aria-hidden className="size-3" />{v.seats} {v.seats === 1 ? 'person' : 'persons'}</span>
                          <span className="inline-flex items-center gap-1"><Clock aria-hidden className="size-3" />{v.pickupMin} min away · {Math.round((route.km / v.speedKmh) * 60)} min trip · {route.km} km</span>
                          <span className="inline-flex items-center gap-1"><Luggage aria-hidden className="size-3" />{v.luggageLabel}</span>
                          <span className="inline-flex items-center gap-1"><Snowflake aria-hidden className="size-3" />{v.ac ? 'AC' : 'Non-AC'}</span>
                        </span>
                      </span>
                      <span className="text-right"><span className="block text-[22px] font-bold leading-7">{rupees(fare.total)}</span><span className="text-xs text-muted">Est. fare</span></span>
                      <span aria-hidden className={cn('size-5 shrink-0 rounded-full border-2', on ? 'border-primary bg-primary ring-2 ring-inset ring-white' : 'border-[#8f8688]')} />
                      <span className="sr-only">{on ? 'Selected' : 'Not selected'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start" aria-label="Fare summary">
          <Card>
            <h2 className="mb-3 text-xl font-semibold">Fare summary</h2>
            {selected ? <FareTable fare={selected.fare} /> : <p className="text-sm text-muted">Select a ride to see the fare breakdown.</p>}
          </Card>
          <DemoNote><strong>Estimates only.</strong> Simulated fares; not live driver availability.</DemoNote>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
          <button type="button" onClick={() => navigate('/cabs')} className={cn('rounded-lg border border-border px-4 py-2 text-sm font-semibold', focusRing)}>Back to search</button>
          <span className="text-sm">{selected ? <strong>{rupees(selected.fare.total)}</strong> : <span className="text-muted">No ride selected</span>}</span>
          <button type="button" disabled={!selected} onClick={() => navigate('/cabs/route')} className={cn('cab-btn rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground disabled:opacity-50', focusRing)}>Choose this ride</button>
        </div>
      </div>
    </div>
  );
}
