import { cn, Dialog, DialogContent, DialogDescription, DialogTitle } from '@zproo/ui';
import { MapPin } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { Card, DemoNote, focusRing, StatusPill, VehicleIcon } from '@/features/cabs/components/ui';
import { CANCEL_REASONS } from '@/features/cabs/data';
import { canCancel, cancellationFee, formatWhen, getVehicle, otpFor, rupees } from '@/features/cabs/fare';
import { useCabStore } from '@/features/cabs/store';
import type { BookingStatus, CabBooking } from '@/features/cabs/types';
import { downloadReceipt } from './receipt';

const TABS: { id: 'all' | BookingStatus; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'upcoming', label: 'Upcoming' }, { id: 'completed', label: 'Completed' }, { id: 'cancelled', label: 'Cancelled' },
];

function CancelDialog({ booking, onClose }: { booking: CabBooking | null; onClose: () => void }) {
  const cancel = useCabStore((s) => s.cancel);
  const [reason, setReason] = useState<string>(CANCEL_REASONS[0]);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState<number | null>(null);
  const close = () => { setDone(null); setComment(''); onClose(); };
  const fee = booking ? cancellationFee(booking) : 0;
  return (
    <Dialog open={booking !== null} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="rounded-[20px]">
        {booking && done === null && (
          <>
            <DialogTitle className="text-xl font-semibold">Cancel ride?</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted">{booking.reference} · {booking.pickup} → {booking.drop}</DialogDescription>
            <label htmlFor="cr" className="mb-1 mt-4 block text-xs font-medium text-muted">Reason</label>
            <select id="cr" value={reason} onChange={(e) => setReason(e.target.value)} className={cn('h-11 w-full rounded-lg border border-border bg-card px-3', focusRing)}>{CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
            <label htmlFor="cc" className="mb-1 mt-3 block text-xs font-medium text-muted">Comments (optional)</label>
            <textarea id="cc" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} className={cn('w-full rounded-lg border border-border bg-card p-2', focusRing)} />
            <p className="mt-3 rounded-lg bg-warning/10 p-2 text-sm text-amber-900">{fee === 0 ? 'No cancellation fee (demo rule: free when more than 30 minutes before pickup).' : `Cancellation fee: ${rupees(fee)} (demo rule: within 30 minutes of pickup).`} This is a simulation; no refund is processed by a real payment service.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={close} className={cn('rounded-lg border border-border px-4 py-2 font-semibold', focusRing)}>Go back</button>
              <button type="button" onClick={() => { cancel(booking.reference, reason, comment); setDone(fee); }} className={cn('rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground', focusRing)}>Confirm cancellation</button>
            </div>
          </>
        )}
        {done !== null && (
          <div role="status" className="py-2 text-center"><DialogTitle className="text-xl font-semibold">Ride cancelled</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted">{done ? `A demo cancellation fee of ${rupees(done)} applies.` : 'No cancellation fee applies.'}</DialogDescription>
            <button type="button" onClick={close} className={cn('mt-4 rounded-lg bg-primary px-5 py-2 font-semibold text-primary-foreground', focusRing)}>Done</button></div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CabBookingsPage() {
  const bookings = useCabStore((s) => s.bookings);
  const bookAgain = useCabStore((s) => s.bookAgain);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<'all' | BookingStatus>('all');
  const [target, setTarget] = useState<CabBooking | null>(null);
  const [open, setOpen] = useState<string | null>(params.get('ref'));
  const shown = bookings.filter((b) => tab === 'all' || b.status === tab || (tab === 'upcoming' && b.status === 'ongoing'));
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Seo title="My cab bookings" noIndex />
      <h1 className="mb-4 text-[28px] font-bold leading-9">My Bookings</h1>
      <div role="tablist" aria-label="Booking status" className="mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn('h-9 shrink-0 rounded-full px-4 text-sm font-semibold', focusRing, tab === t.id ? 'bg-primary text-primary-foreground' : 'border border-border bg-card')}>{t.label}</button>)}
      </div>
      {shown.length === 0 ? (
        <Card className="text-center"><p className="font-semibold">No {tab === 'all' ? '' : `${tab} `}rides yet</p><Link to="/cabs" className={cn('mt-3 inline-block rounded-lg bg-primary px-5 py-2 font-semibold text-primary-foreground', focusRing)}>Book a ride</Link></Card>
      ) : (
        <ul className="space-y-3">
          {shown.map((b) => (
            <li key={b.reference}><Card className="cab-lift p-4 sm:p-4">
              <div className="flex items-start gap-3">
                <VehicleIcon id={b.vehicleId} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><p className="font-semibold">{getVehicle(b.vehicleId).label}</p><StatusPill status={b.status} /></div>
                  <p className="text-xs text-muted">Booking ID: {b.reference}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm"><MapPin aria-hidden className="size-3 text-primary" />{b.pickup} → {b.drop}</p>
                  <p className="text-xs text-muted">{formatWhen(b.date, b.time)}</p>
                </div>
                <p className="text-lg font-bold">{rupees(b.fare.total)}</p>
              </div>
              {open === b.reference && <div className="mt-3 rounded-lg bg-background p-3 text-sm"><p>Passenger: {b.passenger.name} · {b.passenger.mobile}</p><p>Pickup point: {b.pickupPoint.name}</p><p>{b.route.km} km · {b.route.minutes} min</p>{(b.status === 'upcoming' || b.status === 'ongoing') && <p>Ride OTP: <strong className="tracking-widest text-primary">{otpFor(b.reference)}</strong></p>}{b.cancellation && <p>Cancelled: {b.cancellation.reason}{b.cancellation.fee ? ` (fee ${rupees(b.cancellation.fee)})` : ''}</p>}
                <button type="button" onClick={() => downloadReceipt(b)} className={cn('mt-2 rounded text-primary underline', focusRing)}>Download receipt</button></div>}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button type="button" aria-expanded={open === b.reference} onClick={() => setOpen(open === b.reference ? null : b.reference)} className={cn('rounded-lg border border-primary px-4 py-1.5 text-sm font-semibold text-primary', focusRing)}>View details</button>
                {(b.status === 'upcoming' || b.status === 'ongoing') && <Link to={`/rides/${b.reference}`} className={cn('rounded-lg border border-border px-4 py-1.5 text-sm font-semibold', focusRing)}>Track ride</Link>}
                {canCancel(b) && <button type="button" onClick={() => setTarget(b)} className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold text-primary', focusRing)}>Cancel ride</button>}
                {b.status === 'completed' && <button type="button" onClick={() => { bookAgain(b.reference); navigate('/cabs'); }} className={cn('rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground', focusRing)}>Book again</button>}
              </div>
            </Card></li>
          ))}
        </ul>
      )}
      <div className="mt-4"><DemoNote /></div>
      <CancelDialog booking={target} onClose={() => setTarget(null)} />
    </div>
  );
}
