import { cn } from '@zproo/ui';
import { addOnKey, findMeal, MEALS, type Diet, type Meal } from '@zproo/utils';
import { Check, Clock, Plus } from 'lucide-react';
import { useState } from 'react';
import { FLIGHT_ADDON_STEP } from '@/features/checkout/steps';
import {
  AddOnFooter,
  AddOnPage,
  SectorTabs,
  TravellerChips,
  type AddOnContext,
  type AddOnTraveller,
} from '@/features/flights/addons/AddOnShell';
import { MealImage } from '@/features/flights/addons/AddOnArt';
import { useFlightDraft } from '@/features/flights/draft';
import { inr, localDay } from '@/features/flights/format';

export default function FlightMealsPage() {
  return (
    <AddOnPage step={FLIGHT_ADDON_STEP.meals} title="Pre-book your meals" tab="meals">
      {(ctx) => <Meals ctx={ctx} />}
    </AddOnPage>
  );
}

type DietFilter = 'ALL' | Diet;
const FILTERS: { id: DietFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'VEG', label: 'Veg' },
  { id: 'NONVEG', label: 'Non-veg' },
  { id: 'EGG', label: 'Egg' },
];

const DIET_COLOR: Record<Diet, string> = {
  VEG: 'border-green-600 text-green-600',
  NONVEG: 'border-red-700 text-red-700',
  EGG: 'border-amber-600 text-amber-600',
};
const DIET_LABEL: Record<Diet, string> = { VEG: 'Vegetarian', NONVEG: 'Non-vegetarian', EGG: 'Contains egg' };

/** The Indian food-label mark: a square with a dot. */
function DietMark({ diet }: { diet: Diet }) {
  return (
    <span
      role="img"
      aria-label={DIET_LABEL[diet]}
      className={cn('grid size-4 shrink-0 place-items-center rounded-[3px] border-[1.5px]', DIET_COLOR[diet])}
    >
      <span className="size-2 rounded-full bg-current" />
    </span>
  );
}

function Meals({ ctx }: { ctx: AddOnContext }) {
  const { sectors, travellers } = ctx;
  const meals = useFlightDraft((s) => s.addOns.meals);
  const setMeal = useFlightDraft((s) => s.setMeal);

  const [sectorKey, setSectorKey] = useState(sectors[0]?.key ?? '0.0');
  const sector = sectors.find((s) => s.key === sectorKey) ?? (sectors[0] as (typeof sectors)[number]);
  const [activeIndex, setActiveIndex] = useState(travellers[0]?.index ?? 0);
  const active = (travellers.find((t) => t.index === activeIndex) ?? travellers[0]) as AddOnTraveller;
  const [filter, setFilter] = useState<DietFilter>('ALL');

  const mealOf = (t: AddOnTraveller) => meals[addOnKey(sector.key, t.index)];
  const visible = MEALS.filter((m) => filter === 'ALL' || m.diet === filter);

  const toggle = (meal: Meal) =>
    setMeal(sector.key, active.index, mealOf(active) === meal.id ? null : meal.id);

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-primary-foreground sm:p-6"
        style={{ backgroundImage: 'linear-gradient(100deg, var(--primary), var(--primary-hover))' }}
      >
        <div aria-hidden className="absolute -right-6 -top-10 size-40 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -bottom-12 right-24 size-32 rounded-full bg-white/10" />
        <h2 className="relative text-xl font-extrabold sm:text-2xl">Pre-book your meal</h2>
        <p className="relative mt-1 max-w-md text-sm text-primary-foreground/90">
          Freshly prepared and served first on board. Choose one meal per traveller for each flight.
        </p>
      </div>

      <div className="mt-5">
        <SectorTabs
          items={sectors.map((s) => ({
            key: s.key,
            label: `${s.from.code} → ${s.to.code}`,
            hint: `${s.airline.name} ${s.flightNumber}`,
          }))}
          active={sector.key}
          onChange={setSectorKey}
        />
      </div>

      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <Clock aria-hidden className="size-4" />
        {sector.from.city} → {sector.to.city} · {localDay(sector.departureAt, sector.from.timezone)}
      </p>

      <div className="mt-4">
        <TravellerChips
          travellers={travellers}
          active={active.index}
          onChange={setActiveIndex}
          status={(t) => {
            const id = mealOf(t);
            return (id && findMeal(id)?.name) || 'No meal yet';
          }}
        />
      </div>

      <div role="group" aria-label="Filter meals" className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
              filter === f.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:bg-background',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {visible.map((meal) => {
          const mine = mealOf(active) === meal.id;
          const others = travellers.filter((t) => t.index !== active.index && mealOf(t) === meal.id);
          return (
            <li
              key={meal.id}
              className={cn(
                'flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-raised',
                mine ? 'border-primary ring-2 ring-primary/20' : 'border-border',
              )}
            >
              <div className="aspect-[4/3] w-full">
                <MealImage id={meal.id} label={meal.name} />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start gap-2">
                  <DietMark diet={meal.diet} />
                  <h3 className="font-bold leading-snug">{meal.name}</h3>
                </div>
                <p className="mt-1.5 flex-1 text-sm text-muted">{meal.description}</p>
                {others.length > 0 && (
                  <p className="mt-2 text-xs text-muted">
                    Also for {others.map((t) => t.name).join(', ')}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-lg font-extrabold tabular-nums">{inr(meal.pricePaise)}</span>
                  <button
                    type="button"
                    aria-pressed={mine}
                    aria-label={`${mine ? 'Remove' : 'Add'} ${meal.name} for ${active.name}`}
                    onClick={() => toggle(meal)}
                    className={cn(
                      'inline-flex h-10 min-w-24 items-center justify-center gap-1.5 rounded-full border-2 px-5 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      mine
                        ? 'border-primary bg-primary text-primary-foreground hover:bg-primary-hover'
                        : 'border-primary text-primary hover:bg-primary-light',
                    )}
                  >
                    {mine ? (
                      <>
                        <Check aria-hidden className="size-4" /> Added
                      </>
                    ) : (
                      <>
                        <Plus aria-hidden className="size-4" /> ADD
                      </>
                    )}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted">No meals match this filter.</p>
      )}

      <AddOnFooter
        back={{ to: '/flights/seats', label: 'Back to seats' }}
        next="/flights/baggage"
        nextLabel="Continue to baggage"
        skipLabel="Skip meals"
        hasSelection={Object.keys(meals).length > 0}
      />
    </div>
  );
}
