import { Button, cn } from '@zproo/ui';
import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { BikeCard, BikeCardSkeleton } from '@/features/bikes/components/BikeCard';
import { BikeFilterPanel } from '@/features/bikes/components/BikeFilterPanel';
import { ResultsSummaryBar } from '@/features/bikes/components/ResultsSummaryBar';
import { DemoNote, EmptyState, ErrorState, focusRing, inputClass } from '@/features/bikes/components/ui';
import { activeFilterCount, DEFAULT_FILTERS, PRICE_MAX } from '@/features/bikes/filters';
import { useBikes, useLocations } from '@/features/bikes/hooks';
import { bikeLinks } from '@/features/bikes/links';
import { CATEGORIES, CATEGORY_META } from '@/features/bikes/rules';
import { useBikeStore } from '@/features/bikes/store';
import type { BikeCategory, BikeFilters, SortKey, Transmission } from '@/features/bikes/types';
import { sanitizeBikeName } from '@/features/bikes/validation';

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'rating', label: 'Top rated' },
];

/** Filters live in the URL so results survive back/forward navigation and can be shared. */
function useUrlFilters(): [BikeFilters, (patch: Partial<BikeFilters>) => void, () => void] {
  const [params, setParams] = useSearchParams();
  const filters = useMemo<BikeFilters>(() => {
    const cats = (params.get('cat') ?? '').split(',').filter((c): c is BikeCategory => (CATEGORIES as string[]).includes(c));
    const tr = params.get('tr');
    const max = Number(params.get('max'));
    const sort = params.get('sort') as SortKey | null;
    return {
      query: sanitizeBikeName(params.get('q') ?? ''),
      categories: cats,
      transmission: tr === 'manual' || tr === 'automatic' ? (tr as Transmission) : 'any',
      maxDailyPrice: Number.isFinite(max) && max > 0 ? Math.min(max, PRICE_MAX) : PRICE_MAX,
      onlyAvailable: params.get('avail') === '1',
      sort: SORTS.some((s) => s.id === sort) ? (sort as SortKey) : 'recommended',
    };
  }, [params]);

  const update = (patch: Partial<BikeFilters>) => {
    const f = { ...filters, ...patch };
    const next = new URLSearchParams(params);
    const set = (k: string, v: string | null) => (v ? next.set(k, v) : next.delete(k));
    set('q', f.query.trim() || null);
    set('cat', f.categories.join(',') || null);
    set('tr', f.transmission === 'any' ? null : f.transmission);
    set('max', f.maxDailyPrice >= PRICE_MAX ? null : String(f.maxDailyPrice));
    set('avail', f.onlyAvailable ? '1' : null);
    set('sort', f.sort === 'recommended' ? null : f.sort);
    setParams(next, { replace: true });
  };
  const reset = () => update({ ...DEFAULT_FILTERS, sort: filters.sort });
  return [filters, update, reset];
}

