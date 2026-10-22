import { cn } from '@zproo/ui';
import { addOnKey, BAGGAGE_OPTIONS, findBaggage, type BaggageOption } from '@zproo/utils';
import { Briefcase, Check, Luggage, Plus } from 'lucide-react';
import { useState } from 'react';
import { FLIGHT_ADDON_STEP } from '@/features/checkout/steps';
import { BaggageImage } from '@/features/flights/addons/AddOnArt';
import {
  AddOnFooter,
  AddOnPage,
  SectorTabs,
  TravellerChips,
  type AddOnContext,
  type AddOnTraveller,
} from '@/features/flights/addons/AddOnShell';
import { useFlightDraft } from '@/features/flights/draft';
import { inr, localDay } from '@/features/flights/format';

export default function FlightBaggagePage() {
  return (
    <AddOnPage step={FLIGHT_ADDON_STEP.baggage} title="Add extra baggage" tab="baggage">
      {(ctx) => <Baggage ctx={ctx} />}
    </AddOnPage>
  );
}

function Baggage({ ctx }: { ctx: AddOnContext }) {
  const { offers, travellers } = ctx;
  const baggage = useFlightDraft((s) => s.addOns.baggage);
  const setBaggage = useFlightDraft((s) => s.setBaggage);

  // Baggage is bought per journey leg (a connecting trip shares one allowance).
  const [legKey, setLegKey] = useState('0');
  const leg = Math.min(Number(legKey), offers.length - 1);
  const offer = offers[leg] ?? offers[0];
  const [activeIndex, setActiveIndex] = useState(travellers[0]?.index ?? 0);
  const active = (travellers.find((t) => t.index === activeIndex) ?? travellers[0]) as AddOnTraveller;

  const bagOf = (t: AddOnTraveller) => baggage[addOnKey(leg, t.index)];
  if (!offer) return null;
  const included = offer.baggage;

  const toggle = (option: BaggageOption) =>
    setBaggage(leg, active.index, bagOf(active) === option.id ? null : option.id);

  return (
    <div>
      <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary-light/60 px-4 py-3 text-sm">
        <Luggage aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>
          Pre-paying for extra check-in baggage costs far less than paying at the airport counter.
          Choose the weight for each traveller and each journey.
        </p>
      </div>

      <div className="mt-5">
        <SectorTabs
          items={offers.map((o, i) => ({
            key: String(i),
            label: `${o.from.code} → ${o.to.code}`,
            hint: localDay(o.departureAt, o.from.timezone),
          }))}
          active={String(leg)}
          onChange={setLegKey}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-r-xl border-l-4 border-primary bg-background px-4 py-3 text-sm">
        <h2 className="text-lg font-extrabold">
          {offer.from.city} <span aria-hidden>→</span>
          <span className="sr-only"> to </span> {offer.to.city}
        </h2>
        <span className="flex items-center gap-1.5 text-muted">
          <Briefcase aria-hidden className="size-4" />
          Cabin {included.cabinKg} kg
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <Luggage aria-hidden className="size-4" />
          {included.checkInKg > 0 ? `Check-in ${included.checkInKg} kg included` : 'No check-in baggage included'}
        </span>
      </div>

      <div className="mt-4">
        <TravellerChips
          travellers={travellers}
          active={active.index}
          onChange={setActiveIndex}
          status={(t) => {
            const id = bagOf(t);
            const bag = id ? findBaggage(id) : undefined;
            return bag ? `+${bag.kg} kg extra` : 'No extra baggage';
          }}
        />
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {BAGGAGE_OPTIONS.map((option) => {
          const mine = bagOf(active) === option.id;
          return (
            <li
              key={option.id}
              className={cn(
                'flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-raised',
                mine ? 'border-primary ring-2 ring-primary/20' : 'border-border',
              )}
            >
              <div className="aspect-[4/3] w-full">
                <BaggageImage id={option.id} kg={option.kg} label={`${option.kg} kg extra check-in baggage`} />
              </div>
              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <h3 className="font-extrabold">+{option.kg} kg</h3>
                <p className="mt-0.5 flex-1 text-xs text-muted sm:text-sm">
                  Total check-in{' '}
                  {included.checkInKg + option.kg} kg
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold tabular-nums">{inr(option.pricePaise)}</span>
                  <button
                    type="button"
                    aria-pressed={mine}
                    aria-label={`${mine ? 'Remove' : 'Add'} ${option.kg} kg extra baggage for ${active.name}`}
                    onClick={() => toggle(option)}
                    className={cn(
                      'inline-flex h-9 items-center justify-center gap-1 rounded-full border-2 px-4 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
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

      <AddOnFooter
        back={{ to: '/flights/meals', label: 'Back to meals' }}
        next="/flights/review"
        nextLabel="Continue to review"
        skipLabel="Skip & review"
        hasSelection={Object.keys(baggage).length > 0}
      />
    </div>
  );
}
