import { Navigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { HotelTile } from '@/features/hotels/components/HotelTile';
import { COLLECTIONS, findCollection, hotelsInCollection } from '@/features/hotels/extras';
import { Link } from 'react-router';

/** A themed list: beach resorts, budget stays, luxury, pet friendly, family stays. */
export default function CollectionPage() {
  const { slug = '' } = useParams();
  const collection = findCollection(slug);
  if (!collection) return <Navigate to="/hotels" replace />;
  const hotels = hotelsInCollection(collection);
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <Seo title={collection.title} noIndex />
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Collection</p>
        <h1 className="mt-1 text-3xl font-extrabold">{collection.title}</h1>
        <p className="mt-2 text-muted">{collection.blurb}</p>
      </header>
      <nav aria-label="Collections" className="flex flex-wrap gap-2">
        {COLLECTIONS.map((c) => (
          <Link key={c.slug} to={`/hotels/collections/${c.slug}`} aria-current={c.slug === slug ? 'page' : undefined} className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${c.slug === slug ? 'bg-primary text-primary-foreground ring-primary' : 'bg-card ring-border'}`}>{c.title}</Link>
        ))}
      </nav>
      {hotels.length === 0 ? (
        <p role="status" className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted">No hotels in this collection yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((h) => <HotelTile key={h.id} hotel={h} />)}
        </div>
      )}
    </div>
  );
}
