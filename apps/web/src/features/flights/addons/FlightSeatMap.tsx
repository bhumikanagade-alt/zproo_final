import { CABIN_CLASS_LABELS } from '@zproo/types';
import { cn } from '@zproo/ui';
import type { FlightSector, Seat, SeatMapModel } from '@zproo/utils';
import { Armchair, Coffee, Eye, Plane, Ruler, User, Wind } from 'lucide-react';
import { Fragment, useId, type ReactNode } from 'react';
import { duration, inr, localDay, localTime } from '@/features/flights/format';
import type { AddOnTraveller } from './AddOnShell';

interface FlightSeatMapProps {
  map: SeatMapModel;
  /** Seats already chosen in this booking, by seat id. */
  picks: Record<string, AddOnTraveller>;
  /** The traveller the next click is for. */
  active: AddOnTraveller;
  onPick: (seat: Seat) => void;
  /** The flight being seated; fills the "Flight details" card beside the aircraft. */
  sector?: FlightSector;
  /** Everyone choosing a seat; fills the "Passenger" list beside the aircraft. */
  travellers?: AddOnTraveller[];
}

const KIND_STYLE = {
  FREE: 'border-emerald-500/70 bg-emerald-100 text-emerald-900 hover:bg-emerald-200',
  STANDARD: 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100',
  XL: 'border-rose-400 bg-rose-200 text-rose-950 hover:bg-rose-300',
} as const;

const lakh = (paise: number) => (paise / 100).toLocaleString('en-IN');

export function position(map: SeatMapModel, seat: Seat): string {
  const flat = map.groups.flat();
  if (seat.col === flat[0] || seat.col === flat.at(-1)) return 'window';
  const group = map.groups.find((g) => g.includes(seat.col)) ?? [];
  return seat.col === group[0] || seat.col === group.at(-1) ? 'aisle' : 'middle';
}

/** Row where the wings (and emergency doors) are drawn; mid-cabin when there are no exit rows. */
const wingRowOf = (map: SeatMapModel) =>
  map.exitRows[0] ?? map.rows[Math.floor(map.rows.length / 2)]?.row ?? 1;

function describe(map: SeatMapModel, seat: Seat, state: string): string {
  const price = seat.pricePaise === 0 ? 'free' : inr(seat.pricePaise);
  return [
    `Seat ${seat.id}`,
    position(map, seat),
    price,
    seat.kind === 'XL' ? 'extra legroom' : null,
    seat.exit ? 'emergency exit row' : null,
    state,
  ]
    .filter(Boolean)
    .join(', ');
}

function SeatButton({
  map,
  seat,
  owner,
  active,
  blocked,
  onPick,
}: {
  map: SeatMapModel;
  seat: Seat;
  owner: AddOnTraveller | undefined;
  active: AddOnTraveller;
  blocked: boolean;
  onPick: (seat: Seat) => void;
}) {
  const mine = owner?.index === active.index;
  const state = owner ? (mine ? 'selected' : `selected by ${owner.label}`) : seat.available ? 'available' : 'unavailable';
  const disabled = !owner && (!seat.available || blocked);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={owner ? true : undefined}
      aria-label={describe(map, seat, blocked && seat.available ? 'not available for children' : state)}
      title={`${seat.id} · ${seat.pricePaise === 0 ? 'Free' : inr(seat.pricePaise)}${seat.exit ? ' · Emergency exit row' : ''}`}
      onClick={() => onPick(seat)}
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-[7px] border border-b-[3px] text-[9px] font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        owner
          ? cn(
              'border-primary border-b-primary-hover bg-primary text-primary-foreground shadow-sm',
              mine && 'scale-110 ring-2 ring-primary/40 ring-offset-1',
            )
          : !seat.available
            ? 'cursor-not-allowed border-slate-200 bg-slate-100'
            : blocked
              ? 'cursor-not-allowed border-border bg-background opacity-50'
              : cn(KIND_STYLE[seat.kind], 'hover:-translate-y-px active:scale-95'),
      )}
    >
      {owner ? owner.initials || owner.label[0] : null}
    </button>
  );
}

/** Two little people: the toilet sign used on the aircraft. */
function ToiletIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 text-white" fill="currentColor">
      <circle cx="7" cy="5" r="2" />
      <circle cx="17" cy="5" r="2" />
      <path d="M4.5 9h5l1 7H9.5V21h-3v-5H5.5zM14.5 9h5l-1 7h-1V21h-3v-5h-1z" />
    </svg>
  );
}

