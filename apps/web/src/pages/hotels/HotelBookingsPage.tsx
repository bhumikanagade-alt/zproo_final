import { Badge, Button } from '@zproo/ui';
import { CalendarDays, ChevronRight, Hotel } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { tabOfBooking, useMyHotelBookings, type BookingTab } from '@/features/hotels/bookingHistory';
import { formatINR } from '@/features/hotels/data';
import { formatDate } from '@/features/hotels/dates';

const TABS: readonly { id: BookingTab; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
];

/** The signed-in guest's hotel stays on this device: upcoming, past and cancelled. */
export default function HotelBookingsPage() {
  const all = useMyHotelBookings();
  const [tab, setTab] = useState<BookingTab>('upcoming');
  const list = all.filter((b) => tabOfBooking(b) === tab);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <Seo title="My hotel bookings" noIndex />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My hotel bookings</h1>
        <Link to="/bookings" className="mt-1 inline-block text-sm font-semibold text-primary hover:underline">Looking for bus or flight tickets?</Link>
      </div>

      <div role="tablist" aria-label="Hotel bookings" className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? 'rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground' : 'rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold hover:border-foreground/30'}
          >
            {t.label} ({all.filter((b) => tabOfBooking(b) === t.id).length})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div role="status" className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Hotel aria-hidden className="mx-auto size-10 text-muted" />
          <p className="mt-3 text-lg font-extrabold">No {tab} hotel bookings</p>
          <p className="mt-1 text-sm text-muted">Your hotel stays will appear here after you book.</p>
          <Button asChild className="mt-4"><Link to="/hotels">Find a hotel</Link></Button>
        </div>
      ) : (
        <ul className="space-y-3" aria-label={`${tab} hotel bookings`}>
          {list.map((item) => {
            const b = item.booking;
            return (
              <li key={b.reference}>
                <Link to={`/hotels/bookings/${encodeURIComponent(b.reference)}`} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-raised">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-light text-primary"><Hotel aria-hidden className="size-6" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold">{b.hotelName}</span>
                    <span className="block text-sm text-muted">{b.city} · {b.roomName}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden className="size-3.5" /> {formatDate(b.checkIn)} → {formatDate(b.checkOut)}</span>
                      <span>Ref {b.reference}</span>
                    </span>
                  </span>
                  <span className="text-right">
                    <Badge variant={item.status === 'CANCELLED' ? 'outline' : 'soft'}>{item.status === 'CANCELLED' ? 'Cancelled' : tab === 'past' ? 'Completed' : 'Confirmed'}</Badge>
                    <span className="mt-1 block text-sm font-bold">{formatINR(b.price.totalPaise)}</span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
