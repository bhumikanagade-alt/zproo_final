import { TRAIN_CLASS_LABELS, type TrainClass } from '@zproo/types';
import { ArrowRight, BadgeCheck, Radio, ShieldCheck, TrainFront } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { TravelHero } from '@/components/media/TravelHero';
import { Seo } from '@/components/seo/Seo';
import { TRAIN_ROUTES } from '@/features/home/content';
import { SearchWidgetSkeleton } from '@/features/search/components/SearchWidgetSkeleton';
import { trainRouteUrl } from '@/features/search/url';
import { trainLiveStatusUrl } from '@/features/trains/links';
import { useHydrated } from '@/hooks/useHydrated';
import { useTrainCursor } from '@/features/trains/useTrainCursor';

const SearchWidget = lazy(async () => ({
  default: (await import('@/features/search/components/SearchWidget')).SearchWidget,
}));

const PROMISES = [
  {
    icon: TrainFront,
    title: 'Every class, every quota',
    text: '1A to 2S, General, Tatkal and Ladies quota — with availability by class.',
  },
  {
    icon: BadgeCheck,
    title: 'Honest status',
    text: 'AVL, RAC and waiting list exactly as the railway reports them. No berth promised until it is.',
  },
  {
    icon: ShieldCheck,
    title: 'Refunds handled for you',
    text: 'If the railway cannot book after payment, the full amount comes back automatically.',
  },
];

export default function TrainsPage() {
  useTrainCursor();
  const hydrated = useHydrated();
  return (
    <>
      <Seo
        title="Train tickets"
        description="Search trains between stations, check class-wise availability (AVL, RAC, WL), book with General, Tatkal or Ladies quota and track your PNR in My Bookings."
      />
      <TravelHero
        image="train"
        title="Book train tickets"
        subtitle="Search by station, compare classes and availability, and keep every PNR in one place."
        search={
          hydrated ? (
            <Suspense fallback={<SearchWidgetSkeleton />}>
              <SearchWidget initial="TRAIN" />
            </Suspense>
          ) : (
            <SearchWidgetSkeleton />
          )
        }
      >
        <ul className="grid gap-3 md:grid-cols-3">
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
        aria-labelledby="train-routes"
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="train-routes" className="text-2xl font-extrabold tracking-tight">
              Popular train routes
            </h2>
            <p className="mt-1 text-sm text-muted">Classes commonly run on the route.</p>
          </div>
          <Link
            to={trainLiveStatusUrl()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <Radio aria-hidden className="size-4" /> Live train status
          </Link>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRAIN_ROUTES.map((r) => (
            <li key={`${r.from}-${r.to}`}>
              <Link
                to={trainRouteUrl(r.from, r.to)}
                className="group flex h-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold">{r.label}</span>
                  <span className="block text-xs text-muted">
                    {r.classes
                      .map((c) => TRAIN_CLASS_LABELS[c as TrainClass]?.match(/\((.+)\)/)?.[1] ?? c)
                      .join(' · ')}
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
