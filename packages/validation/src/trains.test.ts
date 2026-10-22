import { describe, expect, it } from 'vitest';
import {
  addDays,
  bookTrainSchema,
  berthPreferencesFor,
  cancelTrainSchema,
  liveStatusSchema,
  todayIso,
  trainPassengerSchema,
  trainSearchInputFromParams,
  trainSearchSchema,
} from './index';

const search = (over: Record<string, unknown> = {}) =>
  trainSearchSchema.safeParse({ from: 'PUNE', to: 'NDLS', date: addDays(todayIso(), 5), ...over });
const pax = (over: Record<string, unknown> = {}) => ({
  firstName: 'Amit',
  lastName: 'Sharma',
  age: 34,
  gender: 'MALE',
  ...over,
});
const booking = (over: Record<string, unknown> = {}) =>
  bookTrainSchema.safeParse({
    offerId: 'tr_Z2101_20261102_PUNE_NDLS',
    travelClass: 'SL',
    quota: 'GN',
    passengers: [pax()],
    contact: { email: 'amit@example.com', phone: '9876543210' },
    expectedTotalPaise: 72_500,
    ...over,
  });
const paths = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  r.error?.issues.map((i) => i.path.join('.')) ?? [];

describe('trainSearchSchema', () => {
  it('defaults to all classes, General quota and one passenger', () => {
    const r = search();
    expect(r.success && r.data).toMatchObject({ travelClass: 'ALL', quota: 'GN', passengers: 1 });
  });
  it('validates stations, dates, quota and passenger limits', () => {
    expect(paths(search({ to: 'PUNE' }))).toEqual(['to']);
    expect(paths(search({ from: 'XXXX' }))).toEqual(['from']);
    expect(paths(search({ date: addDays(todayIso(), -1) }))).toEqual(['date']);
    expect(paths(search({ date: addDays(todayIso(), 200) }))).toEqual(['date']);
    expect(paths(search({ passengers: 7 }))).toEqual(['passengers']);
    expect(paths(search({ quota: 'TQ', passengers: 5 }))).toEqual(['passengers']);
    expect(search({ quota: 'XX' }).success).toBe(false);
  });
  it('reads URL parameters', () => {
    const params = new URLSearchParams(
      'from=PUNE&to=NDLS&date=2030-01-01&class=3A&quota=TQ&passengers=2',
    );
    expect(trainSearchInputFromParams(params)).toEqual({
      from: 'PUNE',
      to: 'NDLS',
      date: '2030-01-01',
      travelClass: '3A',
      quota: 'TQ',
      passengers: '2',
    });
  });
});

describe('train passengers', () => {
  it('needs a name, age 5+ and gender; last name is optional', () => {
    expect(trainPassengerSchema.safeParse(pax({ lastName: undefined })).success).toBe(true);
    expect(paths(trainPassengerSchema.safeParse(pax({ age: 4 })))).toEqual(['age']);
    expect(paths(trainPassengerSchema.safeParse(pax({ age: 'abc' })))).toEqual(['age']);
    expect(paths(trainPassengerSchema.safeParse(pax({ firstName: 'test' })))).toEqual([
      'firstName',
    ]);
    expect(paths(trainPassengerSchema.safeParse(pax({ lastName: 'Sh4rma' })))).toEqual([
      'lastName',
    ]);
  });
  it('only allows berth preferences that exist in the class', () => {
    expect(berthPreferencesFor('2A')).not.toContain('MIDDLE');
    expect(berthPreferencesFor('CC')).toEqual(['NO_PREFERENCE', 'WINDOW']);
    expect(
      paths(booking({ travelClass: '2A', passengers: [pax({ berthPreference: 'MIDDLE' })] })),
    ).toEqual(['passengers.0.berthPreference']);
    expect(
      booking({ travelClass: 'SL', passengers: [pax({ berthPreference: 'SIDE_UPPER' })] }).success,
    ).toBe(true);
  });
});

describe('bookTrainSchema', () => {
  it('limits Tatkal to 4 passengers', () => {
    expect(
      paths(booking({ quota: 'TQ', passengers: [pax(), pax(), pax(), pax(), pax()] })),
    ).toContain('passengers');
  });
  it('keeps Ladies quota for women (and boys under 12 with them)', () => {
    expect(paths(booking({ quota: 'LD' }))).toEqual(['passengers.0.gender', 'passengers']);
    expect(
      booking({ quota: 'LD', passengers: [pax({ gender: 'FEMALE' }), pax({ age: 9 })] }).success,
    ).toBe(true);
  });
  it('requires a valid Indian mobile and email', () => {
    expect(paths(booking({ contact: { email: 'x', phone: '123' } }))).toEqual([
      'contact.email',
      'contact.phone',
    ]);
  });
});

describe('cancelTrainSchema', () => {
  it('needs at least one distinct passenger', () => {
    expect(cancelTrainSchema.safeParse({ passengerIds: [] }).success).toBe(false);
    expect(cancelTrainSchema.safeParse({ passengerIds: ['a', 'a'] }).success).toBe(false);
    expect(cancelTrainSchema.safeParse({ passengerIds: ['a', 'b'] }).success).toBe(true);
  });
});

describe('duplicate passengers', () => {
  it('flags a passenger entered twice', () => {
    expect(paths(booking({ passengers: [pax(), pax()] }))).toEqual(['passengers.1.firstName']);
    expect(booking({ passengers: [pax(), pax({ age: 35 })] }).success).toBe(true);
    expect(booking({ passengers: [pax(), pax({ firstName: 'Neha', gender: 'FEMALE' })] }).success).toBe(true);
  });
});

describe('liveStatusSchema', () => {
  const live = (over: Record<string, unknown> = {}) =>
    liveStatusSchema.safeParse({ train: '12123', date: todayIso(), ...over });
  it('accepts a train number and a nearby date', () => {
    expect(live().success).toBe(true);
    expect(live({ train: ' 12123 ' }).success).toBe(true);
  });
  it('rejects bad train numbers and dates outside the live window', () => {
    // A value can fail several checks; each test only cares which field is reported.
    const unique = (r: Parameters<typeof paths>[0]) => [...new Set(paths(r))];
    expect(unique(live({ train: '' }))).toEqual(['train']);
    expect(unique(live({ train: '12' }))).toEqual(['train']);
    expect(unique(live({ train: '12-23' }))).toEqual(['train']);
    expect(unique(live({ train: '11111' }))).toEqual(['train']);
    expect(unique(live({ date: addDays(todayIso(), -5) }))).toEqual(['date']);
    expect(unique(live({ date: addDays(todayIso(), 4) }))).toEqual(['date']);
    expect(unique(live({ date: 'nope' }))).toEqual(['date']);
  });
});
