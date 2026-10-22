import { describe, expect, it } from 'vitest';
import {
  ageOn,
  bookBusSchema,
  bookFlightSchema,
  passengerAgeIssues,
  passengerSchema,
  passengerTypeForAge,
} from './booking';

const adult = {
  type: 'ADULT',
  title: 'MR',
  firstName: 'Amit',
  lastName: 'Sharma',
  gender: 'MALE',
} as const;

describe('ages', () => {
  it('computes whole years on a date', () => {
    expect(ageOn('2014-10-26', '2026-10-25')).toBe(11);
    expect(ageOn('2014-10-25', '2026-10-25')).toBe(12);
    expect(passengerTypeForAge(1)).toBe('INFANT');
    expect(passengerTypeForAge(2)).toBe('CHILD');
    expect(passengerTypeForAge(12)).toBe('ADULT');
  });

  it('flags passengers whose age band differs on the travel date', () => {
    const child = { ...adult, type: 'CHILD', title: 'MSTR', dateOfBirth: '2014-10-20' } as const;
    expect(passengerAgeIssues([child], '2026-10-25')).toEqual([
      { index: 0, message: 'On the travel date this passenger is an adult (12+)' },
    ]);
    expect(passengerAgeIssues([{ ...child, dateOfBirth: '2016-01-01' }], '2026-10-25')).toEqual([]);
    expect(
      passengerAgeIssues([{ ...child, dateOfBirth: '2027-01-01' }], '2026-10-25')[0]?.message,
    ).toBe('Date of birth must be before the travel date');
  });
});

describe('passengerSchema', () => {
  it('accepts an adult without date of birth', () => {
    expect(passengerSchema.safeParse(adult).success).toBe(true);
  });

  it('requires matching titles and dates of birth for children', () => {
    const result = passengerSchema.safeParse({ ...adult, type: 'CHILD' });
    expect(result.error?.issues.map((i) => i.message)).toEqual([
      'Choose a title',
      'Date of birth is required for children and infants',
    ]);
  });

  it('requires names in English letters', () => {
    expect(
      passengerSchema.safeParse({ ...adult, firstName: 'अमित' }).error?.issues[0]?.message,
    ).toBe('Use letters and spaces only');
  });
});

describe('bookFlightSchema', () => {
  it('normalises contact details', () => {
    const parsed = bookFlightSchema.parse({
      offerIds: ['mk_abc_20261025_ECONOMY'],
      passengers: [adult],
      contact: { email: 'Amit@Example.com', phone: '98765 43210' },
      expectedTotalPaise: 532000,
    });
    expect(parsed.contact).toEqual({ email: 'amit@example.com', phone: '+919876543210' });
  });
});

describe('bookBusSchema', () => {
  const valid = {
    tripId: 'bs_abc123_20261010',
    boardingPointId: 'p1',
    droppingPointId: 'p2',
    passengers: [
      { seatNumber: 'L4', firstName: 'Amit', lastName: 'Sharma', age: '34', gender: 'MALE' },
    ],
    contact: { email: 'Amit@Example.com', phone: '98765 43210' },
    expectedTotalPaise: 47_300,
  };

  it('accepts a booking and normalises age, email and phone', () => {
    const parsed = bookBusSchema.parse(valid);
    expect(parsed.passengers[0]?.age).toBe(34);
    expect(parsed.contact).toEqual({ email: 'amit@example.com', phone: '+919876543210' });
  });

  it('limits first & middle name to 20 characters and last name to 15', () => {
    const seat = valid.passengers[0] as (typeof valid.passengers)[number];
    const ok = (over: object) => bookBusSchema.safeParse({ ...valid, passengers: [{ ...seat, ...over }] }).success;
    expect(ok({ firstName: 'Abcdefghij Klmnopqrs' })).toBe(true); // 20 characters
    expect(ok({ firstName: 'Abcdefghij Klmnopqrst' })).toBe(false); // 21 characters
    expect(ok({ lastName: 'Abcdefghijklmno' })).toBe(true); // 15 characters
    expect(ok({ lastName: 'Abcdefghijklmnop' })).toBe(false); // 16 characters
  });

  it('limits the promo code to 20 trimmed characters and requires both points', () => {
    expect(bookBusSchema.parse({ ...valid, promoCode: '  ZPROO10  ' }).promoCode).toBe('ZPROO10');
    expect(bookBusSchema.safeParse({ ...valid, promoCode: 'ABCDEFGHIJKLMNOPQRSTU' }).success).toBe(false);
    expect(bookBusSchema.safeParse({ ...valid, boardingPointId: '' }).success).toBe(false);
    expect(bookBusSchema.safeParse({ ...valid, droppingPointId: '' }).success).toBe(false);
    expect(bookBusSchema.safeParse({ ...valid, passengers: [] }).success).toBe(false);
  });

  it('rejects fake contact mobile numbers', () => {
    for (const phone of ['9999999999', '9898989898', '9000000000']) {
      expect(bookBusSchema.safeParse({ ...valid, contact: { ...valid.contact, phone } }).success).toBe(false);
    }
    expect(bookBusSchema.safeParse({ ...valid, contact: { ...valid.contact, phone: '9822012345' } }).success).toBe(true);
  });

  it('allows at most six seats and one traveller per seat', () => {
    const seat = valid.passengers[0] as (typeof valid.passengers)[number];
    const seven = Array.from({ length: 7 }, (_, i) => ({ ...seat, seatNumber: `L${i + 1}` }));
    expect(bookBusSchema.safeParse({ ...valid, passengers: seven }).success).toBe(false);
    const dup = bookBusSchema.safeParse({
      ...valid,
      passengers: [seat, { ...seat, firstName: 'Priya' }],
    });
    expect(dup.success).toBe(false);
    expect(dup.error?.issues[0]).toMatchObject({ path: ['passengers', 1, 'seatNumber'] });
  });

  it('requires a sensible age', () => {
    const seat = valid.passengers[0] as (typeof valid.passengers)[number];
    for (const age of ['0', '121', '3.5', '']) {
      expect(bookBusSchema.safeParse({ ...valid, passengers: [{ ...seat, age }] }).success).toBe(
        false,
      );
    }
  });
});
