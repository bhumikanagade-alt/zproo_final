import { cn } from '@zproo/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { Card, FlowHeader, focusRing, TextField, useRequireRide } from '@/features/cabs/components/ui';
import { getVehicle } from '@/features/cabs/fare';
import { useCabStore } from '@/features/cabs/store';
import { sanitizeMobile, sanitizeName, validatePassenger } from '@/features/cabs/validation';

function MobileField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string | undefined }) {
  return (
    <div>
      <label htmlFor="cab-mobile" className="mb-1 block text-xs font-medium text-muted">Mobile number *</label>
      <div className={cn('flex h-11 overflow-hidden rounded-lg border bg-card', error ? 'border-danger' : 'border-border', 'focus-within:ring-2 focus-within:ring-foreground focus-within:ring-offset-2')}>
        <span aria-hidden className="grid place-items-center border-r border-border bg-neutral-50 px-3 text-sm font-semibold">+91</span>
        <input id="cab-mobile" type="tel" inputMode="numeric" autoComplete="tel-national" value={value} onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined} aria-describedby="cab-mobile-msg" placeholder="98765 43210" className="w-full bg-transparent px-3 text-[15px] outline-none" />
        <span aria-hidden className="grid place-items-center pr-3 text-xs text-muted">{value.length}/10</span>
      </div>
      {error ? <p id="cab-mobile-msg" role="alert" className="mt-1 text-xs text-danger">{error}</p> : <p id="cab-mobile-msg" className="mt-1 text-xs text-muted">10 digits only. +91 is added automatically.</p>}
    </div>
  );
}

export default function CabPassengerPage() {
  const { draft, redirect } = useRequireRide();
  const patch = useCabStore((s) => s.patch);
  const navigate = useNavigate();
  const [errors, setErrors] = useState<ReturnType<typeof validatePassenger>>({});
  if (redirect) return redirect;
  const p = draft.passenger;
  const set = (k: keyof typeof p, v: string | number) => patch({ passenger: { ...p, [k]: v } });
  const max = getVehicle(draft.vehicleId!).seats;
  const next = () => {
    const e = validatePassenger(p);
    setErrors(e);
    if (Object.keys(e).length === 0) navigate('/cabs/payment');
  };
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Seo title="Passenger details" noIndex />
      <FlowHeader title="Passenger details" back="/cabs/details" step={4} />
      <Card>
        <form noValidate onSubmit={(e) => { e.preventDefault(); next(); }} className="space-y-4">
          <TextField label="Full name *" value={p.name} onChange={(e) => set('name', sanitizeName(e.target.value))} error={errors.name} autoComplete="name" maxLength={60} placeholder="e.g. Asha Rao" hint="Letters only, numbers are not allowed" />
          <MobileField value={p.mobile} onChange={(v) => set('mobile', sanitizeMobile(v))} error={errors.mobile} />
          <TextField label="Email (optional)" type="email" inputMode="email" value={p.email} onChange={(e) => set('email', e.target.value.replace(/\s/g, '').slice(0, 254))} onBlur={() => setErrors((x) => ({ ...x, email: validatePassenger(p).email }))} error={errors.email} autoComplete="email" placeholder="name@example.com" />
          <div><label htmlFor="pc" className="mb-1 block text-xs font-medium text-muted">Passengers</label>
            <select id="pc" value={Math.min(p.count, max)} onChange={(e) => set('count', Number(e.target.value))} className={cn('h-11 w-full rounded-lg border border-border bg-card px-3', focusRing)}>
              {Array.from({ length: max }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
          <TextField label="Pickup notes (optional)" value={p.pickupNotes} onChange={(e) => set('pickupNotes', e.target.value)} placeholder="Gate number, landmark…" />
          <div><label htmlFor="ins" className="mb-1 block text-xs font-medium text-muted">Additional instructions (optional)</label>
            <textarea id="ins" rows={3} value={p.instructions} onChange={(e) => set('instructions', e.target.value)} placeholder="E.g. Call when you arrive" className={cn('w-full rounded-lg border border-border bg-card p-3 text-[15px]', focusRing)} /></div>
          <p className="text-xs text-muted">We only ask for what the driver needs. No ID or card details here.</p>
          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => navigate('/cabs/details')} className={cn('rounded-lg border border-border px-5 py-2.5 font-semibold', focusRing)}>Back</button>
            <button type="submit" className={cn('rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground', focusRing)}>Proceed to payment</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
