import { cn } from '@zproo/ui';
import { Building2, Bus, Hotel, Search, TrainFront } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { FlowHeader, focusRing, useRequireRide } from '@/features/cabs/components/ui';
import { LANDMARKS, PICKUP_POINTS } from '@/features/cabs/data';
import { useCabStore } from '@/features/cabs/store';
import type { PickupPoint } from '@/features/cabs/types';

const LM_ICON = { Mall: Building2, Hotel, 'Bus Stop': Bus, 'Metro Station': TrainFront } as const;

export default function CabPickupPage() {
  const { draft, redirect } = useRequireRide();
  const patch = useCabStore((s) => s.patch);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [choice, setChoice] = useState<PickupPoint | null>(null);
  if (redirect) return redirect;
  const points = PICKUP_POINTS.map((p) => ({ ...p, name: `${p.name} — ${draft.pickup}` }));
  const shown = points.filter((p) => `${p.name} ${p.address}`.toLowerCase().includes(q.trim().toLowerCase()));
  const current = choice ?? draft.pickupPoint;
  const currentName = (p: PickupPoint) => points.find((x) => x.id === p.id)?.name ?? p.name;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Seo title="Choose pickup point" noIndex />
      <FlowHeader title="Choose pickup point" back="/cabs/route" step={2} />
      <label htmlFor="pp-search" className="sr-only">Search pickup address</label>
      <div className="relative"><Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input id="pp-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pickup address…" className={cn('h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3', focusRing)} /></div>
      <h2 className="mb-2 mt-6 text-xl font-semibold">Suggested pickup points</h2>
      {shown.length === 0 ? <p role="status" className="text-sm text-muted">No pickup points match “{q}”.</p> : (
        <ul role="radiogroup" aria-label="Suggested pickup points" className="space-y-2">
          {shown.map((p) => (
            <li key={p.id}>
              <button type="button" role="radio" aria-checked={current.id === p.id} onClick={() => setChoice({ id: p.id, name: p.name, address: p.address })} className={cn('flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left', focusRing, current.id === p.id ? 'border-primary bg-primary-light' : 'border-border')}>
                <span aria-hidden className={cn('size-5 shrink-0 rounded-full border-2', current.id === p.id ? 'border-primary bg-primary ring-2 ring-inset ring-white' : 'border-[#8f8688]')} />
                <span><span className="block text-sm font-semibold">{p.name}</span><span className="text-xs text-muted">{p.address}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mb-2 mt-6 text-xl font-semibold">Nearby landmarks</h2>
      <ul className="grid grid-cols-2 gap-2 text-sm">
        {LANDMARKS.map((l) => {
          const I = LM_ICON[l];
          const point: PickupPoint = { id: `lm-${l.toLowerCase().replace(/\s+/g, '-')}`, name: `${l} — ${draft.pickup}`, address: `Near the ${l.toLowerCase()} close to your pickup` };
          const selected = current.id === point.id;
          return (
            <li key={l}>
              <button type="button" aria-pressed={selected} onClick={() => setChoice(point)} className={cn('flex w-full items-center gap-2 rounded-lg border bg-card p-2 text-left transition-colors hover:border-primary hover:bg-primary-light', focusRing, selected ? 'border-primary bg-primary-light font-semibold' : 'border-transparent')}>
                <I aria-hidden className="size-4 text-blue-600" />{l}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">Tap a landmark to use it as your pickup point. Landmarks are generic suggestions in this demo.</p>
      <p className="mt-4 text-sm">Selected: <strong>{currentName(current)}</strong></p>
      <div className="mt-6 flex justify-between">
        <button type="button" onClick={() => navigate('/cabs/route')} className={cn('rounded-lg border border-border px-5 py-2.5 font-semibold', focusRing)}>Back</button>
        <button type="button" onClick={() => { patch({ pickupPoint: current }); navigate('/cabs/details'); }} className={cn('rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground', focusRing)}>Confirm pickup point</button>
      </div>
    </div>
  );
}
