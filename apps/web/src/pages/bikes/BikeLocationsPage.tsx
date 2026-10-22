import { Button, Skeleton } from '@zproo/ui';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { LocationCard } from '@/features/bikes/components/LocationCard';
import { DemoNote, ErrorState } from '@/features/bikes/components/ui';
import { useAllBikes, useLocations } from '@/features/bikes/hooks';
import { bikeLinks } from '@/features/bikes/links';
import { REQUIRED_DOCUMENTS } from '@/features/bikes/rules';

/** All pickup / return hubs, with how many bikes each stocks and the documents to carry. */
export default function BikeLocationsPage() {
  const locations = useLocations();
  const fleet = useAllBikes();
  const stocked = (id: string) => (fleet.data ?? []).filter((b) => b.availability.locationIds.includes(id)).length;

  return (
    <div className="bg-background pb-16">
      <Seo title="Bike pickup hubs" description="Pickup and return hubs for ZPROO GO bike rentals, with addresses, opening hours and contact numbers." />
      <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6">
        <div>
          <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
            <Link to={bikeLinks.home()} className="hover:text-foreground">Bikes</Link> <span aria-hidden>/</span>{' '}
            <span aria-current="page" className="text-foreground">Pickup hubs</span>
          </nav>
          <h1 className="text-[28px] font-bold leading-9">Pickup &amp; return hubs</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Pick a city, then collect your bike at any hub in it and return it to the same hub, or to another hub in that city for a small one-way fee.</p>
        </div>

        {locations.isPending ? (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading hubs">
            {Array.from({ length: 6 }, (_, i) => <li key={i}><Skeleton className="h-52 w-full" /></li>)}
          </ul>
        ) : locations.isError ? (
          <ErrorState title="We couldn't load pickup hubs" message={locations.error instanceof Error ? locations.error.message : 'Please try again.'} onRetry={() => void locations.refetch()} backTo={{ to: bikeLinks.home(), label: 'Back to bikes' }} />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.data.map((l) => (
              <li key={l.id} className="flex flex-col gap-2">
                <LocationCard title={`${l.city} · ${l.area}`} location={l} />
                <p className="px-1 text-xs text-muted">{fleet.data ? `${stocked(l.id)} bike models stocked` : 'Checking stock…'}</p>
              </li>
            ))}
          </ul>
        )}

        <section aria-labelledby="hub-docs-h" className="rounded-2xl border border-border bg-card p-5">
          <h2 id="hub-docs-h" className="font-bold">Bring these to the hub</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            {REQUIRED_DOCUMENTS.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </section>

        <DemoNote />
        <Button asChild size="lg"><Link to={bikeLinks.results()}>Find a bike</Link></Button>
      </div>
    </div>
  );
}