export default function BikeResultsPage() {
  const [filters, updateFilters, resetFilters] = useUrlFilters();
  const [params] = useSearchParams();
  const { schedule, patchSchedule, ensureFreshSchedule } = useBikeStore();
  const locationsQuery = useLocations();
  const locations = locationsQuery.data ?? [];
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Search box: typed locally, pushed to the URL (and the API query) once typing pauses.
  const [qInput, setQInput] = useState(filters.query);
  const qDebounced = useDebouncedValue(qInput, 300);
  useEffect(() => {
    if (qDebounced.trim() !== filters.query.trim()) updateFilters({ query: qDebounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced]);

  // Replace a stale (past) persisted schedule, and pre-fill the pickup from the home widget (?pickup=).
  useEffect(() => {
    ensureFreshSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const wanted = params.get('pickup')?.trim().toLowerCase();
    if (!wanted || locations.length === 0) return;
    // The home widget sends free text: match a hub's name/area first, then a city name.
    const hub = locations.find((l) => `${l.name} ${l.area}`.toLowerCase().includes(wanted) || wanted.includes(l.area.toLowerCase()));
    const city = hub?.city ?? locations.find((l) => l.city.toLowerCase() === wanted || wanted.includes(l.city.toLowerCase()))?.city;
    if (city) patchSchedule({ pickupCity: city, pickupLocationId: '', returnLocationId: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations.length]);

  const query = useBikes({ ...filters, pickupCity: schedule.pickupCity || undefined } as BikeFilters);
  const bikes = query.data ?? [];
  const activeCount = activeFilterCount(filters);
  const pickupName = schedule.pickupCity || undefined;

  const clearAll = () => {
    setQInput('');
    resetFilters();
  };

  return (
    <div className="bg-background pb-16">
      <Seo title="Bikes for rent" description="Compare scooters, commuter bikes, cruisers and electric bikes. Filter by category, price and transmission." />

      <div className="mx-auto max-w-[1200px] space-y-5 px-4 pt-6">
        <div>
          <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
            <Link to={bikeLinks.home()} className="hover:text-foreground">Bikes</Link> <span aria-hidden>/</span>{' '}
            <span aria-current="page" className="text-foreground">Search results</span>
          </nav>
          <h1 className="text-[28px] font-bold leading-9">Bikes for rent</h1>
        </div>

        <ResultsSummaryBar
          schedule={schedule}
          locations={locations}
          locationsFailed={locationsQuery.isError}
          onRetryLocations={() => void locationsQuery.refetch()}
          onChange={patchSchedule}
          query={qInput}
          onQueryChange={setQInput}
        />

        <DemoNote />

        <div id="bike-results" className="scroll-mt-24 lg:grid lg:grid-cols-[280px_1fr] lg:items-start lg:gap-6">
          <aside aria-label="Filters" className="mb-4 lg:mb-0">
            <Button variant="outline" className="w-full lg:hidden" aria-expanded={filtersOpen} aria-controls="bike-filters" onClick={() => setFiltersOpen((o) => !o)}>
              <SlidersHorizontal aria-hidden /> Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>
            <div id="bike-filters" className={cn('mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-24 lg:mt-0 lg:block', filtersOpen ? 'block' : 'hidden')}>
              <BikeFilterPanel filters={filters} onChange={updateFilters} onReset={() => resetFilters()} activeCount={activeCount} />
            </div>
          </aside>

          <section aria-labelledby="results-h" aria-busy={query.isFetching}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="results-h" className="text-lg font-bold">
                {query.isPending ? 'Finding bikes…' : `${bikes.length} ${bikes.length === 1 ? 'bike' : 'bikes'} found`}
                {pickupName && !query.isPending && <span className="text-sm font-medium text-muted"> at {pickupName}</span>}
              </h2>
              <div className="flex items-center gap-2">
                <label htmlFor="bike-sort" className="text-sm text-muted">Sort by</label>
                <select id="bike-sort" value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value as SortKey })} className={cn(inputClass(), 'h-10 w-auto')}>
                  {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {activeCount > 0 && (
              <ul className="mb-4 flex flex-wrap gap-2" aria-label="Active filters">
                {filters.categories.map((c) => (
                  <li key={c}><Chip label={CATEGORY_META[c].label} onRemove={() => updateFilters({ categories: filters.categories.filter((x) => x !== c) })} /></li>
                ))}
                {filters.transmission !== 'any' && <li><Chip label={filters.transmission === 'manual' ? 'Manual' : 'Automatic'} onRemove={() => updateFilters({ transmission: 'any' })} /></li>}
                {filters.maxDailyPrice < PRICE_MAX && <li><Chip label={`Up to ₹${filters.maxDailyPrice.toLocaleString('en-IN')}/day`} onRemove={() => updateFilters({ maxDailyPrice: PRICE_MAX })} /></li>}
                {filters.onlyAvailable && <li><Chip label="Available only" onRemove={() => updateFilters({ onlyAvailable: false })} /></li>}
              </ul>
            )}

            {query.isPending ? (
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading bikes">
                {Array.from({ length: 6 }, (_, i) => <li key={i}><BikeCardSkeleton /></li>)}
              </ul>
            ) : query.isError ? (
              <ErrorState title="We couldn't load bikes" message={query.error instanceof Error ? query.error.message : 'Please try again.'} onRetry={() => void query.refetch()} />
            ) : bikes.length === 0 ? (
              <EmptyState
                title="No bikes match your search"
                message={`We couldn't find any bikes${filters.query ? ` for “${filters.query.trim()}”` : ''} with these filters${pickupName ? ` at ${pickupName}` : ''}. Try a different name, clear some filters or pick another pickup city.`}
                action={<Button onClick={clearAll}>Clear search and filters</Button>}
              />
            ) : (
              <ul className={cn('grid gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3', query.isFetching && 'opacity-60')}>
                {bikes.map((b) => <li key={b.id} className="flex"><div className="flex w-full"><BikeCard bike={b} /></div></li>)}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-light py-1 pl-3 pr-1 text-xs font-semibold text-primary">
      {label}
      <button type="button" aria-label={`Remove filter ${label}`} onClick={onRemove} className={cn('grid size-5 place-items-center rounded-full hover:bg-primary/10', focusRing)}>
        <X aria-hidden className="size-3" />
      </button>
    </span>
  );
}
