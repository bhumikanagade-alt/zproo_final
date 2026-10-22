import { Button } from '@zproo/ui';
import { CalendarClock, ChevronRight, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { BikeImage } from '@/features/bikes/components/BikeImage';
import { DemoNote, EmptyState } from '@/features/bikes/components/ui';
import { formatDateTime, parseLocal } from '@/features/bikes/dates';
import { bikeLinks } from '@/features/bikes/links';
import { rupees } from '@/features/bikes/pricing';
import { useBikeStore } from '@/features/bikes/store';

/** Demo bookings made on this device (saved in the browser, never sent anywhere). */
export default function BikeBookingsPage() {
  const bookings = useBikeStore((s) => s.bookings);

  return (
    <div className="bg-background pb-16">
      <Seo title="My bike bookings" noIndex />
      <div className="mx-auto max-w-[900px] space-y-6 px-4 py-6">
        <div>
          <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
            <Link to={bikeLinks.home()} className="hover:text-foreground">Bikes</Link> <span aria-hidden>/</span>{' '}
            <span aria-current="page" className="text-foreground">My bookings</span>
          </nav>
          <h1 className="text-[28px] font-bold leading-9">My bike bookings</h1>
          <p className="mt-1 text-sm text-muted">Demo bookings made on this device.</p>
        </div>

        {bookings.length === 0 ? (
          <EmptyState
            title="No bike bookings yet"
            message="When you book a bike, your demo booking will appear here."
            action={<Button asChild><Link to={bikeLinks.results()}>Browse bikes</Link></Button>}
          />
        ) : (
          <ul className="space-y-4" aria-label="Bike bookings">
            {bookings.map((b) => {
              const start = parseLocal(b.request.schedule.pickupDate, b.request.schedule.pickupTime);
              return (
                <li key={b.reference}>
                  <Link
                    to={bikeLinks.confirmation(b.reference)}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
                  >
                    <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-100"><BikeImage image={b.bike.images[0]} /></div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="text-xs font-semibold tracking-wide text-primary">{b.reference} · Confirmed (demo)</p>
                      <p className="truncate text-base font-bold">{b.bike.name}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-muted"><CalendarClock aria-hidden className="size-4 shrink-0" />{start ? formatDateTime(start) : '—'}</p>
                      <p className="flex items-center gap-1.5 truncate text-muted"><MapPin aria-hidden className="size-4 shrink-0" />{b.pickup.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted">Estimated total</p>
                      <p className="text-lg font-bold">{rupees(b.quote.total)}</p>
                    </div>
                    <ChevronRight aria-hidden className="hidden size-5 shrink-0 text-muted sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <DemoNote />
      </div>
    </div>
  );
}
