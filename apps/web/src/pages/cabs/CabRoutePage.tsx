import { cn } from '@zproo/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { Card, FlowHeader, focusRing, LocationInput, useRequireRide } from '@/features/cabs/components/ui';
import { LiveMap } from '@/features/cabs/components/LiveMap';
import { findLocation, routeFor } from '@/features/cabs/fare';
import { useRoad } from '@/features/cabs/geo';
import { useCabStore } from '@/features/cabs/store';
import { isSameLocation } from '@/features/cabs/validation';

export default function CabRoutePage() {
  const { draft, redirect } = useRequireRide();
  const setLocation = useCabStore((s) => s.setLocation);
  const navigate = useNavigate();
  const [editing, setEditing] = useState<'pickup' | 'drop' | null>(null);
  const road = useRoad(draft.pickup, draft.drop);
  if (redirect) return redirect;
  const route = routeFor(draft);
  const rental = draft.mode === 'rental';
  const same = !rental && isSameLocation(draft.pickup, draft.drop);
  const place = (kind: 'pickup' | 'drop', label: string, dot: string) => (
    <Card className="p-4 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 gap-3"><span aria-hidden className={cn('mt-1 size-3 shrink-0 rounded-full', dot)} />
          <div className="min-w-0"><p className="text-xs font-medium text-muted">{label}</p><p className="font-semibold">{draft[kind]}</p><p className="text-xs text-muted">{findLocation(draft[kind])?.area ?? 'Address as entered'}</p></div></div>
        <button type="button" onClick={() => setEditing(editing === kind ? null : kind)} className={cn('rounded px-2 text-sm font-semibold text-primary hover:underline', focusRing)}>{editing === kind ? 'Done' : 'Change'}</button>
      </div>
      {editing === kind && <div className="mt-3"><LocationInput label={label} value={draft[kind]} onChange={(v) => setLocation(kind, v)} /></div>}
    </Card>
  );
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      <Seo title="Confirm your route" noIndex />
      <FlowHeader title="Confirm your route" back="/cabs/results" step={1} />
      <div className={cn('mb-4 grid gap-3', !rental && 'md:grid-cols-2')}>{place('pickup', 'Pickup location', 'bg-[#16813d]')}{!rental && place('drop', 'Drop location', 'bg-primary')}</div>
      {rental ? <Card className="p-4 text-sm"><p className="font-semibold">Hourly rental · {draft.rentalHours ?? 4} hours</p><p className="mt-1 text-muted">{route.km} km included. The cab stays with you for the whole package, so there is no fixed drop location.</p></Card> : <LiveMap state={road} className="h-[360px] sm:h-[460px]" />}
      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        {[['Distance', `${route.km} km`], ['Est. time', `${route.minutes} min`], ['Route', rental ? 'Package' : road.status === 'ready' ? 'By road' : 'Approx.']].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-3"><dt className="text-xs text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>
        ))}
      </dl>
      {same && <p role="alert" className="mt-3 text-sm text-danger">Pickup and drop-off cannot be the same. Please choose a different location.</p>}
      {!draft.vehicleId && <p role="status" className="mt-3 text-sm text-muted">Your route changed, so pick a ride again to see updated fares.</p>}
      <div className="mt-6 flex justify-between">
        <button type="button" onClick={() => navigate('/cabs/results')} className={cn('rounded-lg border border-border px-5 py-2.5 font-semibold transition-colors hover:bg-background', focusRing)}>Back</button>
        <button type="button" disabled={same} onClick={() => navigate(draft.vehicleId ? '/cabs/pickup' : '/cabs/results')} className={cn('cab-btn rounded-xl bg-primary px-8 py-2.5 font-semibold text-primary-foreground disabled:opacity-50', focusRing)}>{draft.vehicleId ? 'Next' : 'Choose a ride'}</button>
      </div>
    </div>
  );
}
