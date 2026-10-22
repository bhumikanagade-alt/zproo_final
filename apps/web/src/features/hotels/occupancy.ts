/**
 * Room / guest occupancy rules for hotel search and booking.
 * Pure functions only (no React) so they are easy to test and reuse.
 */

export const MAX_ROOMS = 8;
export const MAX_ADULTS_PER_ROOM = 4;
export const MAX_GUESTS_PER_ROOM = 4;
export const MAX_CHILD_AGE = 12;
export const DEFAULT_CHILD_AGE = 8;

export interface RoomOccupancy {
  adults: number;
  /** Ages of the children staying in this room (0–12). */
  childAges: number[];
}

export interface OccupancyIssue {
  room: number; // 1-based, 0 = whole search
  message: string;
}

/** Parses "7,5" into [7, 5]; invalid or out-of-range values are dropped. */
export function parseChildAges(raw: string | null | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => /^\d{1,2}$/.test(part))
    .map(Number)
    .filter((age) => age >= 0 && age <= MAX_CHILD_AGE);
}

/** Makes sure there is exactly `count` child ages, padding with a default or trimming. */
export function normaliseChildAges(ages: readonly number[], count: number): number[] {
  const safe = Math.max(0, Math.floor(count));
  const out = ages.slice(0, safe).map((a) => clampAge(a));
  while (out.length < safe) out.push(DEFAULT_CHILD_AGE);
  return out;
}

function clampAge(age: number): number {
  if (!Number.isFinite(age)) return DEFAULT_CHILD_AGE;
  return Math.min(MAX_CHILD_AGE, Math.max(0, Math.round(age)));
}

/**
 * Spreads the searched guests over the searched rooms: every room gets one adult first,
 * remaining adults and then children are dealt round-robin. Deterministic, so the same search
 * always yields the same rooms.
 */
export function distributeGuests(
  rooms: number,
  adults: number,
  childAges: readonly number[],
): RoomOccupancy[] {
  const roomCount = Math.max(1, Math.floor(rooms));
  const result: RoomOccupancy[] = Array.from({ length: roomCount }, () => ({
    adults: 0,
    childAges: [],
  }));
  let adultsLeft = Math.max(0, Math.floor(adults));
  // One adult per room first.
  for (const room of result) {
    if (adultsLeft <= 0) break;
    room.adults += 1;
    adultsLeft -= 1;
  }
  // Remaining adults fill rooms evenly.
  let cursor = 0;
  while (adultsLeft > 0) {
    const room = result[cursor % roomCount];
    if (room) room.adults += 1;
    adultsLeft -= 1;
    cursor += 1;
  }
  // Children go to the rooms with the most space, round-robin.
  childAges.forEach((age, index) => {
    result[index % roomCount]?.childAges.push(clampAge(age));
  });
  return result;
}

export function totalAdults(occupancy: readonly RoomOccupancy[]): number {
  return occupancy.reduce((sum, room) => sum + room.adults, 0);
}

export function totalChildren(occupancy: readonly RoomOccupancy[]): number {
  return occupancy.reduce((sum, room) => sum + room.childAges.length, 0);
}

export function guestCount(occupancy: readonly RoomOccupancy[]): number {
  return totalAdults(occupancy) + totalChildren(occupancy);
}

/** The largest single room in a layout (used to decide which room types can host everyone). */
export function largestRoom(occupancy: readonly RoomOccupancy[]): {
  adults: number;
  children: number;
  guests: number;
} {
  return occupancy.reduce(
    (max, room) => ({
      adults: Math.max(max.adults, room.adults),
      children: Math.max(max.children, room.childAges.length),
      guests: Math.max(max.guests, room.adults + room.childAges.length),
    }),
    { adults: 0, children: 0, guests: 0 },
  );
}

/** Validates a full room layout. Returns every problem found (empty array = valid). */
export function validateOccupancy(occupancy: readonly RoomOccupancy[]): OccupancyIssue[] {
  const issues: OccupancyIssue[] = [];
  if (occupancy.length < 1) issues.push({ room: 0, message: 'Add at least one room.' });
  if (occupancy.length > MAX_ROOMS)
    issues.push({ room: 0, message: `You can book up to ${MAX_ROOMS} rooms at a time.` });
  occupancy.forEach((room, index) => {
    const n = index + 1;
    if (!Number.isInteger(room.adults) || room.adults < 1)
      issues.push({ room: n, message: `Room ${n} needs at least 1 adult.` });
    if (room.adults > MAX_ADULTS_PER_ROOM)
      issues.push({
        room: n,
        message: `Room ${n} can have at most ${MAX_ADULTS_PER_ROOM} adults.`,
      });
    if (room.adults + room.childAges.length > MAX_GUESTS_PER_ROOM)
      issues.push({
        room: n,
        message: `Room ${n} can have at most ${MAX_GUESTS_PER_ROOM} guests.`,
      });
    room.childAges.forEach((age, i) => {
      if (!Number.isInteger(age) || age < 0 || age > MAX_CHILD_AGE)
        issues.push({
          room: n,
          message: `Enter an age between 0 and ${MAX_CHILD_AGE} for child ${i + 1} in room ${n}.`,
        });
    });
  });
  return issues;
}

