import { ArrowRight, BedDouble, Flame, Heart, Percent, ReceiptText, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { useBookingHistory } from '../bookingHistory';
import { formatINR } from '../data';
import { COLLECTIONS, allDestinations, currentDeals, hotelsInCollection, trendingDestinations } from '../extras';
import { HotelTile } from './HotelTile';

/** Landing-page extras: trending destinations, collections, today’s deals and account shortcuts. */
export function DiscoverySections() {
  const history = useBookingHistory((s) => s.items);
  const trending = trendingDestinations(history.filter((i) => i.status === 'CONFIRMED').map((i) => i.booking.city)).slice(0, 4);
  const destinations = allDestinations();
  const deals = currentDeals().slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="Your hotel shortcuts" className="flex flex-wrap gap-3 text-sm font-semibold">
        <Link to="/hotels/bookings" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 hover:text-primary"><ReceiptText aria-hidden className="size-4" /> My hotel bookings</Link>
        <Link to="/hotels/saved" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 hover:text-primary"><Heart aria-hidden className="size-4" /> Saved hotels</Link>
        <Link to="/hotels/deals" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 hover:text-primary"><Percent aria-hidden className="size-4" /> Deals</Link>
      </nav>

      <section aria-labelledby="trending-heading">
        <h2 id="trending-heading" className="flex items-center gap-2 text-2xl font-extrabold"><TrendingUp aria-hidden className="size-6 text-primary" /> Trending destinations</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trending.map((t, i) => {
            const info = destinations.find((d) => d.cityCode === t.cityCode);
            if (!info) return null;
            return (
              <li key={t.cityCode}>
                <Link to={`/hotels/in/${t.cityCode}`} className="block overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-raised">
                  <span role="img" aria-label={`${info.city} hotels`} className="block h-32 bg-cover bg-center" style={{ backgroundImage: `url("${info.hotels[0]?.image ?? ''}")` }} />
                  <span className="block p-4">
                    <span className="flex items-center justify-between font-extrabold">{info.city} {i === 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"><Flame aria-hidden className="size-3" /> #1</span>}</span>
                    <span className="block text-sm text-muted">{info.hotels.length} stays from {formatINR(info.fromPaise)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="collections-heading">
        <h2 id="collections-heading" className="flex items-center gap-2 text-2xl font-extrabold"><BedDouble aria-hidden className="size-6 text-primary" /> Collections</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COLLECTIONS.map((c) => (
            <li key={c.slug}>
              <Link to={`/hotels/collections/${c.slug}`} className="block h-full rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-raised">
                <span className="block font-extrabold">{c.title}</span>
                <span className="mt-1 block text-sm text-muted">{c.blurb}</span>
                <span className="mt-3 block text-xs font-bold text-primary">{hotelsInCollection(c).length} stays</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {deals.length > 0 && (
        <section aria-labelledby="deals-heading">
          <div className="flex items-end justify-between">
            <h2 id="deals-heading" className="flex items-center gap-2 text-2xl font-extrabold"><Percent aria-hidden className="size-6 text-primary" /> Today’s deals</h2>
            <Link to="/hotels/deals" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">All deals <ArrowRight aria-hidden className="size-4" /></Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((d) => <HotelTile key={`${d.hotel.id}:${d.room.id}`} hotel={d.hotel} badge={`${d.percent}% off`} fromPaise={d.room.pricePerNightPaise} />)}
          </div>
        </section>
      )}
    </div>
  );
}
