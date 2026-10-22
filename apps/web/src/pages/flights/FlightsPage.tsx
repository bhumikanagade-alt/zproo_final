import { BadgeIndianRupee, Clock, ShieldCheck } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { TravelHero } from '@/components/media/TravelHero';
import { Seo } from '@/components/seo/Seo';
import { FlightDeals } from '@/features/home/sections/FlightDeals';
import { SearchWidgetSkeleton } from '@/features/search/components/SearchWidgetSkeleton';
import { useHydrated } from '@/hooks/useHydrated';

const SearchWidget = lazy(async () => ({
  default: (await import('@/features/search/components/SearchWidget')).SearchWidget,
}));

const PROMISES = [
  {
    icon: BadgeIndianRupee,
    title: 'All-inclusive fares',
    text: 'Taxes shown up front. No convenience fee.',
  },
  {
    icon: Clock,
    title: 'Seats held while you pay',
    text: 'Your seats are held for you while you complete payment.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure payments',
    text: 'Payments verified on our servers before we confirm.',
  },
];

export default function FlightsPage() {
  const hydrated = useHydrated();
  return (
    <>
      <Seo
        title="Flights"
        description="Search and book one-way, round-trip and multi-city flights with all-inclusive fares."
      />
      <TravelHero
        image="flight"
        title="Book flights"
        subtitle="One way, round trip or multi-city — compare fares in seconds."
        search={
          hydrated ? (
            <Suspense fallback={<SearchWidgetSkeleton />}>
              <SearchWidget initial="FLIGHT" />
            </Suspense>
          ) : (
            <SearchWidgetSkeleton />
          )
        }
      >
        <ul className="grid gap-3 sm:grid-cols-3">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
                <Icon aria-hidden className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-bold">{title}</span>
                <span className="block text-sm text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </TravelHero>
      <FlightDeals />
    </>
  );
}
