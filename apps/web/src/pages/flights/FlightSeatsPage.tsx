import { addOnKey, buildSeatMap, type Seat } from '@zproo/utils';
import { BadgeCheck, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  AddOnFooter,
  AddOnPage,
  SectorTabs,
  TravellerChips,
  seatsComplete,
  type AddOnContext,
  type AddOnTraveller,
} from '@/features/flights/addons/AddOnShell';
import { FlightSeatMap } from '@/features/flights/addons/FlightSeatMap';
import { useFlightDraft } from '@/features/flights/draft';
import { FLIGHT_ADDON_STEP } from '@/features/checkout/steps';
import { localDay } from '@/features/flights/format';

export default function FlightSeatsPage() {
  return (
    <AddOnPage step={FLIGHT_ADDON_STEP.seats} title="Choose your seats" tab="seats">
      {(ctx) => <Seats ctx={ctx} />}
    </AddOnPage>
  );
}

function Seats({ ctx }: { ctx: AddOnContext }) {
  const { sectors, travellers, infantCount } = ctx;
  const seats = useFlightDraft((s) => s.addOns.seats);
  const setSeat = useFlightDraft((s) => s.setSeat);

  const [sectorKey, setSectorKey] = useState(sectors[0]?.key ?? '0.0');
  const sector = sectors.find((s) => s.key === sectorKey) ?? (sectors[0] as (typeof sectors)[number]);
  const [activeIndex, setActiveIndex] = useState(travellers[0]?.index ?? 0);
  const active = (travellers.find((t) => t.index === activeIndex) ?? travellers[0]) as AddOnTraveller;

  const map = useMemo(
    () => buildSeatMap(sector.offer, sector.segment),
    [sector.offer, sector.segment],
  );

  const seatOf = (t: AddOnTraveller) => seats[addOnKey(sector.key, t.index)];
  const picks: Record<string, AddOnTraveller> = {};
  for (const t of travellers) {
    const id = seatOf(t);
    if (id) picks[id] = t;
  }
  const chosen = travellers.filter((t) => seatOf(t)).length;
  const complete = chosen === travellers.length;
  const hasAny = Object.keys(seats).length > 0;
  const allDone = seatsComplete(sectors, travellers, { seats, meals: {}, baggage: {} });
  const seatCount = (sectorKey: string) =>
    travellers.filter((t) => seats[addOnKey(sectorKey, t.index)]).length;
  const hasFree = map.rows.some((r) => r.seats.some((s) => s.kind === 'FREE' && s.available));
  const allFree = map.rows.every((r) => r.seats.every((s) => s.kind === 'FREE'));

  const pick = (seat: Seat) => {
    const owner = picks[seat.id];
    if (owner && owner.index !== active.index) {
      // Tapping a seat that belongs to another traveller switches to that traveller.
      setActiveIndex(owner.index);
      return;
    }
    if (seatOf(active) === seat.id) {
      setSeat(sector.key, active.index, null);
      return;
    }
    setSeat(sector.key, active.index, seat.id);
    const next = travellers.find((t) => t.index !== active.index && !seatOf(t));
    if (next) setActiveIndex(next.index);
  };

  return (
    <div>
      <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary-light/60 px-4 py-3 text-sm">
        <BadgeCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>
          {allFree
            ? 'Seat selection is complimentary in this cabin.'
            : hasFree
              ? 'Get a FREE SEAT — every green seat is free on ZPROO flights. Extra-legroom rows are marked XL.'
              : 'Pick the seat you like best. Prices are added to your fare.'}
        </p>
      </div>

      <div className="mt-5">
        <SectorTabs
          items={sectors.map((s) => ({
            key: s.key,
            label: `${s.from.code} → ${s.to.code}`,
            hint: `${s.airline.name} ${s.flightNumber} · ${seatCount(s.key)}/${travellers.length} seats`,
          }))}
          active={sector.key}
          onChange={setSectorKey}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-r-xl border-l-4 border-primary bg-background px-4 py-3">
        <div>
          <h2 className="text-lg font-extrabold">
            {sector.from.city} <span aria-hidden>→</span>
            <span className="sr-only"> to </span> {sector.to.city}
          </h2>
          <p className="text-sm text-muted">
            {chosen} of {travellers.length} Seat(s) Selected ·{' '}
            {localDay(sector.departureAt, sector.from.timezone)}
          </p>
        </div>
        <span
          className={
            complete ? 'text-sm font-semibold text-success' : 'text-sm font-semibold text-amber-600'
          }
        >
          {complete ? 'Selection complete' : 'Selection pending'}
        </span>
      </div>

      <div className="mt-4">
        <TravellerChips
          travellers={travellers}
          active={active.index}
          onChange={setActiveIndex}
          status={(t) => seatOf(t) ?? 'No seat yet'}
        />
      </div>

      {(infantCount > 0 || active.type === 'CHILD') && (
        <p className="mt-3 flex items-start gap-2 text-xs text-muted">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {active.type === 'CHILD'
            ? 'Children cannot sit in emergency-exit rows.'
            : 'Infants travel on an adult’s lap, so they don’t need a seat.'}
        </p>
      )}

      <div className="mt-4">
        <FlightSeatMap
          map={map}
          picks={picks}
          active={active}
          onPick={pick}
          sector={sector}
          travellers={travellers}
        />
      </div>

      <AddOnFooter
        back={{ to: '/flights/booking', label: 'Back to travellers' }}
        next="/flights/meals"
        nextLabel="Continue to meals"
        skipLabel="Continue to meals"
        hasSelection={hasAny}
        blockedReason={
          allDone
            ? undefined
            : sectors.length > 1
              ? 'Select a seat for every traveller on every flight to continue.'
              : 'Select a seat for every traveller to continue.'
        }
      />
    </div>
  );
}