/** Plain-English summary, e.g. "2 rooms · 3 adults, 1 child". */
export function occupancyLabel(occupancy: readonly RoomOccupancy[]): string {
  const rooms = occupancy.length;
  const adults = totalAdults(occupancy);
  const children = totalChildren(occupancy);
  const parts = [`${adults} adult${adults === 1 ? '' : 's'}`];
  if (children > 0) parts.push(`${children} child${children === 1 ? '' : 'ren'}`);
  return `${rooms} room${rooms === 1 ? '' : 's'} · ${parts.join(', ')}`;
}

/** Guests only, e.g. "3 adults, 1 child". */
export function guestsLabel(adults: number, children: number): string {
  const parts = [`${adults} adult${adults === 1 ? '' : 's'}`];
  if (children > 0) parts.push(`${children} child${children === 1 ? '' : 'ren'}`);
  return parts.join(', ');
}

/** Editing helpers: all return new arrays and keep the layout valid-by-construction. */
export function addRoom(occupancy: readonly RoomOccupancy[]): RoomOccupancy[] {
  if (occupancy.length >= MAX_ROOMS) return [...occupancy];
  return [...occupancy.map(cloneRoom), { adults: 1, childAges: [] }];
}

export function removeRoom(occupancy: readonly RoomOccupancy[], index: number): RoomOccupancy[] {
  if (occupancy.length <= 1) return occupancy.map(cloneRoom);
  return occupancy.filter((_, i) => i !== index).map(cloneRoom);
}

export function setAdults(
  occupancy: readonly RoomOccupancy[],
  index: number,
  adults: number,
): RoomOccupancy[] {
  return occupancy.map((room, i) => {
    if (i !== index) return cloneRoom(room);
    const maxByGuests = MAX_GUESTS_PER_ROOM - room.childAges.length;
    const next = Math.min(MAX_ADULTS_PER_ROOM, maxByGuests, Math.max(1, Math.floor(adults)));
    return { adults: next, childAges: [...room.childAges] };
  });
}

export function setChildCount(
  occupancy: readonly RoomOccupancy[],
  index: number,
  count: number,
): RoomOccupancy[] {
  return occupancy.map((room, i) => {
    if (i !== index) return cloneRoom(room);
    const maxChildren = Math.max(0, MAX_GUESTS_PER_ROOM - room.adults);
    const next = Math.min(maxChildren, Math.max(0, Math.floor(count)));
    return { adults: room.adults, childAges: normaliseChildAges(room.childAges, next) };
  });
}

export function setChildAge(
  occupancy: readonly RoomOccupancy[],
  index: number,
  childIndex: number,
  age: number,
): RoomOccupancy[] {
  return occupancy.map((room, i) => {
    if (i !== index) return cloneRoom(room);
    const childAges = [...room.childAges];
    if (childIndex >= 0 && childIndex < childAges.length) childAges[childIndex] = clampAge(age);
    return { adults: room.adults, childAges };
  });
}

function cloneRoom(room: RoomOccupancy): RoomOccupancy {
  return { adults: room.adults, childAges: [...room.childAges] };
}

/** Compact URL encoding of an explicit layout: "2.7-5|1" = room 1: 2 adults, kids 7 & 5; room 2: 1 adult. */
export function encodeLayout(occupancy: readonly RoomOccupancy[]): string {
  return occupancy
    .map((room) => `${room.adults}${room.childAges.length ? `.${room.childAges.join('-')}` : ''}`)
    .join('|');
}

export function decodeLayout(raw: string | null | undefined): RoomOccupancy[] | null {
  if (!raw) return null;
  const rooms = raw.split('|');
  const out: RoomOccupancy[] = [];
  for (const part of rooms) {
    const match = /^(\d{1,2})(?:\.((?:\d{1,2})(?:-\d{1,2})*))?$/.exec(part);
    if (!match) return null;
    const adults = Number(match[1]);
    const childAges = match[2] ? match[2].split('-').map(Number) : [];
    out.push({ adults, childAges });
  }
  return out.length ? out : null;
}
