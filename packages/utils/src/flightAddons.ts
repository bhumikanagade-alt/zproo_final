import type {
  AirlineInfo,
  AirportInfo,
  FlightAddOnsSelection,
  FlightOffer,
  PassengerType,
  PriceLine,
} from '@zproo/types';

/**
 * Seats, meals and extra baggage for flight bookings.
 *
 * Everything here is deterministic and shared by the website (static engine) and the API, so the
 * price the customer sees while choosing is exactly the price the server charges.
 */

export const EMPTY_ADD_ONS: FlightAddOnsSelection = { seats: {}, meals: {}, baggage: {} };

const rupees = (n: number) => n * 100;

/** FNV-1a → a stable number in [0, 1). */
function hash01(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4_294_967_296;
}

// ───────────────────────────── Sectors ─────────────────────────────

/** One flight (take-off to landing). A connecting journey leg has several sectors. */
export interface FlightSector {
  /** `"<leg>.<segment>"` */
  key: string;
  leg: number;
  segment: number;
  offer: FlightOffer;
  from: AirportInfo;
  to: AirportInfo;
  airline: AirlineInfo;
  flightNumber: string;
  aircraft: string;
  departureAt: string;
}

export function flightSectors(offers: FlightOffer[]): FlightSector[] {
  return offers.flatMap((offer, leg) =>
    (offer.segments.length > 0
      ? offer.segments
      : [
          {
            airline: offer.airline,
            flightNumber: offer.flightNumber,
            from: offer.from,
            to: offer.to,
            departureAt: offer.departureAt,
            aircraft: '',
          },
        ]
    ).map((s, segment) => ({
      key: `${leg}.${segment}`,
      leg,
      segment,
      offer,
      from: s.from,
      to: s.to,
      airline: s.airline,
      flightNumber: s.flightNumber,
      aircraft: s.aircraft,
      departureAt: s.departureAt,
    })),
  );
}

export const addOnKey = (scope: string | number, passenger: number) => `${scope}|${passenger}`;

/** Infants travel on a lap: no seat, meal or baggage of their own. */
export const canBuyAddOns = (type: PassengerType) => type !== 'INFANT';

// ───────────────────────────── Seats ─────────────────────────────

export type SeatKind = 'FREE' | 'STANDARD' | 'XL';

export interface Seat {
  /** e.g. "12A" */
  id: string;
  row: number;
  col: string;
  kind: SeatKind;
  pricePaise: number;
  /** Emergency-exit row: extra legroom, but not for children. */
  exit: boolean;
  available: boolean;
}

export interface SeatRow {
  row: number;
  /** Seats left to right; the aisle sits between the column groups. */
  seats: Seat[];
}

export interface SeatMapModel {
  /** Column letters grouped by block, e.g. [["A","B","C"],["D","E","F"]]. */
  groups: string[][];
  rows: SeatRow[];
  exitRows: number[];
  byId: Record<string, Seat>;
}

const mapCache = new Map<string, SeatMapModel>();

export function buildSeatMap(offer: FlightOffer, segment = 0): SeatMapModel {
  const aircraft = offer.segments[segment]?.aircraft ?? '';
  const cacheKey = `${offer.id}|${segment}|${aircraft}|${offer.cabin}`;
  const cached = mapCache.get(cacheKey);
  if (cached) return cached;

  const premium = offer.cabin !== 'ECONOMY';
  const turboprop = aircraft.startsWith('ATR');
  const groups = premium || turboprop ? [['A', 'C'], ['D', 'F']] : [['A', 'B', 'C'], ['D', 'E', 'F']];
  const rowCount = offer.cabin === 'PREMIUM_ECONOMY' ? 3 : premium ? 2 : turboprop ? 18 : 25;
  const exitRows = premium ? [] : turboprop ? [8, 9] : [11, 12];
  const middle = new Set(turboprop || premium ? [] : ['B', 'E']);
  const occupancy = 0.22 + 0.3 * hash01(`${offer.id}:${segment}:load`);

  const rows: SeatRow[] = [];
  const byId: Record<string, Seat> = {};
  for (let row = 1; row <= rowCount; row++) {
    const seats = groups.flat().map((col): Seat => {
      const id = `${row}${col}`;
      const exit = exitRows.includes(row);
      let kind: SeatKind = 'STANDARD';
      let pricePaise: number;
      if (premium) {
        kind = 'FREE';
        pricePaise = 0;
      } else if (row === 1) {
        kind = 'XL';
        pricePaise = rupees(1112);
      } else if (exit) {
        kind = 'XL';
        pricePaise = rupees(row === exitRows[0] ? 848 : 658);
      } else if (middle.has(col)) {
        kind = 'FREE';
        pricePaise = 0;
      } else {
        pricePaise = rupees(row <= 6 ? 629 : row <= 14 ? 449 : 300);
      }
      const seat: Seat = {
        id,
        row,
        col,
        kind,
        pricePaise,
        exit,
        available: hash01(`${offer.id}:${segment}:${id}`) >= occupancy,
      };
      byId[id] = seat;
      return seat;
    });
    rows.push({ row, seats });
  }
  const model = { groups, rows, exitRows, byId };
  mapCache.set(cacheKey, model);
  return model;
}

