import { describe, expect, it } from 'vitest';
import {
  addDays,
  busSearchSchema,
  cabSearchSchema,
  flightSearchSchema,
  hotelSearchSchema,
  parcelQuoteSchema,
  todayIso,
  trainSearchSchema,
} from './search';

const today = todayIso();
const inDays = (n: number) => addDays(today, n);
const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((i) => i.message) ?? [];

describe('dates', () => {
  it('formats local dates and adds days across months', () => {
    expect(todayIso(new Date(2026, 9, 25, 23, 30))).toBe('2026-10-25');
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });
});

describe('flightSearchSchema', () => {
  const base = {
    tripType: 'ONE_WAY',
    legs: [{ from: 'pnq', to: 'DEL', date: inDays(7) }],
    adults: '1',
  };

  it('accepts a one-way search and normalises codes and numbers', () => {
    const parsed = flightSearchSchema.parse(base);
    expect(parsed.legs[0]).toEqual({ from: 'PNQ', to: 'DEL', date: inDays(7) });
    expect(parsed).toMatchObject({ adults: 1, children: 0, infants: 0, cabin: 'ECONOMY' });
  });

  it('rejects unknown airports, same origin and destination, and past dates', () => {
    expect(
      messages(
        flightSearchSchema.safeParse({
          ...base,
          legs: [{ from: 'XXX', to: 'DEL', date: inDays(1) }],
        }),
      ),
    ).toContain('Choose an airport from the list');
    expect(
      messages(
        flightSearchSchema.safeParse({
          ...base,
          legs: [{ from: 'DEL', to: 'DEL', date: inDays(1) }],
        }),
      ),
    ).toContain('From and To must be different');
    expect(
      messages(
        flightSearchSchema.safeParse({
          ...base,
          legs: [{ from: 'PNQ', to: 'DEL', date: inDays(-1) }],
        }),
      ),
    ).toContain("Departure date can't be in the past");
  });

  it('requires a return date on or after departure for round trips', () => {
    expect(messages(flightSearchSchema.safeParse({ ...base, tripType: 'ROUND_TRIP' }))).toContain(
      'Choose a return date',
    );
    expect(
      messages(
        flightSearchSchema.safeParse({ ...base, tripType: 'ROUND_TRIP', returnDate: inDays(3) }),
      ),
    ).toContain('Return must be on or after departure');
    expect(
      flightSearchSchema.safeParse({ ...base, tripType: 'ROUND_TRIP', returnDate: inDays(10) })
        .success,
    ).toBe(true);
  });

  it('needs 2–5 flights in date order for multi-city', () => {
    const legs = [
      { from: 'PNQ', to: 'DEL', date: inDays(5) },
      { from: 'DEL', to: 'GOI', date: inDays(3) },
    ];
    expect(
      messages(
        flightSearchSchema.safeParse({ ...base, tripType: 'MULTI_CITY', legs: legs.slice(0, 1) }),
      ),
    ).toContain('Add at least two flights for a multi-city trip');
    expect(
      messages(flightSearchSchema.safeParse({ ...base, tripType: 'MULTI_CITY', legs })),
    ).toContain('Flights must be in date order');
  });

  it('limits travellers and infants', () => {
    expect(messages(flightSearchSchema.safeParse({ ...base, adults: 6, children: 4 }))).toContain(
      'Up to 9 travellers per booking (excluding infants)',
    );
    expect(messages(flightSearchSchema.safeParse({ ...base, adults: 1, infants: 2 }))).toContain(
      'Each infant must travel with an adult',
    );
  });
});

describe('ground transport', () => {
  it('validates bus cities', () => {
    expect(busSearchSchema.safeParse({ from: 'Pune', to: 'mumbai', date: inDays(2) }).success).toBe(
      true,
    );
    expect(
      messages(busSearchSchema.safeParse({ from: 'pune', to: 'pune', date: inDays(2) })),
    ).toContain('From and To must be different');
  });

  it('validates train stations and class', () => {
    expect(trainSearchSchema.parse({ from: 'pune', to: 'ndls', date: inDays(2) })).toMatchObject({
      from: 'PUNE',
      to: 'NDLS',
      travelClass: 'ALL',
    });
    expect(
      trainSearchSchema.safeParse({ from: 'PUNE', to: 'NDLS', date: inDays(2), travelClass: '9Z' })
        .success,
    ).toBe(false);
  });

  it('requires a date and time for scheduled cabs', () => {
    expect(
      cabSearchSchema.safeParse({ pickup: 'Hinjewadi Phase 1', drop: 'Pune Airport' }).success,
    ).toBe(true);
    expect(
      messages(
        cabSearchSchema.safeParse({
          pickup: 'Hinjewadi Phase 1',
          drop: 'Pune Airport',
          when: 'LATER',
        }),
      ),
    ).toContain('Choose when to be picked up');
  });
});

describe('hotelSearchSchema', () => {
  const base = { city: 'goa', checkIn: inDays(10), checkOut: inDays(13), rooms: 1, adults: 2 };

  it('accepts a valid stay', () => {
    expect(hotelSearchSchema.safeParse(base).success).toBe(true);
  });

  it('checks nights, adults per room and room capacity', () => {
    expect(messages(hotelSearchSchema.safeParse({ ...base, checkOut: inDays(10) }))).toContain(
      'Check-out must be after check-in',
    );
    expect(messages(hotelSearchSchema.safeParse({ ...base, checkOut: inDays(45) }))).toContain(
      'Stays can be up to 30 nights',
    );
    expect(messages(hotelSearchSchema.safeParse({ ...base, rooms: 3, adults: 2 }))).toContain(
      'Each room needs at least one adult',
    );
    expect(messages(hotelSearchSchema.safeParse({ ...base, adults: 4, children: 2 }))).toContain(
      'Up to 4 guests per room — add a room',
    );
  });
});

describe('parcelQuoteSchema', () => {
  it('validates PIN codes and weight', () => {
    expect(
      parcelQuoteSchema.safeParse({ fromPincode: '411001', toPincode: '400001', weightKg: '2.5' })
        .success,
    ).toBe(true);
    expect(
      messages(
        parcelQuoteSchema.safeParse({ fromPincode: '011001', toPincode: '400001', weightKg: 60 }),
      ),
    ).toEqual(['Enter a valid 6-digit pickup PIN code', 'Up to 50 kg per parcel']);
  });
});
