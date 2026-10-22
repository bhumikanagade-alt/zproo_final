import { cn } from '@zproo/ui';
import { Check, Download, MapPin, Navigation, ShieldCheck, Star } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { VehicleArt } from '@/features/cabs/components/VehicleArt';
import { Card, focusRing } from '@/features/cabs/components/ui';
import { MOCK_DRIVER } from '@/features/cabs/data';
import { formatWhen, getVehicle, otpFor, rupees } from '@/features/cabs/fare';
import { useCabStore } from '@/features/cabs/store';
import { downloadReceipt } from './receipt';

const PAY = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', wallet: 'Wallet', cash: 'Cash' } as const;

export default function CabConfirmationPage() {
  const { ref } = useParams();
  const b = useCabStore((s) => s.bookings.find((x) => x.reference === ref));
  if (!b) return <Navigate to="/cabs/bookings" replace />;
  if (b.stage === 'searching' && b.status === 'upcoming') return <Navigate to={`/cabs/finding/${b.reference}`} replace />;
  const v = getVehicle(b.vehicleId);
  const otp = otpFor(b.reference);
  const btn = 'cab-btn rounded-xl py-3 text-center font-semibold ' + focusRing;
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Seo title="Booking confirmed" noIndex />
      <section className="cab-fade-up overflow-hidden rounded-2xl bg-gradient-to-br from-[#14803c] to-[#0e5a2a] p-6 text-center text-white shadow-lg">
        <span className="cab-pop mx-auto grid size-16 place-items-center rounded-full bg-white text-[#16813d]"><Check aria-hidden className="size-9" strokeWidth={3} /></span>
        <h1 role="status" className="mt-3 text-[28px] font-bold leading-9">Booking confirmed!</h1>
        <p className="text-sm text-white/85">Your driver has accepted and is on the way to your pickup.</p>
      </section>

      <Card className="cab-fade-up text-center" >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your ride OTP</h2>
        <p className="sr-only">Your ride OTP is {otp.split('').join(' ')}</p>
        <div aria-hidden className="mt-3 flex justify-center gap-3">
          {otp.split('').map((d, i) => <span key={i} className="cab-pop grid size-16 place-items-center rounded-xl border-2 border-primary bg-primary-light text-4xl font-bold text-primary" style={{ animationDelay: `${i * 90}ms` }}>{d}</span>)}
        </div>
        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted"><ShieldCheck aria-hidden className="size-4 text-success" />Share this OTP with your driver only after you board, to start the ride.</p>
      </Card>

      <Card className="cab-fade-up">
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-36 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#f4f6f9] to-[#dfe5ec] p-1"><VehicleArt id={b.vehicleId} className="cab-float h-full w-full" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{MOCK_DRIVER.name} <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-muted">Simulated driver</span></p>
            <p className="flex items-center gap-1 text-sm text-muted"><Star aria-hidden className="size-4 fill-amber-400 text-amber-500" />{MOCK_DRIVER.rating} · {MOCK_DRIVER.trips} rides</p>
            <p className="text-sm">{v.label} · <span className="rounded border border-border px-1.5 font-semibold tracking-wide">{MOCK_DRIVER.plate}</span></p>
          </div>
        </div>
        <ol className="relative mt-5 space-y-4 border-l-2 border-dashed border-border pl-5 text-sm">
          <li><span aria-hidden className="absolute -left-[7px] mt-1 size-3 rounded-full bg-[#16813d]" /><p className="text-xs text-muted">Pickup · {b.pickupPoint.name.split(' — ')[0]}</p><p className="font-semibold">{b.pickup}</p></li>
          <li><span aria-hidden className="absolute -left-[7px] mt-1 size-3 rounded-sm bg-primary" /><p className="text-xs text-muted">Drop</p><p className="font-semibold">{b.drop}</p></li>
        </ol>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
          <div><dt className="text-xs text-muted">Booking ID</dt><dd className="font-bold">{b.reference}</dd></div>
          <div><dt className="text-xs text-muted">Scheduled</dt><dd className="font-semibold">{formatWhen(b.date, b.time)}</dd></div>
          <div><dt className="text-xs text-muted">Payment</dt><dd className="font-semibold">{PAY[b.paymentMethod]}</dd></div>
          <div><dt className="text-xs text-muted">Fare (estimated)</dt><dd className="text-[22px] font-bold leading-7">{rupees(b.fare.total)}</dd></div>
        </dl>
        {b.fare.discount > 0 && <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">You saved {rupees(b.fare.discount)} on this ride</p>}
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link to={`/rides/${b.reference}`} className={cn(btn, 'flex items-center justify-center gap-2 bg-primary text-primary-foreground sm:col-span-2')}><Navigation aria-hidden className="size-4" />Track ride</Link>
        <Link to={`/cabs/bookings?ref=${b.reference}`} className={cn(btn, 'flex items-center justify-center gap-2 border border-primary text-primary hover:bg-primary-light')}><MapPin aria-hidden className="size-4" />View ride details</Link>
        <button type="button" onClick={() => downloadReceipt(b)} className={cn(btn, 'flex items-center justify-center gap-2 border border-primary text-primary hover:bg-primary-light')}><Download aria-hidden className="size-4" />Download receipt</button>
      </div>
      <p className="text-center text-xs text-muted">Driver details and payment are simulated in this version of ZPROO GO; no real driver is dispatched.</p>
    </div>
  );
}
