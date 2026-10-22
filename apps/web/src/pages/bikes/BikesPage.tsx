import { Button } from '@zproo/ui';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { TravelHero } from '@/components/media/TravelHero';
import { Section, SectionHeader } from '@/features/home/sections/SectionHeader';
import { BikeCard, BikeCardSkeleton } from '@/features/bikes/components/BikeCard';
import { BikeSearchPanel } from '@/features/bikes/components/BikeSearchPanel';
import { CategoryTiles } from '@/features/bikes/components/CategoryTiles';
import { FaqList } from '@/features/bikes/components/FaqList';
import { FeatureCards } from '@/features/bikes/components/FeatureCards';
import { LocationCard } from '@/features/bikes/components/LocationCard';
import { DemoNote, ErrorState } from '@/features/bikes/components/ui';
import { BIKE_FAQS, BIKE_FEATURES, HOW_IT_WORKS } from '@/features/bikes/content';
import { useAllBikes, useLocations } from '@/features/bikes/hooks';
import { bikeLinks } from '@/features/bikes/links';

/** Bikes landing page: search, categories, popular bikes, how it works, hubs and FAQs. */
export default function BikesPage() {
  const fleet = useAllBikes();
  const locations = useLocations();
  const popular = (fleet.data ?? []).filter((b) => b.availability.status !== 'unavailable').slice(0, 4);

  return (
    <div className="bg-background text-foreground">
      <Seo title="Rent a bike" description="Rent scooters, commuter bikes, cruisers and electric bikes by the hour or day with ZPROO GO." />

      <TravelHero
        image="bike"
        eyebrow="ZPROO Bike Rental"
        title="Rent a bike. Ride your way."
        subtitle="Scooters, commuters, cruisers and EVs by the hour or day, from hubs across the city."
        search={
          <div className="rounded-3xl border border-border bg-card p-5 shadow-raised sm:p-8">
            <BikeSearchPanel />
          </div>
        }
      />

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <FeatureCards items={BIKE_FEATURES} />
      </div>

      <Section id="bike-categories-title">
        <SectionHeader id="bike-categories-title" title="Browse by category" subtitle="From gearless scooters to long-distance tourers." action={{ to: bikeLinks.results(), label: 'All bikes' }} />
        {fleet.isError ? (
          <ErrorState title="We couldn't load bikes" message={fleet.error instanceof Error ? fleet.error.message : 'Please try again.'} onRetry={() => void fleet.refetch()} />
        ) : (
          <CategoryTiles bikes={fleet.data ?? []} />
        )}
      </Section>

      <Section id="bike-popular-title" className="pt-0 sm:pt-0">
        <SectionHeader id="bike-popular-title" title="Popular right now" subtitle="Top-rated bikes riders rent most." action={{ to: bikeLinks.results(), label: 'View all bikes' }} />
        {fleet.isPending ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading bikes">
            {Array.from({ length: 4 }, (_, i) => <li key={i}><BikeCardSkeleton /></li>)}
          </ul>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((b) => <li key={b.id} className="flex"><div className="flex w-full"><BikeCard bike={b} /></div></li>)}
          </ul>
        )}
      </Section>

      <Section id="bike-how-title" className="pt-0 sm:pt-0">
        <SectionHeader id="bike-how-title" title="How bike rental works" />
        <FeatureCards items={HOW_IT_WORKS} />
      </Section>

      <Section id="bike-hubs-title" className="pt-0 sm:pt-0">
        <SectionHeader id="bike-hubs-title" title="Pickup hubs" subtitle="Choose your city, then collect and return at any of our hubs." action={{ to: bikeLinks.locations(), label: 'All hubs' }} />
        {locations.isError ? (
          <ErrorState title="We couldn't load pickup hubs" message={locations.error instanceof Error ? locations.error.message : 'Please try again.'} onRetry={() => void locations.refetch()} />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(locations.data ?? []).slice(0, 3).map((l) => <li key={l.id}><LocationCard title="Hub" location={l} /></li>)}
          </ul>
        )}
      </Section>

      <Section id="bike-faq-title" className="pt-0 sm:pt-0">
        <SectionHeader id="bike-faq-title" title="Frequently asked questions" />
        <div className="max-w-3xl"><FaqList items={BIKE_FAQS} /></div>
        <div className="mt-8 max-w-3xl space-y-4">
          <DemoNote />
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to={bikeLinks.results()}>Browse all bikes</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to={bikeLinks.bookings()}>My bike bookings</Link></Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