function Lavatory() {
  return (
    <span aria-hidden className="grid size-9 place-items-center rounded-md bg-slate-400/90 shadow-sm">
      <ToiletIcon />
    </span>
  );
}

function GalleyRow() {
  return (
    <div className="flex items-center justify-between" aria-hidden>
      <Lavatory />
      <span className="grid size-7 place-items-center rounded-md bg-slate-100 text-slate-400">
        <Coffee className="size-4" />
      </span>
      <Lavatory />
    </div>
  );
}

function Legend({ map, layout }: { map: SeatMapModel; layout: 'strip' | 'card' }) {
  const seats = map.rows.flatMap((r) => r.seats);
  const range = (kind: Seat['kind']) => {
    const prices = seats.filter((s) => s.kind === kind).map((s) => s.pricePaise);
    if (prices.length === 0) return null;
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    return lo === hi ? `₹${lakh(lo)}` : `₹${lakh(lo)}–${lakh(hi)}`;
  };
  const items: { key: string; label: string; sub: string; swatch: ReactNode }[] = [];
  const sw = (cls: string) => <span className={cn('size-5 shrink-0 rounded-md border border-b-[3px]', cls)} />;
  if (range('FREE'))
    items.push({ key: 'free', label: 'Free seat', sub: 'Select this seat', swatch: sw('border-emerald-500/70 bg-emerald-100') });
  const standard = range('STANDARD');
  if (standard) items.push({ key: 'std', label: standard, sub: 'Standard seat', swatch: sw('border-rose-300 bg-rose-50') });
  const xl = range('XL');
  if (xl) items.push({ key: 'xl', label: xl, sub: 'Extra legroom', swatch: sw('border-rose-400 bg-rose-200') });
  items.push({ key: 'sel', label: 'Selected', sub: 'Your chosen seat', swatch: sw('border-primary bg-primary') });
  items.push({ key: 'na', label: 'Unavailable', sub: 'Already booked', swatch: sw('border-slate-200 bg-slate-100') });
  items.push({
    key: 'lav',
    label: 'Toilet',
    sub: 'Front and rear',
    swatch: (
      <span className="grid size-5 shrink-0 place-items-center rounded-md bg-slate-400/90 [&>svg]:size-3.5">
        <ToiletIcon />
      </span>
    ),
  });
  items.push({
    key: 'door',
    label: 'Emergency door',
    sub: 'Marked by red arrows',
    swatch: <span className="w-5 shrink-0 text-center text-base font-black leading-none text-primary">‹ ›</span>,
  });

  if (layout === 'strip') {
    return (
      <ul
        aria-label="Seat key"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl border border-border bg-white px-3 py-2.5 text-xs font-semibold shadow-card @min-[640px]:hidden"
      >
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            {item.swatch}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <Panel title="Seat legend" className="hidden @min-[640px]:block">
      <ul aria-label="Seat key" className="space-y-3">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3">
            {item.swatch}
            <div className="leading-tight">
              <p className="text-sm font-bold">{item.label}</p>
              <p className="text-[11px] text-muted">{item.sub}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-snug text-muted">
        * Emergency-exit row seats have extra legroom and are subject to airline rules; children cannot sit there.
      </p>
    </Panel>
  );
}

function Wing({ side, gid }: { side: 'left' | 'right'; gid: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 280 330"
      className={cn(
        '-z-10 pointer-events-none absolute -top-7 hidden h-[224px] w-[190px] max-w-none @min-[560px]:block',
        side === 'left' ? 'right-full -mr-8' : 'left-full -ml-8 -scale-x-100',
      )}
      strokeLinejoin="round"
    >
      {/* wing */}
      <path d="M280 90L18 250q-16 12 6 16l256 62z" fill={`url(#${gid}-wing)`} stroke="#d5dce5" strokeWidth="2" />
      <path d="M268 140L60 262M268 190L104 276M280 236L170 296" stroke="#e3e8ee" strokeWidth="2" fill="none" />
      {/* engine */}
      <rect x="92" y="96" width="50" height="124" rx="25" fill={`url(#${gid}-engine)`} stroke="#cfd7e1" strokeWidth="2" />
      <ellipse cx="117" cy="104" rx="21" ry="10" fill="#f8fafc" stroke="#c3cdd9" strokeWidth="2" />
      <ellipse cx="117" cy="104" rx="11" ry="5" fill="#94a3b8" />
    </svg>
  );
}

function Stabiliser({ side, gid }: { side: 'left' | 'right'; gid: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 150 100"
      className={cn(
        '-z-10 pointer-events-none absolute top-5 hidden h-[68px] w-[102px] max-w-none @min-[560px]:block',
        side === 'left' ? 'right-full -mr-2' : 'left-full -ml-2 -scale-x-100',
      )}
      strokeLinejoin="round"
    >
      <path d="M150 0L10 60q-12 8 4 12l136 28z" fill={`url(#${gid}-wing)`} stroke="#d5dce5" strokeWidth="2" />
    </svg>
  );
}

function Aircraft({
  map,
  picks,
  active,
  onPick,
}: Pick<FlightSeatMapProps, 'map' | 'picks' | 'active' | 'onPick'>) {
  const gid = `ac${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [left = [], right = []] = map.groups;
  const wingRow = wingRowOf(map);
  const childBlocked = (seat: Seat) => seat.exit && active.type !== 'ADULT';

  const renderGroup = (cols: string[], seats: Seat[]) => (
    <div className="flex gap-[3px]">
      {seats
        .filter((s) => cols.includes(s.col))
        .map((seat) => (
          <SeatButton
            key={seat.id}
            map={map}
            seat={seat}
            owner={picks[seat.id]}
            active={active}
            blocked={childBlocked(seat)}
            onPick={onPick}
          />
        ))}
    </div>
  );

  const letters = (cols: string[]) => (
    <div className="flex gap-[3px]">
      {cols.map((c) => (
        <span key={c} className="grid size-7 place-items-center">
          {c}
        </span>
      ))}
    </div>
  );

  return (
    <div className="relative mx-auto w-fit @min-[560px]:px-40">
      {/* shared paint for wings, engines and body */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={`${gid}-wing`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e4e9f0" />
          </linearGradient>
          <linearGradient id={`${gid}-engine`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#dde3ea" />
            <stop offset="0.45" stopColor="#ffffff" />
            <stop offset="1" stopColor="#d3dbe4" />
          </linearGradient>
          <linearGradient id={`${gid}-body`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#dfe5ec" />
            <stop offset="0.16" stopColor="#ffffff" />
            <stop offset="0.84" stopColor="#ffffff" />
            <stop offset="1" stopColor="#dfe5ec" />
          </linearGradient>
        </defs>
      </svg>

      {/* Fuselage: nose, cockpit, cabin */}
      <div
        className="relative border-x border-t border-slate-200 px-5 pb-1 pt-[7.75rem]"
        style={{
          borderRadius: '50% 50% 0 0 / 200px 200px 0 0',
          background: 'linear-gradient(90deg,#dfe5ec 0%,#ffffff 16%,#ffffff 84%,#dfe5ec 100%)',
          boxShadow: '0 0 36px rgba(148,163,184,.35)',
        }}
      >
        <svg aria-hidden viewBox="0 0 120 46" className="absolute left-1/2 top-9 h-11 w-28 -translate-x-1/2">
          <path d="M8 42Q12 6 60 4Q108 6 112 42L97 37Q90 16 60 15Q30 16 23 37z" fill="#1f3a5f" />
          <path d="M60 5V15M36 9L40 17M84 9L80 17" stroke="#cbd5e1" strokeWidth="1.5" />
        </svg>

        <GalleyRow />

        {/* Column letters stay in view while the rows scroll underneath. */}
        <div
          className="sticky top-0 z-10 -mx-2 mb-1 mt-2 flex items-center justify-center gap-2 bg-white px-2 py-1.5 text-[10px] font-bold uppercase text-muted"
          aria-hidden
        >
          {letters(left)}
          <span className="w-6" />
          {letters(right)}
        </div>

        <ol className="space-y-1">
          {map.rows.map(({ row, seats }) => {
            const door = map.exitRows.includes(row);
            const lastDoorRow = door && row === map.exitRows[map.exitRows.length - 1];
            return (
              <Fragment key={row}>
                <li className={cn('relative flex items-center justify-center gap-2', door && 'my-1.5')}>
                  {row === wingRow && (
                    <>
                      <Wing side="left" gid={gid} />
                      <Wing side="right" gid={gid} />
                    </>
                  )}
                  {door && (
                    <>
                      <span
                        aria-hidden
                        title="Emergency door"
                        className="absolute -left-[1.55rem] text-lg font-black leading-none text-primary"
                      >
                        ‹
                      </span>
                      <span
                        aria-hidden
                        title="Emergency door"
                        className="absolute -right-[1.55rem] text-lg font-black leading-none text-primary"
                      >
                        ›
                      </span>
                    </>
                  )}
                  {renderGroup(left, seats)}
                  <span className="w-6 text-center text-[10px] font-bold tabular-nums text-slate-500">{row}</span>
                  {renderGroup(right, seats)}
                </li>
                {lastDoorRow && (
                  <li
                    aria-hidden
                    className="text-center text-[8px] font-extrabold uppercase leading-none tracking-wider text-primary"
                  >
                    Emergency doors
                  </li>
                )}
              </Fragment>
            );
          })}
        </ol>

        <div className="mt-3">
          <GalleyRow />
        </div>
      </div>

      {/* Tail cone with the red fin line */}
      <div className="relative h-40" aria-hidden>
        <Stabiliser side="left" gid={gid} />
        <Stabiliser side="right" gid={gid} />
        <svg viewBox="0 0 100 160" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <path
            d="M0 0L100 0C100 56 64 124 50 160C36 124 0 56 0 0Z"
            fill={`url(#${gid}-body)`}
            stroke="#e2e8f0"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <svg viewBox="0 0 20 150" className="absolute left-1/2 top-3 h-[9.5rem] w-4 -translate-x-1/2 text-primary">
          <path d="M10 0C13 40 12 110 10 150C8 110 7 40 10 0z" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, className, children }: { title: string; icon?: typeof Plane; className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-xl border border-border bg-white p-4 shadow-card', className)}>
      <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold">
        {Icon && <Icon aria-hidden className="size-5 text-primary" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Plane; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5 text-xs">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary-light text-primary">
        <Icon aria-hidden className="size-4" />
      </span>
      <dt className="text-muted">{label}</dt>
      <dd className="ml-auto text-right font-bold">{value}</dd>
    </div>
  );
}

function FlightDetails({ sector, map }: { sector: FlightSector; map: SeatMapModel }) {
  const { offer } = sector;
  const seg = offer.segments[sector.segment];
  const arrivalAt = seg?.arrivalAt ?? offer.arrivalAt;
  const minutes = seg?.durationMinutes ?? offer.durationMinutes;
  const total = map.rows.reduce((n, r) => n + r.seats.length, 0);
  return (
    <Panel title="Flight details" icon={Plane}>
      <p className="text-lg font-extrabold leading-tight">
        {sector.airline.name} {sector.flightNumber}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xl font-extrabold">{localTime(sector.departureAt, sector.from.timezone)}</p>
          <p className="text-xs font-semibold">{sector.from.code}</p>
          <p className="text-[11px] text-muted">{sector.from.city}</p>
        </div>
        <div className="flex flex-1 flex-col items-center text-[11px] text-muted">
          <span>{duration(minutes)}</span>
          <span className="flex w-full items-center gap-1">
            <span className="h-px flex-1 bg-border" />
            <Plane aria-hidden className="size-4 rotate-90 text-primary" />
            <span className="h-px flex-1 bg-border" />
          </span>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold">{localTime(arrivalAt, sector.to.timezone)}</p>
          <p className="text-xs font-semibold">{sector.to.code}</p>
          <p className="text-[11px] text-muted">{sector.to.city}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted">{localDay(sector.departureAt, sector.from.timezone)}</p>
      <dl className="mt-3 divide-y divide-border border-t border-border">
        {sector.aircraft && <Fact icon={Plane} label="Aircraft type" value={sector.aircraft} />}
        <Fact icon={Armchair} label="Class" value={CABIN_CLASS_LABELS[offer.cabin]} />
        <Fact icon={User} label="Total seats" value={String(total)} />
      </dl>
    </Panel>
  );
}

function SelectedSeat({
  map,
  picks,
  active,
  travellers,
}: Pick<FlightSeatMapProps, 'map' | 'picks' | 'active' | 'travellers'>) {
  const seatOf = (index: number) => Object.keys(picks).find((id) => picks[id]?.index === index);
  const seatId = seatOf(active.index);
  const seat = seatId ? map.byId[seatId] : undefined;
  const nearWing = seat ? Math.abs(seat.row - wingRowOf(map)) <= 3 : false;
  const pos = seat ? position(map, seat) : '';

  return (
    <div className="space-y-4">
      <Panel title="Selected seat">
        {seat ? (
          <div className="rounded-xl border border-primary/20 bg-primary-light/50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <Armchair aria-hidden className="size-9 text-primary" />
                <div>
                  <p className="text-2xl font-extrabold leading-none">{seat.id}</p>
                  <p className="mt-1 text-xs capitalize text-muted">{pos} seat</p>
                </div>
              </div>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                {seat.pricePaise === 0 ? 'Free' : inr(seat.pricePaise)}
              </span>
            </div>
            <dl className="mt-3 divide-y divide-primary/10 border-t border-primary/10">
              <Fact icon={Eye} label="View" value={pos === 'window' ? 'Window view' : pos === 'aisle' ? 'Aisle access' : 'Middle seat'} />
              <Fact icon={Ruler} label="Legroom" value={seat.kind === 'XL' ? 'Extra legroom' : 'Standard legroom'} />
              <Fact icon={Wind} label="Position" value={nearWing ? 'Near wing (less turbulence)' : 'Away from wing'} />
            </dl>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted">
            Tap a seat on the aircraft to choose it for {active.label}.
          </p>
        )}
      </Panel>

      {travellers && travellers.length > 0 && (
        <Panel title={travellers.length > 1 ? 'Passengers' : 'Passenger'} icon={User}>
          <ol className="space-y-1.5">
            {travellers.map((t, i) => {
              const id = seatOf(t.index);
              return (
                <li
                  key={t.index}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
                    t.index === active.index ? 'border-primary bg-primary-light/60' : 'border-border',
                  )}
                >
                  <span className="truncate font-semibold">
                    {i + 1}. {t.name}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-2 py-0.5 text-xs font-bold',
                      id ? 'bg-primary-light text-primary' : 'text-muted',
                    )}
                  >
                    {id ?? '—'}
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>
      )}
    </div>
  );
}

/**
 * Seat selection in the MakeMyTrip style: flight details and seat legend on the left, a top-down
 * aircraft in the middle (nose, engines on the wings, red tail line, emergency doors) inside a
 * fixed-height window that scrolls vertically, and the selected seat and passenger on the right.
 * The layout follows the width of the card: three columns when wide, details above and selected seat beside the aircraft when medium, and stacked on phones. The layout (3-3 or 2-2) and which
 * seats are taken come from the shared seat map.
 */
export function FlightSeatMap({ map, picks, active, onPick, sector, travellers }: FlightSeatMapProps) {
  return (
    <div className="@container">
      <div className="grid gap-4 @min-[800px]:grid-cols-[minmax(0,1fr)_14rem] @min-[1100px]:grid-cols-[13.5rem_minmax(0,1fr)_14rem]">
        <div className="order-1 grid items-start gap-4 @min-[640px]:grid-cols-2 @min-[800px]:col-span-2 @min-[1100px]:col-span-1 @min-[1100px]:block @min-[1100px]:space-y-4">
          {sector && <FlightDetails sector={sector} map={map} />}
          <Legend map={map} layout="card" />
        </div>

        <div className="order-2 min-w-0 space-y-3">
          <Legend map={map} layout="strip" />
          <div className="relative">
            <div
              aria-label="Aircraft seat map, scroll to see every row"
              className="isolate h-[40rem] max-h-[80vh] overflow-x-auto overflow-y-auto overscroll-contain rounded-2xl bg-gradient-to-b from-sky-50 via-white to-sky-50 px-2 pb-6 pt-4"
            >
              <Aircraft map={map} picks={picks} active={active} onPick={onPick} />
            </div>
            <p
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-white/95 to-transparent pb-1.5 pt-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted"
            >
              Scroll for more rows
            </p>
          </div>
        </div>

        <div className="order-3">
          <SelectedSeat map={map} picks={picks} active={active} travellers={travellers} />
        </div>
      </div>
    </div>
  );
}