export const seatFor = (offer: FlightOffer, segment: number, seatId: string): Seat | undefined =>
  buildSeatMap(offer, segment).byId[seatId];

// ───────────────────────────── Meals ─────────────────────────────

export type Diet = 'VEG' | 'NONVEG' | 'EGG';
export type MealCategory = 'MEAL' | 'SNACK' | 'BREAKFAST' | 'HEALTHY';

export interface Meal {
  id: string;
  name: string;
  description: string;
  pricePaise: number;
  diet: Diet;
  category: MealCategory;
}

export const MEALS: readonly Meal[] = [
  {
    id: 'veg-dum-biryani',
    name: 'Veg Dum Biryani',
    description: 'Slow-cooked basmati rice with seasonal vegetables, saffron and raita.',
    pricePaise: rupees(399),
    diet: 'VEG',
    category: 'MEAL',
  },
  {
    id: 'chicken-biryani',
    name: 'Hyderabadi Chicken Biryani',
    description: 'Tender chicken layered with fragrant dum rice, served with mirchi salan.',
    pricePaise: rupees(449),
    diet: 'NONVEG',
    category: 'MEAL',
  },
  {
    id: 'dal-makhani-combo',
    name: 'Dal Makhani & Jeera Rice',
    description: 'Creamy black lentils simmered overnight with cumin-tempered rice.',
    pricePaise: rupees(379),
    diet: 'VEG',
    category: 'MEAL',
  },
  {
    id: 'paneer-tikka-wrap',
    name: 'Paneer Tikka Wrap',
    description: 'Smoky paneer, mint chutney and crunchy salad in a toasted wrap.',
    pricePaise: rupees(349),
    diet: 'VEG',
    category: 'SNACK',
  },
  {
    id: 'chicken-club-sandwich',
    name: 'Grilled Chicken Club Sandwich',
    description: 'Grilled chicken, lettuce and cheese in toasted multigrain bread.',
    pricePaise: rupees(399),
    diet: 'NONVEG',
    category: 'SNACK',
  },
  {
    id: 'masala-omelette',
    name: 'Masala Omelette Breakfast',
    description: 'Two-egg masala omelette with buttered toast and hash browns.',
    pricePaise: rupees(299),
    diet: 'EGG',
    category: 'BREAKFAST',
  },
  {
    id: 'fresh-fruit-bowl',
    name: 'Fresh Fruit Bowl',
    description: 'Cut seasonal fruit with a light honey-lime dressing.',
    pricePaise: rupees(249),
    diet: 'VEG',
    category: 'HEALTHY',
  },
  {
    id: 'samosa-chai',
    name: 'Samosa & Masala Chai',
    description: 'Two crisp potato samosas with tamarind chutney and hot masala chai.',
    pricePaise: rupees(199),
    diet: 'VEG',
    category: 'SNACK',
  },
];

export const findMeal = (id: string) => MEALS.find((m) => m.id === id);

// ───────────────────────────── Baggage ─────────────────────────────

export interface BaggageOption {
  id: string;
  kg: number;
  pricePaise: number;
}

/** Pre-paid extra check-in baggage, per traveller per journey leg. */
export const BAGGAGE_OPTIONS: readonly BaggageOption[] = [
  { id: 'bag-5', kg: 5, pricePaise: rupees(1350) },
  { id: 'bag-10', kg: 10, pricePaise: rupees(2550) },
  { id: 'bag-15', kg: 15, pricePaise: rupees(3750) },
  { id: 'bag-20', kg: 20, pricePaise: rupees(4950) },
  { id: 'bag-25', kg: 25, pricePaise: rupees(6300) },
  { id: 'bag-30', kg: 30, pricePaise: rupees(7500) },
];

export const findBaggage = (id: string) => BAGGAGE_OPTIONS.find((b) => b.id === id);

// ───────────────────────────── Pricing ─────────────────────────────

export interface AddOnsTotals {
  seatsPaise: number;
  mealsPaise: number;
  baggagePaise: number;
  totalPaise: number;
  seatCount: number;
  mealCount: number;
  baggageCount: number;
}

const sectorOf = (sectors: FlightSector[], key: string) => sectors.find((s) => s.key === key);

