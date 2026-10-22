import { findAirport } from '@zproo/config';
import { CABIN_CLASS_LABELS, type FlightOffer } from '@zproo/types';
import { flightSearchSchema, type FlightSearch } from '@zproo/validation';
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
import { Pencil, PlaneTakeoff, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { useFlightSearch } from '@/features/flights/api';
import { DemoBanner } from '@/features/checkout/DemoBanner';
import { DatePriceStrip } from '@/features/flights/components/DatePriceStrip';
import { FareOptionsDialog } from '@/features/flights/components/FareOptionsDialog';
import { FiltersPanel } from '@/features/flights/components/FiltersPanel';
import { FlightCard } from '@/features/flights/components/FlightCard';
import { SelectedFaresBar } from '@/features/flights/components/SelectedFaresBar';
import { baggagePreferenceSummary } from '@/features/flights/baggage';
import { useFareSelection, type SelectedFare } from '@/features/flights/fareSelection';
import { fareOptionFor, fareOptionsFor, type FareOption } from '@/features/flights/fares';
import { useFlightDraft } from '@/features/flights/draft';
import { legDateBounds, legSpecs, withLegDate } from '@/features/flights/searchDates';
import {
  activeFilterCount,
  applyFilters,
  baselineFilters,
  EMPTY_FILTERS,
  facets as buildFacets,
  SORTS,
  sortOffers,
  type FlightFilters,
  type SortId,
} from '@/features/flights/filters';
import { inr, travelDate, travellersLabel } from '@/features/flights/format';
import { FlightSearchForm } from '@/features/search/forms/FlightSearchForm';
import { flightsUrl } from '@/features/search/url';
import { flightSearchInputFromParams as parseFlightSearch } from '@zproo/validation';

const cityOf = (code: string) => findAirport(code)?.city ?? code;

export default function FlightResultsPage() {
  const [params] = useSearchParams();
  const parsed = useMemo(() => flightSearchSchema.safeParse(parseFlightSearch(params)), [params]);
  const search = parsed.success ? parsed.data : null;
  // Remount per search so selections and filters start fresh.
  return search ? <Results key={params.toString()} search={search} /> : <InvalidSearch />;
}

function InvalidSearch() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Seo title="Flight results" noIndex />
      <h1 className="text-2xl font-extrabold tracking-tight">Search flights</h1>
      <FormAlert>
        That search isn't complete. Choose your cities and dates to see flights.
      </FormAlert>
      <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-card">
        <FlightSearchForm />
      </div>
    </div>
  );
}

const TRIP_LABELS = { ONE_WAY: 'One Way', ROUND_TRIP: 'Round Trip', MULTI_CITY: 'Multi City' } as const;

