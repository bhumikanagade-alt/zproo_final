import { cn } from '@zproo/ui';
import { Clock, Luggage, Route, Snowflake, Users } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { CabCouponCard } from '@/features/cabs/components/CabCouponCard';
import { useCabCoupon } from '@/features/cabs/useCabCoupon';
import { Card, FareTable, FlowHeader, focusRing, VehicleIcon, useRequireRide } from '@/features/cabs/components/ui';
import { calcFare, routeFor, getVehicle, rupees } from '@/features/cabs/fare';

export default function CabDetailsPage() {
  const { draft, redirect } = useRequireRide();
  const navigate = useNavigate();
  const { adminDiscount, problem } = useCabCoupon();
  if (redirect) return redirect;
  const v = getVehicle(draft.vehicleId!);
  const route = routeFor(draft);
  const fare = calcFare(v, route, draft.couponCode, adminDiscount);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Seo title="Ride details" noIndex />
      <FlowHeader title="Ride details" back="/cabs/pickup" step={3} />
      <Card>
        <div className="flex items-center gap-4">
          <VehicleIcon id={v.id} size="lg" />
          <div className="flex-1"><h2 className="text-xl font-semibold">{v.label}</h2>
            <p className="text-sm text-muted">{v.seats} passengers · {v.luggageLabel} · {v.ac ? 'AC' : 'Non-AC'}</p>
            <div className="mt-1 flex gap-2">{v.tag && <span className="rounded-full bg-[#eaf7ee] px-2 py-0.5 text-xs font-semibold text-[#16813d]">{v.tag}</span>}</div></div>
          <p className="text-right"><span className="block text-[22px] font-bold leading-7">{rupees(fare.total)}</span><span className="text-xs text-muted">Est. fare</span></p>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div><dt className="flex items-center gap-1 text-xs text-muted"><Clock aria-hidden className="size-3" />Estimated arrival</dt><dd className="font-semibold">{v.pickupMin} min</dd></div>
          <div><dt className="flex items-center gap-1 text-xs text-muted"><Users aria-hidden className="size-3" />Estimated time</dt><dd className="font-semibold">{route.minutes} min</dd></div>
          <div><dt className="flex items-center gap-1 text-xs text-muted"><Route aria-hidden className="size-3" />Distance</dt><dd className="font-semibold">{route.km} km</dd></div>
        </dl>
        <p className="mt-3 flex gap-4 text-xs text-muted"><span className="inline-flex items-center gap-1"><Luggage aria-hidden className="size-3" />{v.luggageLabel}</span><span className="inline-flex items-center gap-1"><Snowflake aria-hidden className="size-3" />{v.ac ? 'AC' : 'Non-AC'}</span></p>
      </Card>
      <Card className="mt-4"><h2 className="mb-3 text-xl font-semibold">Fare breakdown</h2><FareTable fare={fare} /><p className="mt-3 text-xs text-muted">Estimated fare including GST. Final fare may differ in a real service.</p></Card>
      <div className="mt-4"><CabCouponCard vehicle={v} route={route} discount={fare.discount} problem={problem} idPrefix="details-cpn" /></div>
      <div className="mt-6 flex justify-between">
        <button type="button" onClick={() => navigate('/cabs/pickup')} className={cn('rounded-lg border border-border px-5 py-2.5 font-semibold', focusRing)}>Back</button>
        <button type="button" onClick={() => navigate('/cabs/passenger')} className={cn('rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground', focusRing)}>Choose this ride</button>
      </div>
    </div>
  );
}
