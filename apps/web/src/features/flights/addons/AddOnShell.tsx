import type { FlightAddOnsSelection, FlightOffer, PassengerType, PaxCounts } from '@zproo/types';
import { Button, Skeleton, cn } from '@zproo/ui';
import {
  addOnKey,
  addOnsTotals,
  canBuyAddOns,
  flightPriceBreakdown,
  flightSectors,
  type FlightSector,
} from '@zproo/utils';
import { ArrowLeft, ArrowRight, Armchair, Luggage, Minus, Plus, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { CheckoutShell, NothingSelected } from '@/features/checkout/CheckoutShell';
import { useItineraryOffers } from '@/features/flights/api';
import { useFlightDraft, type Itinerary } from '@/features/flights/draft';
import { inr } from '@/features/flights/format';

export type AddOnTab = 'seats' | 'meals' | 'baggage';

export interface AddOnTraveller {
  /** Position in the booking's traveller list (what the API stores selections against). */
  index: number;
  type: PassengerType;
  /** "Adult 1" */
  label: string;
  name: string;
  initials: string;
}

export interface AddOnContext {
  itinerary: Itinerary;
  offers: FlightOffer[];
  sectors: FlightSector[];
  /** Travellers who can buy extras (everyone except lap infants). */
  travellers: AddOnTraveller[];
  infantCount: number;
}

const TYPE_NAME = { ADULT: 'Adult', CHILD: 'Child', INFANT: 'Infant' } as const;
const TITLE = { MR: 'Mr', MRS: 'Mrs', MS: 'Ms', MSTR: 'Master', MISS: 'Miss' } as const;

export const ADDON_PATH: Record<AddOnTab, string> = {
  seats: '/flights/seats',
  meals: '/flights/meals',
  baggage: '/flights/baggage',
};

const TABS: { id: AddOnTab; label: string; icon: typeof Armchair }[] = [
  { id: 'seats', label: 'Seats', icon: Armchair },
  { id: 'meals', label: 'Meals', icon: UtensilsCrossed },
  { id: 'baggage', label: 'Baggage', icon: Luggage },
];

/**
 * Frame for the three add-on pages: checkout progress, the Seats / Meals / Baggage tab bar, the
 * live fare summary, and guards for a missing flight or missing travellers.
 */
export function AddOnPage({
  step,
  title,
  tab,
  children,
}: {
  step: number;
  title: string;
  tab: AddOnTab;
  children: (ctx: AddOnContext) => ReactNode;
}) {
  const itinerary = useFlightDraft((s) => s.itinerary);
  const passengers = useFlightDraft((s) => s.passengers);
  if (!itinerary) return <NothingSelected />;
  if (!passengers) return <Navigate to="/flights/booking" replace />;
  return (
    <Loaded step={step} title={title} tab={tab} itinerary={itinerary}>
      {children}
    </Loaded>
  );
}

function Loaded({
  step,
  title,
  tab,
  itinerary,
  children,
}: {
  step: number;
  title: string;
  tab: AddOnTab;
  itinerary: Itinerary;
  children: (ctx: AddOnContext) => ReactNode;
}) {
  const passengers = useFlightDraft((s) => s.passengers) ?? [];
  const addOns = useFlightDraft((s) => s.addOns);
  const { offers, isPending, error } = useItineraryOffers(itinerary.offerIds, itinerary.pax);

  const counters: Record<PassengerType, number> = { ADULT: 0, CHILD: 0, INFANT: 0 };
  const travellers: AddOnTraveller[] = [];
  passengers.forEach((p, index) => {
    counters[p.type] += 1;
    if (!canBuyAddOns(p.type)) return;
    travellers.push({
      index,
      type: p.type,
      label: `${TYPE_NAME[p.type]} ${counters[p.type]}`,
      name: `${TITLE[p.title]} ${p.firstName} ${p.lastName}`.trim(),
      initials: `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase(),
    });
  });

  // Seats are compulsory: meals and baggage open only once everyone has a seat on every flight.
  if (tab !== 'seats' && offers && !seatsComplete(flightSectors(offers), travellers, addOns)) {
    return <Navigate to="/flights/seats" replace />;
  }

  return (
    <CheckoutShell
      step={step}
      title={title}
      back={{ to: '/flights/booking', label: 'Edit travellers' }}
      aside={
        offers ? (
          <AddOnFareSummary offers={offers} pax={itinerary.pax} addOns={addOns} />
        ) : (
          <Skeleton className="h-64 rounded-2xl" />
        )
      }
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <AddOnTabs active={tab} offers={offers} addOns={addOns} />
        <div className="p-4 sm:p-6">
          {error ? (
            <FormAlert>
              {errorMessage(error)}{' '}
              <Link to={itinerary.searchUrl} className="underline">
                Choose another flight
              </Link>
            </FormAlert>
          ) : isPending || !offers ? (
            <Skeleton className="h-96 rounded-2xl" />
          ) : (
            children({
              itinerary,
              offers,
              sectors: flightSectors(offers),
              travellers,
              infantCount: counters.INFANT,
            })
          )}
        </div>
      </div>
    </CheckoutShell>
  );
}

/** True when every traveller has a seat on every flight of the trip. */
export function seatsComplete(
  sectors: FlightSector[],
  travellers: AddOnTraveller[],
  addOns: FlightAddOnsSelection,
): boolean {
  return sectors.every((sector) =>
    travellers.every((t) => Boolean(addOns.seats[addOnKey(sector.key, t.index)])),
  );
}

/** Seats | Meals | Baggage — each tab is its own page, with a count of what's been added. */
function AddOnTabs({
  active,
  offers,
  addOns,
}: {
  active: AddOnTab;
  offers: FlightOffer[] | null;
  addOns: FlightAddOnsSelection;
}) {
  const totals = offers ? addOnsTotals(offers, addOns) : null;
  const counts = {
    seats: totals?.seatCount ?? 0,
    meals: totals?.mealCount ?? 0,
    baggage: totals?.baggageCount ?? 0,
  };
  return (
    <nav aria-label="Add-ons" className="flex border-b border-border bg-card">
      {TABS.map(({ id, label, icon: Icon }) => (
        <Link
          key={id}
          to={ADDON_PATH[id]}
          aria-current={id === active ? 'page' : undefined}
          className={cn(
            'relative flex flex-1 items-center justify-center gap-2 px-3 py-4 text-sm font-bold transition-colors sm:flex-none sm:justify-start sm:px-6 sm:text-base',
            id === active ? 'text-foreground' : 'text-muted hover:text-foreground',
          )}
        >
          <Icon aria-hidden className={cn('size-5', id === active && 'text-primary')} />
          {label}
          {counts[id] > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {counts[id]}
            </span>
          )}
          {id === active && (
            <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-primary" />
          )}
        </Link>
      ))}
    </nav>
  );
}

/** Pick which flight (sector) or journey leg you are choosing for. */
export function SectorTabs({
  items,
  active,
  onChange,
}: {
  items: { key: string; label: string; hint: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  if (items.length < 2) return null;
  return (
    <div role="tablist" aria-label="Flight" className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={item.key === active}
          onClick={() => onChange(item.key)}
          className={cn(
            'shrink-0 rounded-xl border px-4 py-2 text-left transition-colors',
            item.key === active
              ? 'border-primary bg-primary-light'
              : 'border-border bg-card hover:bg-background',
          )}
        >
          <span className="block text-sm font-bold">{item.label}</span>
          <span className="block text-xs text-muted">{item.hint}</span>
        </button>
      ))}
    </div>
  );
}

/** Who the next seat / meal / bag is for. */
export function TravellerChips({
  travellers,
  active,
  onChange,
  status,
}: {
  travellers: AddOnTraveller[];
  active: number;
  onChange: (index: number) => void;
  status: (t: AddOnTraveller) => string;
}) {
  return (
    <div role="radiogroup" aria-label="Traveller" className="flex gap-2 overflow-x-auto pb-1">
      {travellers.map((t) => {
        const on = t.index === active;
        return (
          <button
            key={t.index}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(t.index)}
            className={cn(
              'flex shrink-0 items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-left transition-colors',
              on ? 'border-primary bg-primary-light' : 'border-border bg-card hover:bg-background',
            )}
          >
            <span
              className={cn(
                'grid size-8 place-items-center rounded-full text-xs font-bold',
                on ? 'bg-primary text-primary-foreground' : 'bg-background text-muted',
              )}
            >
              {t.initials || t.label[0]}
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold">{t.name}</span>
              <span className="block text-xs text-muted">
                {t.label} · {status(t)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Back / skip / continue, shared by the three pages. */
export function AddOnFooter({
  back,
  next,
  nextLabel,
  skipLabel,
  hasSelection,
  blockedReason,
}: {
  back: { to: string; label: string };
  next: string;
  nextLabel: string;
  skipLabel: string;
  hasSelection: boolean;
  /** When set the step is compulsory and not yet done: Continue is disabled and this says why. */
  blockedReason?: string;
}) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
      <Button asChild variant="ghost" className="justify-center">
        <Link to={back.to}>
          <ArrowLeft aria-hidden /> {back.label}
        </Link>
      </Button>
      {blockedReason ? (
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button size="lg" disabled>
            {nextLabel} <ArrowRight aria-hidden />
          </Button>
          <p role="status" className="text-xs font-semibold text-amber-600 sm:text-right">
            {blockedReason}
          </p>
        </div>
      ) : (
        <Button asChild size="lg" variant={hasSelection ? 'default' : 'outline'}>
          <Link to={next}>
            {hasSelection ? nextLabel : skipLabel} <ArrowRight aria-hidden />
          </Link>
        </Button>
      )}
    </div>
  );
}

/** Fare summary in the layout of the reference design: expandable rows and a total. */
export function AddOnFareSummary({
  offers,
  pax,
  addOns,
}: {
  offers: FlightOffer[];
  pax: PaxCounts;
  addOns: FlightAddOnsSelection;
}) {
  const price = flightPriceBreakdown(offers, pax, addOns);
  const sum = (lines: { amountPaise: number }[]) => lines.reduce((t, l) => t + l.amountPaise, 0);
  const base = price.lines.filter((l) => l.label.startsWith('Base fare'));
  const taxes = price.lines.filter((l) => l.label.startsWith('Taxes'));
  const extras = price.lines.filter((l) => !base.includes(l) && !taxes.includes(l));
  const rows = [
    { id: 'base', label: 'Base Fare', lines: base },
    { id: 'taxes', label: 'Taxes and Surcharges', lines: taxes },
    { id: 'extras', label: 'Seats, Meals & Baggage', lines: extras },
  ];
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="fare-summary-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-card"
    >
      <h2 id="fare-summary-heading" className="text-xl font-extrabold">
        Fare Summary
      </h2>
      <dl className="mt-3 divide-y divide-border text-sm">
        {rows.map((row) => {
          const expanded = open === row.id;
          const empty = row.lines.length === 0;
          return (
            <div key={row.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <dt>
                  <button
                    type="button"
                    disabled={empty}
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : row.id)}
                    className="flex items-center gap-2 font-semibold disabled:cursor-default"
                  >
                    <span
                      className={cn(
                        'grid size-5 place-items-center rounded-full border',
                        empty ? 'border-border text-border' : 'border-foreground text-foreground',
                      )}
                    >
                      {expanded ? (
                        <Minus aria-hidden className="size-3" />
                      ) : (
                        <Plus aria-hidden className="size-3" />
                      )}
                    </span>
                    {row.label}
                  </button>
                </dt>
                <dd className={cn('font-semibold tabular-nums', empty && 'text-muted')}>
                  {inr(sum(row.lines))}
                </dd>
              </div>
              {expanded && (
                <ul className="mt-2 space-y-1.5 border-l-2 border-primary-light pl-4 text-muted">
                  {row.lines.map((line) => (
                    <li key={line.label} className="flex justify-between gap-3">
                      <span>{line.label}</span>
                      <span className="tabular-nums">{inr(line.amountPaise)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </dl>
      <div className="flex items-baseline justify-between border-t-2 border-foreground/80 pt-3">
        <span className="text-lg font-extrabold">Total Amount</span>
        <span className="text-xl font-extrabold tabular-nums">{inr(price.totalPaise)}</span>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <ShieldCheck aria-hidden className="size-3.5 text-success" />
        Includes all taxes. No hidden charges.
      </p>
    </section>
  );
}
