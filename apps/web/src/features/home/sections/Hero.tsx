import { BRAND } from '@zproo/config';
import { ArrowDown } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router';
import { TravelImage } from '@/components/media/TravelImage';
import { serviceFromSlug } from '@/config/services';
import { SearchWidgetSkeleton } from '@/features/search/components/SearchWidgetSkeleton';
import { useHydrated } from '@/hooks/useHydrated';

// The widget (forms + validation) loads right after first paint so the headline appears
// without waiting for it; the skeleton reserves the same space to avoid layout shift.
const SearchWidget = lazy(async () => ({
  default: (await import('@/features/search/components/SearchWidget')).SearchWidget,
}));

export function Hero() {
  // Prerendered HTML ships the skeleton; the lazy widget mounts once the page is live.
  const hydrated = useHydrated();
  // The navbar picks the service (`/?service=bus`); the home page shows that service's search bar.
  const [params] = useSearchParams();
  const service = serviceFromSlug(params.get('service'));
  return (
    <section aria-labelledby="hero-title" className="relative isolate">
      <div className="absolute inset-x-0 top-0 -z-10 h-[23rem] overflow-hidden sm:h-[26rem] lg:h-[31rem]">
        <TravelImage id="hero/home" sizes="100vw" priority alt="" className="scale-105" />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
        />
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-10 text-white sm:px-6 sm:pt-14 lg:px-8 lg:pb-10 lg:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80 sm:text-sm sm:tracking-[0.2em]">
          {BRAND.description}
        </p>
        <h1
          id="hero-title"
          className="mt-3 max-w-3xl text-[2.1rem] font-extrabold leading-[1.08] tracking-tight drop-shadow-sm sm:text-5xl lg:text-6xl"
        >
          Travel Smarter.
          <br />
          Go Further with {BRAND.name}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-white/90 sm:text-lg">
          Flights, Buses, Trains, Hotels, Cabs, Bikes, Holidays & Parcels — All in
          One App.
        </p>
        <a
          href="#search"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Start Your Journey <ArrowDown aria-hidden className="size-4" />
        </a>
      </div>
      <div id="search" className="mx-auto max-w-7xl scroll-mt-28 px-4 sm:px-6 lg:px-8">
        <h2 className="sr-only">Search and book</h2>
        {hydrated ? (
          <Suspense fallback={<SearchWidgetSkeleton />}>
            <SearchWidget service={service} />
          </Suspense>
        ) : (
          <SearchWidgetSkeleton />
        )}
      </div>
    </section>
  );
}
