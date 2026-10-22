import { Button } from '@zproo/ui';
import { BellRing, Heart, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { HotelTile } from '@/features/hotels/components/HotelTile';
import { findHotel, formatINR } from '@/features/hotels/data';
import { priceDropPaise, useSavedSearches } from '@/features/hotels/savedSearches';
import { useWishlist } from '@/features/hotels/wishlist';

/** Wishlist (saved hotels) and price-alert searches for the signed-in user. */
export default function SavedHotelsPage() {
  const { ids } = useWishlist();
  const hotels = ids.map((id) => findHotel(id)).filter((h) => h !== undefined);
  const searches = useSavedSearches((s) => s.items);
  const removeSearch = useSavedSearches((s) => s.remove);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <Seo title="Saved hotels" noIndex />
      <section aria-labelledby="saved-heading">
        <h1 id="saved-heading" className="flex items-center gap-2 text-2xl font-extrabold sm:text-3xl"><Heart aria-hidden className="size-6 text-red-500" /> Saved hotels</h1>
        {hotels.length === 0 ? (
          <div role="status" className="mt-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-lg font-extrabold">No saved hotels yet</p>
            <p className="mt-1 text-sm text-muted">Tap the heart on any hotel to keep it here.</p>
            <Button asChild className="mt-4"><Link to="/hotels">Find a hotel</Link></Button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hotels.map((h) => <HotelTile key={h.id} hotel={h} />)}
          </div>
        )}
      </section>

      <section aria-labelledby="alerts-heading">
        <h2 id="alerts-heading" className="flex items-center gap-2 text-xl font-extrabold"><BellRing aria-hidden className="size-5" /> Price alerts</h2>
        {searches.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Use “Alert me when prices drop” on a results page and your searches show up here.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {searches.map((s) => {
              const drop = priceDropPaise(s);
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                  <div>
                    <Link to={`/hotels/results?${s.query}`} className="font-extrabold text-primary hover:underline">{s.label}</Link>
                    <p className="text-sm text-muted">
                      Set at {formatINR(s.basePaise)} a night · now {formatINR(s.lastPaise)}
                      {drop > 0 ? <strong className="ml-2 text-green-800">Dropped by {formatINR(drop)}</strong> : drop < 0 ? <span className="ml-2">Up by {formatINR(-drop)}</span> : null}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSearch(s.id)} aria-label={`Remove alert ${s.label}`}><Trash2 aria-hidden /> Remove</Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
