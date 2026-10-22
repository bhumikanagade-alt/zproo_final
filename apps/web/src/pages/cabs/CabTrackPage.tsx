import { cn } from '@zproo/ui';
import { LifeBuoy, MessageCircle, Phone, Share2, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { STAGES } from '@/features/cabs/bookingLogic';
import { LiveMap } from '@/features/cabs/components/LiveMap';
import { VehicleArt } from '@/features/cabs/components/VehicleArt';
import { Card, focusRing } from '@/features/cabs/components/ui';
import { MOCK_DRIVER } from '@/features/cabs/data';
import { otpFor } from '@/features/cabs/fare';
import { useRoad } from '@/features/cabs/geo';
import { useCabStore } from '@/features/cabs/store';
import type { TrackStage } from '@/features/cabs/types';

const TEXT: Record<TrackStage, string> = {
  searching: 'Finding your driver…', assigned: 'Driver assigned', arriving: 'Your driver is on the way', arrived: 'Your driver has arrived', started: 'Ride in progress', completed: 'Ride completed',
};
const PROGRESS: Record<TrackStage, number> = { searching: 0, assigned: 0, arriving: 0, arrived: 0, started: 0.55, completed: 1 };

export default function CabTrackPage() {
  const { id } = useParams();
  const b = useCabStore((s) => s.bookings.find((x) => x.reference === id));
  const advance = useCabStore((s) => s.advance);
  const [note, setNote] = useState('');
  const road = useRoad(b?.pickup ?? '', b?.drop ?? '');
  const live = b?.status === 'upcoming' || b?.status === 'ongoing';
  useEffect(() => {
    if (!live || !id || b?.stage === 'searching') return;
    const t = setInterval(() => advance(id), window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 8000 : 5000);
    return () => clearInterval(t);
  }, [live, id, advance, b?.stage]);
  if (!b) return <Navigate to="/cabs/bookings" replace />;
  if (b.status === 'completed') return <Navigate to={`/rides/${b.reference}/completed`} replace />;
  if (b.status === 'cancelled') return <Navigate to="/cabs/bookings" replace />;
  if (b.stage === 'searching') return <Navigate to={`/cabs/finding/${b.reference}`} replace />;
  const idx = STAGES.indexOf(b.stage);
  const share = async () => {
    const text = `Follow my ZPROO GO ride ${b.reference}`;
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); setNote('Trip details copied.'); } } catch { setNote('Sharing was cancelled or is unavailable.'); }
  };
  const ctl = 'cab-btn inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold ' + focusRing;
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      <Seo title="Track your ride" noIndex />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="order-2 space-y-3 lg:order-1">
          <Card className="cab-fade-up">
            <h1 role="status" className="text-xl font-semibold">{TEXT[b.stage]}</h1>
            <p className="text-sm text-muted">{b.stage === 'started' ? `Heading to ${b.drop}` : `Arriving in ${Math.max(1, 6 - idx * 2)} min · ${Math.max(0, 1200 - idx * 400)} m away`}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid h-14 w-24 place-items-center rounded-xl bg-gradient-to-b from-[#f4f6f9] to-[#dfe5ec] p-1"><VehicleArt id={b.vehicleId} className="h-full w-full" /></div>
              <div className="min-w-0 flex-1"><p className="font-semibold">{MOCK_DRIVER.name} <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-muted">Simulated</span></p><p className="text-xs text-muted">★ {MOCK_DRIVER.rating} · {MOCK_DRIVER.vehicle} · {MOCK_DRIVER.plate}</p></div>
            </div>
            {b.stage !== 'started' && <div className="mt-4 flex items-center justify-between rounded-xl bg-primary-light px-4 py-3"><span className="text-sm font-medium">Start ride OTP</span><span className="text-2xl font-bold tracking-[0.3em] text-primary">{otpFor(b.reference)}</span></div>}
            <div className="mt-3 flex gap-2"><button type="button" disabled title="Calling is not available yet" className={cn(ctl, 'opacity-60')}><Phone aria-hidden className="size-4" />Call</button><button type="button" disabled title="Messaging is not available yet" className={cn(ctl, 'opacity-60')}><MessageCircle aria-hidden className="size-4" />Message</button></div>
            <ol aria-label="Ride progress" className="mt-4 space-y-1.5 text-sm">{STAGES.slice(1).map((s, i) => <li key={s} className={cn('flex items-center gap-2', i + 1 <= idx ? 'font-semibold text-success' : 'text-muted')}><span aria-hidden className={cn('grid size-5 place-items-center rounded-full text-[10px]', i + 1 <= idx ? 'bg-success text-white' : 'border border-border')}>{i + 1 <= idx ? '✓' : ''}</span>{TEXT[s]}</li>)}</ol>
          </Card>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={share} className={ctl}><Share2 aria-hidden className="size-4" />Share trip</button>
            <Link to="/faq" className={ctl}><LifeBuoy aria-hidden className="size-4" />Help</Link>
            <button type="button" onClick={() => setNote('In an emergency call 112. In-app safety tools are not available yet.')} className={ctl}><ShieldAlert aria-hidden className="size-4" />Safety</button>
          </div>
          {note && <p role="status" className="text-xs text-muted">{note}</p>}
        </div>
        <LiveMap state={road} progress={PROGRESS[b.stage]} className="order-1 h-[360px] lg:order-2 lg:h-[600px]" />
      </div>
    </div>
  );
}
