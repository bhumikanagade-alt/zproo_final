import { cn } from '@zproo/ui';
import { Check, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { Card, focusRing } from '@/features/cabs/components/ui';
import { getVehicle, rupees } from '@/features/cabs/fare';
import { useCabStore } from '@/features/cabs/store';
import { downloadReceipt } from './receipt';

export default function CabCompletedPage() {
  const { id } = useParams();
  const { bookings, rate, bookAgain } = useCabStore();
  const b = bookings.find((x) => x.reference === id);
  const navigate = useNavigate();
  const [stars, setStars] = useState(b?.rating?.stars ?? 0);
  const [text, setText] = useState(b?.rating?.feedback ?? '');
  const [saved, setSaved] = useState(Boolean(b?.rating));
  if (!b || b.status !== 'completed') return <Navigate to="/cabs/bookings" replace />;
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Seo title="Ride completed" noIndex />
      <Card className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#16813d] text-white"><Check aria-hidden className="size-8" /></span>
        <h1 className="mt-3 text-[28px] font-bold leading-9">Ride completed</h1>
        <p className="text-sm text-muted">Thank you for riding with ZPROO GO (demo).</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-left text-sm">
          <div><dt className="text-xs text-muted">Booking ID</dt><dd className="font-bold">{b.reference}</dd></div>
          <div><dt className="text-xs text-muted">Ride type</dt><dd className="font-bold">{getVehicle(b.vehicleId).label}</dd></div>
          <div><dt className="text-xs text-muted">Final demo fare</dt><dd className="font-bold">{rupees(b.fare.total)}</dd></div>
        </dl>
        <fieldset className="mt-5"><legend className="mb-1 text-sm font-semibold">Rate your ride</legend>
          <div className="flex justify-center gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`} aria-pressed={stars === n} onClick={() => { setStars(n); setSaved(false); }} className={cn('rounded p-1', focusRing)}><Star aria-hidden className={cn('size-7', n <= stars ? 'fill-amber-400 text-amber-500' : 'text-[#8f8688]')} /></button>)}</div>
          <label htmlFor="fb" className="sr-only">Feedback</label>
          <textarea id="fb" rows={2} value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} placeholder="Tell us more (optional)" className={cn('mt-2 w-full rounded-lg border border-border p-2', focusRing)} />
          <button type="button" disabled={!stars} onClick={() => { rate(b.reference, stars, text); setSaved(true); }} className={cn('mt-2 rounded-lg border border-primary px-4 py-1.5 text-sm font-semibold text-primary disabled:opacity-50', focusRing)}>Submit rating</button>
          {saved && <p role="status" className="mt-1 text-sm text-success">Thanks for your feedback!</p>}</fieldset>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => { bookAgain(b.reference); navigate('/cabs'); }} className={cn('rounded-xl bg-primary py-3 font-semibold text-primary-foreground', focusRing)}>Book again</button>
          <button type="button" onClick={() => downloadReceipt(b)} className={cn('rounded-xl border border-primary py-3 font-semibold text-primary', focusRing)}>View receipt</button>
        </div>
        <Link to="/cabs/bookings" className={cn('mt-3 inline-block rounded text-sm text-primary underline', focusRing)}>Go to My Bookings</Link>
      </Card>
    </div>
  );
}