function Results({ search }: { search: FlightSearch }) {
  const navigate = useNavigate();
  const searchUrl = flightsUrl(search);
  const { data, isPending, error, refetch } = useFlightSearch(search);
  const saved = useFareSelection((s) => (s.selection?.searchUrl === searchUrl ? s.selection : null));
  const saveFare = useFareSelection((s) => s.select);
  const startDraft = useFlightDraft((s) => s.start);
  const [legIndex, setLegIndex] = useState(0);
  const [filters, setFilters] = useState<(FlightFilters | undefined)[]>([]);
  const [sort, setSort] = useState<SortId>('BEST');
  const [editing, setEditing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fareOffer, setFareOffer] = useState<FlightOffer | null>(null);

  const pax = { adults: search.adults, children: search.children, infants: search.infants };
  const specs = legSpecs(search);
  const legs = data?.legs ?? [];
  const leg = legs[legIndex];
  const spec = specs[legIndex] ?? specs[0];
  const facets = useMemo(() => buildFacets(leg?.offers ?? []), [leg]);
  // Baggage chosen in the search is the starting point of the baggage filters.
  const baseline = useMemo(
    () => baselineFilters(facets, { cabinBagKg: search.cabinBagKg, checkedBagKg: search.checkedBagKg }),
    [facets, search.cabinBagKg, search.checkedBagKg],
  );
  const legFilters = filters[legIndex] ?? baseline;
  const visible = useMemo(
    () => sortOffers(applyFilters(leg?.offers ?? [], legFilters), sort),
    [leg, legFilters, sort],
  );
  const multiLeg = specs.length > 1;
  const chosenCount = Object.keys(saved?.selected ?? {}).length;
  const selectedForLeg = saved?.selected[String(legIndex)];
  const fares = useMemo(
    () => (fareOffer ? fareOptionsFor(fareOffer, leg?.offers ?? []) : []),
    [fareOffer, leg],
  );

  const setLegFilters = (next: FlightFilters) =>
    setFilters((all) => {
      const copy = [...all];
      copy[legIndex] = next;
      return copy;
    });

  /** Saves the chosen fare and stops: nothing after "Select Fare" is part of this flow. */
  const selectFare = (offer: FlightOffer, fare: FareOption) => {
    if (!spec) return;
    const choice: SelectedFare = { legIndex, route: spec, offer, fare };
    saveFare(
      {
        searchUrl,
        tripType: search.tripType,
        returnDate: search.returnDate,
        pax,
        cabin: search.cabin,
        cabinBagKg: search.cabinBagKg,
        checkedBagKg: search.checkedBagKg,
      },
      choice,
    );
    setFareOffer(null);
    if (multiLeg) {
      const pending = specs.findIndex((_, i) => i !== legIndex && !saved?.selected[String(i)]);
      if (pending !== -1) {
        setLegIndex(pending);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  /** Starts the booking for the chosen flight(s) and opens the traveller details. */
  const proceed = (chosen: SelectedFare[]) => {
    startDraft({
      offerIds: chosen.map((c) => c.fare.offerId),
      pax,
      expectedTotalPaise: chosen.reduce((sum, c) => sum + c.fare.pricePaise, 0),
      searchUrl,
    });
    void navigate('/flights/booking');
  };

  /**
   * Book: one way goes straight to the traveller details. For a round trip or multi-city the
   * flight is saved for this leg, the next leg is shown, and the details open after the last one.
   */
  const book = (offer: FlightOffer, fare: FareOption = fareOptionFor(offer)) => {
    if (!spec) return;
    const choice: SelectedFare = { legIndex, route: spec, offer, fare };
    if (!multiLeg) return proceed([choice]);
    saveFare(
      {
        searchUrl,
        tripType: search.tripType,
        returnDate: search.returnDate,
        pax,
        cabin: search.cabin,
        cabinBagKg: search.cabinBagKg,
        checkedBagKg: search.checkedBagKg,
      },
      choice,
    );
    const all = useFareSelection.getState().selection?.selected ?? {};
    const pending = specs.findIndex((_, i) => !all[String(i)]);
    if (pending === -1) {
      proceed(specs.map((_, i) => all[String(i)] as SelectedFare));
    } else {
      setLegIndex(pending);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const first = search.legs[0];
  const last = search.legs.at(-1);
  const title =
    search.tripType === 'MULTI_CITY'
      ? search.legs
          .map((l) => l.from)
          .concat(last?.to ?? '')
          .join(' → ')
      : `${cityOf(first?.from ?? '')} ${search.tripType === 'ROUND_TRIP' ? '⇄' : '→'} ${cityOf(first?.to ?? '')}`;
  const baggage = baggagePreferenceSummary(search.cabinBagKg, search.checkedBagKg);
  const bounds = legDateBounds(search, legIndex);

  const filterButton = (
    <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
      <SlidersHorizontal aria-hidden /> Filters
      {activeFilterCount(legFilters) > 0 && (
        <Badge className="ml-1">{activeFilterCount(legFilters)}</Badge>
      )}
    </Button>
  );

  return (
    <div className={cn('mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8', chosenCount > 0 && 'pb-32')}>
      <Seo title={`Flights: ${title}`} noIndex />

      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            {TRIP_LABELS[search.tripType]}
          </p>
          <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">{title}</h1>
          <p className="text-sm text-muted">
            {search.tripType === 'MULTI_CITY'
              ? search.legs.map((l) => travelDate(l.date)).join(' · ')
              : `${travelDate(first?.date ?? '')}${search.returnDate ? ` – ${travelDate(search.returnDate)}` : ''}`}
          </p>
          <p className="text-sm text-muted">
            {travellersLabel(pax)} · {CABIN_CLASS_LABELS[search.cabin]}
            {baggage ? ` · ${baggage}` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil aria-hidden /> Modify search
        </Button>
      </header>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogTitle>Modify search</DialogTitle>
          <FlightSearchForm initial={search} />
        </DialogContent>
      </Dialog>

      {data?.demo && (
        <div className="mt-4">
          <DemoBanner />
        </div>
      )}

      {multiLeg && (
        <div
          role="tablist"
          aria-label="Flights in this trip"
          className="mt-4 flex gap-2 overflow-x-auto pb-1"
        >
          {specs.map((l, i) => {
            const chosen = saved?.selected[String(i)];
            return (
              <button
                key={`${l.from}-${l.to}-${i}`}
                role="tab"
                type="button"
                aria-selected={i === legIndex}
                onClick={() => setLegIndex(i)}
                className={cn(
                  'min-w-[11rem] shrink-0 rounded-2xl border px-4 py-3 text-left transition-colors',
                  i === legIndex
                    ? 'border-primary bg-primary-light'
                    : 'border-border bg-card hover:border-foreground/30',
                )}
              >
                <span className="block text-xs font-semibold text-muted">
                  {search.tripType === 'ROUND_TRIP'
                    ? i === 0
                      ? 'Departure'
                      : 'Return'
                    : `Flight ${i + 1}`}{' '}
                  · {travelDate(l.date)}
                </span>
                <span className="block font-bold">
                  {l.from} → {l.to}
                </span>
                <span className="block text-xs text-muted">
                  {chosen
                    ? `${chosen.offer.flightNumber} · ${chosen.fare.name} · ${inr(chosen.fare.pricePaise)}`
                    : 'Not selected'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {spec && (
        <div className="mt-4">
          <DatePriceStrip
            key={`${legIndex}-${spec.from}-${spec.to}`}
            from={spec.from}
            to={spec.to}
            date={spec.date}
            min={bounds.min}
            max={bounds.max}
            pax={pax}
            cabin={search.cabin}
            onSelect={(date) => {
              if (date !== spec.date) void navigate(flightsUrl(withLegDate(search, legIndex, date)));
            }}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-height)+1rem)] max-h-[calc(100vh-var(--header-height)-2rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-card">
            {leg && (
              <FiltersPanel
                facets={facets}
                value={legFilters}
                onChange={setLegFilters}
                fromCity={cityOf(leg.from)}
                toCity={cityOf(leg.to)}
              />
            )}
          </div>
        </aside>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent aria-describedby={undefined} className="p-5">
            <DialogTitle className="sr-only">Filters</DialogTitle>
            {leg && (
              <FiltersPanel
                facets={facets}
                value={legFilters}
                onChange={setLegFilters}
                fromCity={cityOf(leg.from)}
                toCity={cityOf(leg.to)}
              />
            )}
            <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
              Show {visible.length} flight{visible.length === 1 ? '' : 's'}
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
              {isPending
                ? 'Searching flights…'
                : leg
                  ? `${visible.length} of ${leg.offers.length} flights · ${cityOf(leg.from)} to ${cityOf(leg.to)}`
                  : ''}
            </h2>
            {filterButton}
          </div>

          <div
            role="radiogroup"
            aria-label="Sort flights"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {SORTS.map((s) => (
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
                  <Skeleton className="h-36 rounded-2xl" />
                </li>
              ))}
            </ul>
          ) : visible.length === 0 ? (
            <EmptyResults
              filtered={(leg?.offers.length ?? 0) > 0}
              onClear={() => setLegFilters(EMPTY_FILTERS)}
            />
          ) : (
            <ul className="space-y-4">
              {visible.map((offer) => (
                <li key={offer.id}>
                  <FlightCard
                    offer={offer}
                    onViewPrices={() => setFareOffer(offer)}
                    onBook={() =>
                      book(
                        offer,
                        selectedForLeg?.offer.id === offer.id ? selectedForLeg.fare : undefined,
                      )
                    }
                    selectedFare={
                      selectedForLeg?.offer.id === offer.id ? selectedForLeg.fare.name : null
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <FareOptionsDialog
        offer={fareOffer}
        fares={fares}
        selectedOfferId={selectedForLeg?.fare.offerId ?? null}
        onSelect={selectFare}
        onClose={() => setFareOffer(null)}
      />

      {saved && chosenCount > 0 && <SelectedFaresBar selection={saved} />}
    </div>
  );
}

function EmptyResults({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary-light text-primary">
        <PlaneTakeoff aria-hidden className="size-6" />
      </span>
      {filtered ? (
        <>
          <h3 className="mt-4 text-lg font-bold">No flights match these filters</h3>
          <p className="mt-1 text-sm text-muted">Try removing a filter to see more options.</p>
          <Button variant="outline" className="mt-5" onClick={onClear}>
            Clear filters
          </Button>
        </>
      ) : (
        <>
          <h3 className="mt-4 text-lg font-bold">No flights on this date</h3>
          <p className="mt-1 text-sm text-muted">
            There are no bookable flights for this route and date. Try a nearby date or another
            airport.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/flights">New search</Link>
          </Button>
        </>
      )}
    </div>
  );
}
