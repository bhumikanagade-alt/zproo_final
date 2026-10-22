import { formatMoney } from '@zproo/utils';
import { Armchair, ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { TravelHero } from '@/components/media/TravelHero';
import { Seo } from '@/components/seo/Seo';
import { BUS_ROUTES } from '@/features/home/content';
import { SearchWidgetSkeleton } from '@/features/search/components/SearchWidgetSkeleton';
import { busRouteUrl } from '@/features/search/url';
import { useHydrated } from '@/hooks/useHydrated';

const SearchWidget = lazy(async () => ({
  default: (await import('@/features/search/components/SearchWidget')).SearchWidget,
}));

const PROMISES = [
  {
    icon: Armchair,
    title: 'Pick your exact seat',
    text: 'Live seat maps for sleepers and seaters, both decks.',
  },
  {
    icon: MapPin,
    title: 'Your boarding point',
    text: 'Swargate, Dadar, Wakad, Vashi… choose where you get on and off.',
  },
  {
    icon: ShieldCheck,
    title: 'Clear cancellation',
    text: 'Refund rules shown before you pay, printed on your ticket.',
  },
];

export default function BusesPage() {
  const hydrated = useHydrated();
  return (
    <>
      <Seo
        title="Bus tickets"
        description="Book A/C sleeper, Volvo, seater and electric buses across Maharashtra and India — Pune, Mumbai, Nashik, Kolhapur, Nagpur, Goa and more."
      />
      <TravelHero
        image="bus"
        title="Book bus tickets"
        subtitle="Sleeper, seater and electric buses across Maharashtra and beyond — choose your seat."
        search={
          hydrated ? (
            <Suspense fallback={<SearchWidgetSkeleton />}>
              <SearchWidget initial="BUS" />
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

      <section
        aria-labelledby="bus-routes"
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        <h2 id="bus-routes" className="text-2xl font-extrabold tracking-tight">
          Popular bus routes
        </h2>
        <p className="mt-1 text-sm text-muted">Indicative lowest fares per seat.</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BUS_ROUTES.map((r) => (
            <li key={`${r.from}-${r.to}`}>
              <Link
                to={busRouteUrl(r.from, r.to)}
                className="group flex h-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold">{r.label}</span>
                  <span className="block text-xs text-muted">
                    from {formatMoney(r.farePaise)} · {r.duration}
                  </span>
                </span>
                <ArrowRight aria-hidden className="size-4 shrink-0 text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
