import { cn } from '@zproo/ui';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { VehicleArt } from '@/features/cabs/components/VehicleArt';
import { Card, focusRing } from '@/features/cabs/components/ui';
import { getVehicle, rupees } from '@/features/cabs/fare';
import { useCabStore } from '@/features/cabs/store';

const MESSAGES = ['Contacting drivers near your pickup…', 'Waiting for a driver to accept your ride…', 'Almost there — confirming your driver…'];

export default function CabFindingPage() {
  const { ref } = useParams();
  const b = useCabStore((s) => s.bookings.find((x) => x.reference === ref));
  const { advance, cancel } = useCabStore();
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const searching = b?.status === 'upcoming' && b.stage === 'searching';

  useEffect(() => {
    if (!searching || !ref) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const total = reduce ? 2500 : 7000;
    const m = setInterval(() => setI((n) => Math.min(n + 1, MESSAGES.length - 1)), total / MESSAGES.length);
    const t = setTimeout(() => { advance(ref); navigate(`/cabs/confirmation/${ref}`, { replace: true }); }, total);
    return () => { clearInterval(m); clearTimeout(t); };
  }, [searching, ref, advance, navigate]);

  if (!b) return <Navigate to="/cabs" replace />;
  if (!searching) return <Navigate to={b.status === 'cancelled' ? '/cabs/bookings' : `/cabs/confirmation/${b.reference}`} replace />;
  const v = getVehicle(b.vehicleId);
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-8">
      <Seo title="Finding your driver" noIndex />
      <Card className="w-full text-center">
        <div className="relative mx-auto grid h-56 w-56 place-items-center" aria-hidden>
          {[0, 0.8, 1.6].map((d) => <span key={d} className="cab-ring absolute inset-0 rounded-full border-2 border-primary" style={{ animationDelay: `${d}s` }} />)}
          <span className="absolute inset-8 rounded-full bg-primary-light" />
          <VehicleArt id={b.vehicleId} className="cab-float relative z-10 w-40" />
        </div>
        <h1 role="status" aria-live="polite" className="mt-2 text-[28px] font-bold leading-9">Finding your {v.label}</h1>
        <p className="mt-1 min-h-6 text-sm text-muted">{MESSAGES[i]}</p>
        <div className="cab-shimmer mx-auto mt-4 h-2 w-3/4 rounded-full" aria-hidden />
        <div className="mt-5 rounded-xl bg-background p-3 text-left text-sm">
          <p className="font-semibold">{b.pickup} → {b.drop}</p>
          <p className="text-xs text-muted">Booking {b.reference} · Est. fare {rupees(b.fare.total)}</p>
        </div>
        <button type="button" onClick={() => { cancel(b.reference, 'Cancelled while finding driver', ''); navigate('/cabs/bookings'); }} className={cn('mt-4 rounded-lg border border-border px-5 py-2 text-sm font-semibold transition-colors hover:bg-background', focusRing)}>Cancel request</button>
      </Card>
    </div>
  );
}