export function addOnsTotals(
  offers: FlightOffer[],
  addOns: FlightAddOnsSelection | undefined,
): AddOnsTotals {
  // No extras chosen: nothing to price (and no need to inspect the itinerary).
  if (!addOns) return { seatsPaise: 0, seatCount: 0, mealsPaise: 0, mealCount: 0, baggagePaise: 0, baggageCount: 0, totalPaise: 0 } as AddOnsTotals;
  const sectors = flightSectors(offers);
  let seatsPaise = 0;
  let seatCount = 0;
  let mealsPaise = 0;
  let mealCount = 0;
  let baggagePaise = 0;
  let baggageCount = 0;

  for (const [key, seatId] of Object.entries(addOns?.seats ?? {})) {
    const sector = sectorOf(sectors, key.split('|')[0] ?? '');
    const seat = sector && seatFor(sector.offer, sector.segment, seatId);
    if (!seat) continue;
    seatsPaise += seat.pricePaise;
    seatCount += 1;
  }
  for (const [key, mealId] of Object.entries(addOns?.meals ?? {})) {
    const meal = findMeal(mealId);
    if (!meal || !sectorOf(sectors, key.split('|')[0] ?? '')) continue;
    mealsPaise += meal.pricePaise;
    mealCount += 1;
  }
  for (const [key, bagId] of Object.entries(addOns?.baggage ?? {})) {
    const bag = findBaggage(bagId);
    const leg = Number(key.split('|')[0]);
    if (!bag || !offers[leg]) continue;
    baggagePaise += bag.pricePaise;
    baggageCount += 1;
  }
  return {
    seatsPaise,
    mealsPaise,
    baggagePaise,
    totalPaise: seatsPaise + mealsPaise + baggagePaise,
    seatCount,
    mealCount,
    baggageCount,
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Fare-summary lines for the chosen extras (only the ones that cost something). */
export function addOnsPriceLines(
  offers: FlightOffer[],
  addOns: FlightAddOnsSelection | undefined,
): PriceLine[] {
  const t = addOnsTotals(offers, addOns);
  const lines: PriceLine[] = [];
  if (t.seatCount > 0 && t.seatsPaise > 0)
    lines.push({
      label: `Seat selection — ${plural(t.seatCount, 'seat')}`,
      amountPaise: t.seatsPaise,
    });
  if (t.mealCount > 0)
    lines.push({ label: `Meals — ${plural(t.mealCount, 'meal')}`, amountPaise: t.mealsPaise });
  if (t.baggageCount > 0)
    lines.push({
      label: `Extra baggage — ${plural(t.baggageCount, 'bag')}`,
      amountPaise: t.baggagePaise,
    });
  return lines;
}

// ───────────────────────────── Validation ─────────────────────────────

export interface AddOnIssue {
  path: string;
  message: string;
}

/** Re-checks every choice against the current seat maps, menu and traveller list. */
export function validateAddOns(
  offers: FlightOffer[],
  passengers: { type: PassengerType }[],
  addOns: FlightAddOnsSelection | undefined,
): AddOnIssue[] {
  if (!addOns) return [];
  const sectors = flightSectors(offers);
  const issues: AddOnIssue[] = [];

  const passengerAt = (raw: string | undefined, path: string) => {
    const index = Number(raw);
    const p = Number.isInteger(index) ? passengers[index] : undefined;
    if (!p) {
      issues.push({ path, message: 'Unknown traveller' });
      return null;
    }
    if (!canBuyAddOns(p.type)) {
      issues.push({ path, message: 'Infants travel on a lap and cannot have their own extras' });
      return null;
    }
    return { index, type: p.type };
  };

  const taken = new Map<string, string>();
  for (const [key, seatId] of Object.entries(addOns.seats)) {
    const path = `body.addOns.seats.${key}`;
    const [sectorKey, pax] = key.split('|');
    const sector = sectorOf(sectors, sectorKey ?? '');
    const who = passengerAt(pax, path);
    if (!sector) {
      issues.push({ path, message: 'Unknown flight' });
      continue;
    }
    if (!who) continue;
    const seat = seatFor(sector.offer, sector.segment, seatId);
    if (!seat) issues.push({ path, message: `Seat ${seatId} does not exist on this flight` });
    else if (!seat.available) issues.push({ path, message: `Seat ${seatId} is no longer available` });
    else if (seat.exit && who.type !== 'ADULT')
      issues.push({ path, message: `Seat ${seatId} is an exit row, which children cannot take` });
    const dupKey = `${sectorKey}|${seatId}`;
    if (taken.has(dupKey)) issues.push({ path, message: `Seat ${seatId} is chosen twice` });
    taken.set(dupKey, key);
  }

  for (const [key, mealId] of Object.entries(addOns.meals)) {
    const path = `body.addOns.meals.${key}`;
    const [sectorKey, pax] = key.split('|');
    passengerAt(pax, path);
    if (!sectorOf(sectors, sectorKey ?? '')) issues.push({ path, message: 'Unknown flight' });
    if (!findMeal(mealId)) issues.push({ path, message: 'Unknown meal' });
  }

  for (const [key, bagId] of Object.entries(addOns.baggage)) {
    const path = `body.addOns.baggage.${key}`;
    const [leg, pax] = key.split('|');
    passengerAt(pax, path);
    if (!offers[Number(leg)]) issues.push({ path, message: 'Unknown journey' });
    if (!findBaggage(bagId)) issues.push({ path, message: 'Unknown baggage option' });
  }
  return issues;
}

/** "12A" for one flight, "12A / 7C" when the journey has several. */
export function seatSummary(
  offers: FlightOffer[],
  addOns: FlightAddOnsSelection | undefined,
  passenger: number,
): string | null {
  const seats = flightSectors(offers)
    .map((s) => addOns?.seats[addOnKey(s.key, passenger)])
    .filter((s): s is string => Boolean(s));
  return seats.length > 0 ? seats.join(' / ') : null;
}
