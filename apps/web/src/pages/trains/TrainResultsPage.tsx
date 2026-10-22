import { findStation } from '@zproo/config';
import {
  addDays,
  todayIso,
  trainSearchInputFromParams,
  trainSearchSchema,
  type TrainSearch,
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
import { ChevronLeft, ChevronRight, Pencil, SlidersHorizontal, TrainFront } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { DemoBanner } from '@/features/checkout/DemoBanner';
import { travelDate } from '@/features/flights/format';
import { TrainSearchForm } from '@/features/search/forms/TrainSearchForm';
import { trainsUrl } from '@/features/search/url';
import { useTrainSearch } from '@/features/trains/api';
import { TrainCard } from '@/features/trains/components/TrainCard';
import { TrainFiltersPanel } from '@/features/trains/components/TrainFiltersPanel';
import {
  activeTrainFilterCount,
  applyTrainFilters,
  EMPTY_TRAIN_FILTERS,
  sortTrains,
  TRAIN_SORTS,
  trainFacets,
  visibleClasses,
  type TrainFilters,
  type TrainSortId,
} from '@/features/trains/filters';
import { classLabel, quotaLabel } from '@/features/trains/format';
import { useTrainCursor } from '@/features/trains/useTrainCursor';

const stationName = (code: string) => findStation(code)?.name ?? code;

export default function TrainResultsPage() {
  useTrainCursor();
  const [params] = useSearchParams();
  const parsed = useMemo(
    () => trainSearchSchema.safeParse(trainSearchInputFromParams(params)),
    [params],
  );
  // Remount per search so filters start fresh.
  return parsed.success ? (
    <Results key={params.toString()} search={parsed.data} />
  ) : (
    <InvalidSearch message={parsed.error.issues[0]?.message} />
  );
}

function InvalidSearch({ message }: { message?: string | undefined }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Seo title="Train results" noIndex />
      <h1 className="text-2xl font-extrabold tracking-tight">Search trains</h1>
      <FormAlert>
        That search isn't complete{message ? ` — ${message.toLowerCase()}` : ''}. Choose the
        stations you're travelling between.
      </FormAlert>
      <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-card">
        <TrainSearchForm />
      </div>
    </div>
  );
}

function Results({ search }: { search: TrainSearch }) {
  const navigate = useNavigate();
  const { data, isPending, error, refetch, isFetching } = useTrainSearch(search);
  const [filters, setFilters] = useState<TrainFilters>(EMPTY_TRAIN_FILTERS);
  const [sort, setSort] = useState<TrainSortId>('DEPARTURE');
  const [editing, setEditing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const trains = useMemo(() => data?.trains ?? [], [data]);
  const facets = useMemo(() => trainFacets(trains), [trains]);
  const visible = useMemo(
    () => sortTrains(applyTrainFilters(trains, filters), sort, filters),
    [trains, filters, sort],
  );
  const from = stationName(search.from);
  const to = stationName(search.to);
  const shiftDate = (days: number) =>
    void navigate(trainsUrl({ ...search, date: addDays(search.date, days) }));
  const panel = (
    <TrainFiltersPanel
      facets={facets}
      value={filters}
      onChange={setFilters}
      fromName={from}
      toName={to}
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Seo title={`Trains: ${from} to ${to}`} noIndex />

      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="min-w-0">
          <h1 className="text-base font-extrabold leading-snug tracking-tight sm:truncate sm:text-xl">
            {from} ({search.from}) → {to} ({search.to})
          </h1>
          <p className="text-sm text-muted">
            {travelDate(search.date)} ·{' '}
            {search.travelClass === 'ALL' ? 'All classes' : classLabel(search.travelClass)} ·{' '}
            {quotaLabel(search.quota)} quota · {search.passengers} passenger
            {search.passengers === 1 ? '' : 's'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setEditing(true)}>
          <Pencil aria-hidden /> Modify search
        </Button>
      </header>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto">
          <DialogTitle>Modify search</DialogTitle>
          <TrainSearchForm initial={search} />
        </DialogContent>
      </Dialog>

      {data?.demo && (
        <div className="mt-4">
          <DemoBanner service="train" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-height)+1rem)] max-h-[calc(100vh-var(--header-height)-2rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-card">
            {trains.length > 0 && panel}
          </div>
        </aside>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent aria-describedby={undefined} className="p-5">
            <DialogTitle className="sr-only">Filters</DialogTitle>
            {panel}
            <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
              Show {visible.length} train{visible.length === 1 ? '' : 's'}
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
              {isPending ? 'Searching trains…' : `${visible.length} of ${trains.length} trains`}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching && !isPending ? 'Refreshing…' : 'Refresh availability'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal aria-hidden /> Filters
              {activeTrainFilterCount(filters) > 0 && (
                <Badge className="ml-1">{activeTrainFilterCount(filters)}</Badge>
              )}
            </Button>
          </div>

          <div
            role="radiogroup"
            aria-label="Sort trains"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {TRAIN_SORTS.map((s) => (
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
              {[0, 1, 2].map((i) => (
                <li key={i}>
                  <Skeleton className="h-56 rounded-2xl" />
                </li>
              ))}
            </ul>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-light text-primary">
                <TrainFront aria-hidden className="size-6" />
              </span>
              {trains.length > 0 ? (
                <>
                  <h3 className="mt-4 text-lg font-bold">No trains match these filters</h3>
                  <Button
                    variant="outline"
                    className="mt-5"
                    onClick={() => setFilters(EMPTY_TRAIN_FILTERS)}
                  >
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="mt-4 text-lg font-bold">No trains on this date</h3>
                  <p className="mt-1 text-sm text-muted">
                    No direct train runs between these stations on {travelDate(search.date)}. Try
                    another date or a nearby station.
                  </p>
                  <Button asChild variant="outline" className="mt-5">
                    <Link to="/trains">New search</Link>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-4">
              {visible.map((train) => (
                <li key={train.id}>
                  <TrainCard
                    train={train}
                    quota={search.quota}
                    passengers={search.passengers}
                    classes={visibleClasses(train, filters)}
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
