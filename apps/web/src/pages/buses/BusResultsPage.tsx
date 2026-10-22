import { findCity } from '@zproo/config';
import {
  addDays,
  busSearchInputFromParams,
  busSearchSchema,
  todayIso,
  type BusSearch,
} from '@zproo/validation';
import {
  Badge,
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogTitle,
  Sheet,
  SheetContent,
  Skeleton,
} from '@zproo/ui';
import { Bus, ChevronLeft, ChevronRight, Pencil, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { useBusSearch } from '@/features/buses/api';
import { BusCard } from '@/features/buses/components/BusCard';
import { BusFiltersPanel } from '@/features/buses/components/BusFiltersPanel';
import {
  activeBusFilterCount,
  applyBusFilters,
  BUS_SORTS,
  busFacets,
  EMPTY_BUS_FILTERS,
  sortBuses,
  type BusFilters,
  type BusSortId,
} from '@/features/buses/filters';
import { busSeatsUrl, busTripUrl } from '@/features/buses/links';
import { DemoBanner } from '@/features/checkout/DemoBanner';
import { AppDiscountBanner, AppDiscountPopup } from '@/components/promotions/AppDiscountPopup';
import { travelDate } from '@/features/flights/format';
import { BusSearchForm } from '@/features/search/forms/BusSearchForm';
import { busesUrl } from '@/features/search/url';

const cityName = (code: string) => findCity(code)?.name ?? code;

export default function BusResultsPage() {
  const [params] = useSearchParams();
  const parsed = useMemo(
    () => busSearchSchema.safeParse(busSearchInputFromParams(params)),
    [params],
  );
  // Remount per search so filters start fresh.
  return parsed.success ? (
    <Results key={params.toString()} search={parsed.data} />
  ) : (
    <InvalidSearch />
  );
}

function InvalidSearch() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Seo title="Bus results" noIndex />
      <h1 className="text-2xl font-extrabold tracking-tight">Search buses</h1>
      <FormAlert>That search isn't complete. Choose where you're travelling from and to.</FormAlert>
      <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-card">
        <BusSearchForm />
      </div>
    </div>
  );
}

function Results({ search }: { search: BusSearch }) {
  const navigate = useNavigate();
  const { data, isPending, error, refetch } = useBusSearch(search);
  const [filters, setFilters] = useState<BusFilters>(EMPTY_BUS_FILTERS);
  const [sort, setSort] = useState<BusSortId>('DEPARTURE');
  const [editing, setEditing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);

  const trips = useMemo(() => data?.trips ?? [], [data]);
  const facets = useMemo(() => busFacets(trips), [trips]);
  const visible = useMemo(
    () => sortBuses(applyBusFilters(trips, filters), sort),
    [trips, filters, sort],
  );
  const from = cityName(search.from);
  const to = cityName(search.to);
  const shiftDate = (days: number) =>
    void navigate(busesUrl({ ...search, date: addDays(search.date, days) }));
  const panel = (
    <BusFiltersPanel
      facets={facets}
      value={filters}
      onChange={setFilters}
      fromCity={from}
      toCity={to}
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Seo title={`Buses: ${from} to ${to}`} noIndex />

      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
            {from} → {to}
          </h1>
          <p className="text-sm text-muted">{travelDate(search.date)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil aria-hidden /> Modify search
        </Button>
      </header>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-4xl">
          <DialogTitle>Modify search</DialogTitle>
          <BusSearchForm initial={search} />
        </DialogContent>
      </Dialog>

      <div className="mt-4"><AppDiscountBanner onOpen={() => setPromoOpen(true)} /></div>
      <AppDiscountPopup autoOpen={false} />
      <section className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="Rewards and promotions">
        {[['Reward points','Earn ZPROO points on eligible bookings.'],['Available discounts','Use ZPROO10 for 10% OFF where eligible.'],['Promotions','Check offers for bus-specific coupon codes.']].map(([title,text]) => <div key={title} className="rounded-2xl border border-border bg-card p-4 shadow-card"><p className="text-sm font-extrabold text-primary">{title}</p><p className="mt-1 text-sm text-muted">{text}</p></div>)}
      </section>
      <Dialog open={promoOpen} onOpenChange={setPromoOpen}><DialogContent><DialogTitle>Save More on App</DialogTitle><p className="mt-2 text-sm text-muted">Use ZPROO10 for 10% OFF on eligible bus bookings.</p><Button className="mt-5" onClick={() => setPromoOpen(false)}>Close</Button></DialogContent></Dialog>

      {data?.demo && (
        <div className="mt-4">
          <DemoBanner service="bus" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-height)+1rem)] max-h-[calc(100vh-var(--header-height)-2rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-card">
            {trips.length > 0 && panel}
          </div>
        </aside>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent aria-describedby={undefined} className="p-5">
            <DialogTitle className="sr-only">Filters</DialogTitle>
            {panel}
            <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
              Show {visible.length} bus{visible.length === 1 ? '' : 'es'}
            </Button>
          </SheetContent>
        </Sheet>

        <section
          aria-labelledby="results-heading"
          aria-busy={isPending}
          className="min-w-0 space-y-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="results-heading"
              className="mr-auto text-sm font-semibold text-muted"
              aria-live="polite"
            >
              {isPending ? 'Searching buses…' : `${visible.length} of ${trips.length} buses`}
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal aria-hidden /> Filters
              {activeBusFilterCount(filters) > 0 && (
                <Badge className="ml-1">{activeBusFilterCount(filters)}</Badge>
              )}
            </Button>
          </div>

          <div
            role="radiogroup"
            aria-label="Sort buses"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {BUS_SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={sort === s.id}
                onClick={() => setSort(s.id)}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                  sort === s.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-foreground/30',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={search.date <= todayIso()}
              onClick={() => shiftDate(-1)}
            >
              <ChevronLeft aria-hidden /> Previous day
            </Button>
            <Button variant="ghost" size="sm" onClick={() => shiftDate(1)}>
              Next day <ChevronRight aria-hidden />
            </Button>
          </div>

          {error ? (
            <div className="space-y-3">
              <FormAlert>{errorMessage(error)}</FormAlert>
              <Button variant="outline" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          ) : isPending ? (
            <ul className="space-y-4" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <li key={i}>
                  <Skeleton className="h-44 rounded-2xl" />
                </li>
              ))}
            </ul>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-light text-primary">
                <Bus aria-hidden className="size-6" />
              </span>
              {trips.length > 0 ? (
                <>
                  <h3 className="mt-4 text-lg font-bold">No buses match these filters</h3>
                  <Button
                    variant="outline"
                    className="mt-5"
                    onClick={() => setFilters(EMPTY_BUS_FILTERS)}
                  >
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="mt-4 text-lg font-bold">No buses on this date</h3>
                  <p className="mt-1 text-sm text-muted">Try another date, or a nearby city.</p>
                  <Button asChild variant="outline" className="mt-5">
                    <Link to="/buses">New search</Link>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-4">
              {visible.map((trip) => (
                <li key={trip.id}>
                  <BusCard
                    trip={trip}
                    seatsHref={busSeatsUrl(trip.id)}
                    detailsHref={busTripUrl(trip.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
