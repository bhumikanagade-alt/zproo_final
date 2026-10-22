import { describe, expect, it } from 'vitest';
import {
  addMonthsIso,
  bookBusSchema,
  busPassengerSchema,
  contactSchema,
  flightContactFormSchema,
  flightContactSchema,
  internationalDocumentIssues,
  isInternationalItinerary,
  passengerSchema,
  type PassengerInput,
} from './booking';
import { parseNationalNumber, parsePhone, sanitizeDigits, splitPhone } from './countries';

const adult = {
  type: 'ADULT',
  title: 'MR',
  firstName: 'Amit',
  lastName: 'Sharma',
  gender: 'MALE',
} as const;

const seat = { seatNumber: 'L1', firstName: 'Amit', lastName: 'Sharma', age: 30, gender: 'MALE' };

describe('traveller names (flights and buses)', () => {
  it.each(['A', 'a', 'A B', 'Am1t', '1234', 'Amit!', 'aaaa', 'xxx', '  '])('rejects %j', (name) => {
    expect(passengerSchema.safeParse({ ...adult, firstName: name }).success).toBe(false);
    expect(passengerSchema.safeParse({ ...adult, lastName: name }).success).toBe(false);
    expect(busPassengerSchema.safeParse({ ...seat, firstName: name }).success).toBe(false);
    expect(busPassengerSchema.safeParse({ ...seat, lastName: name }).success).toBe(false);
  });

  it.each(['Amit', 'Amit Kumar', 'Amit K', 'Li', 'Priya Devi'])('accepts %j', (name) => {
    expect(passengerSchema.safeParse({ ...adult, firstName: name }).success).toBe(true);
    expect(busPassengerSchema.safeParse({ ...seat, firstName: name }).success).toBe(true);
  });

  it('explains a single-letter name', () => {
    const result = passengerSchema.safeParse({ ...adult, firstName: 'A' });
    expect(result.error?.issues[0]?.message).toBe('Enter a full first name, not a single letter');
  });
});

describe('bus contact phone', () => {
  it.each(['0000000000', '9999999999', '7777777777', '98765432101', '12345', 'abcdefghij'])(
    'rejects %s',
    (phone) => {
      expect(contactSchema.safeParse({ email: 'a@b.co', phone }).success).toBe(false);
    },
  );

  it('accepts a real number and normalises it', () => {
    expect(contactSchema.parse({ email: 'a@b.co', phone: '98765 43210' }).phone).toBe('+919876543210');
  });

  it('is enforced on the bus booking too', () => {
    const base = {
      tripId: 'trip-12345',
      boardingPointId: 'b1',
      droppingPointId: 'd1',
      passengers: [seat],
      expectedTotalPaise: 100,
    };
    expect(
      bookBusSchema.safeParse({ ...base, contact: { email: 'a@b.co', phone: '0000000000' } }).success,
    ).toBe(false);
    expect(
      bookBusSchema.safeParse({ ...base, contact: { email: 'a@b.co', phone: '9876543210' } }).success,
    ).toBe(true);
  });
});

describe('flight contact phone — multiple countries', () => {
  it.each([
    ['IN', '9876543210', '+919876543210'],
    ['AE', '501234567', '+971501234567'],
    ['US', '2025550123', '+12025550123'],
    ['GB', '7911123456', '+447911123456'],
    ['SG', '81234567', '+6581234567'],
  ])('accepts %s %s', (countryCode, phone, e164) => {
    const parsed = flightContactFormSchema.parse({ email: 'a@b.co', countryCode, phone });
    expect(parsed).toEqual({ email: 'a@b.co', phone: e164 });
  });

  it.each([
    ['IN', '0000000000'],
    ['IN', '9999999999'],
    ['IN', '5876543210'],
    ['IN', '98765432101'],
    ['AE', '5012345678'],
    ['AE', '000000000'],
    ['US', '0123456789'],
    ['US', '1111111111'],
    ['SG', '123'],
    ['IN', 'abcdefghij'],
  ])('rejects %s %s', (countryCode, phone) => {
    const result = flightContactFormSchema.safeParse({ email: 'a@b.co', countryCode, phone });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['phone']);
  });

  it('rejects an unknown country code', () => {
    expect(
      flightContactFormSchema.safeParse({ email: 'a@b.co', countryCode: 'ZZ', phone: '9876543210' })
        .success,
    ).toBe(false);
  });

  it('never accepts more than 10 digits', () => {
    const result = parseNationalNumber('IN', '98765432101');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe('Mobile number cannot be more than 10 digits');
    expect(sanitizeDigits('98765432101234')).toBe('9876543210');
  });

  it('API schema accepts E.164 for any country and older Indian numbers', () => {
    expect(flightContactSchema.parse({ email: 'a@b.co', phone: '+971 50 123 4567' }).phone).toBe(
      '+971501234567',
    );
    expect(flightContactSchema.parse({ email: 'a@b.co', phone: '9876543210' }).phone).toBe(
      '+919876543210',
    );
    expect(flightContactSchema.safeParse({ email: 'a@b.co', phone: '+910000000000' }).success).toBe(
      false,
    );
    expect(flightContactSchema.safeParse({ email: 'a@b.co', phone: '+9999999999' }).success).toBe(
      false,
    );
  });

  it('round-trips between E.164 and country + digits', () => {
    expect(splitPhone('+971501234567')).toEqual({ countryCode: 'AE', national: '501234567' });
    expect(splitPhone('+919876543210')).toEqual({ countryCode: 'IN', national: '9876543210' });
    expect(splitPhone(undefined)).toEqual({ countryCode: 'IN', national: '' });
    const parsed = parsePhone('+12025550123');
    expect(parsed.ok && parsed.e164).toBe('+12025550123');
  });
});

const doc = {
  nationality: 'IN',
  passportNumber: 'K1234567',
  passportIssuingCountry: 'IN',
  passportExpiry: '2030-01-01',
  visaType: 'TOURIST',
  visaNumber: 'V12345678',
  visaExpiry: '2027-01-01',
} as const;
const withDoc = { ...adult, dateOfBirth: '1990-05-05', travelDocument: doc } as PassengerInput;

describe('international flights', () => {
  it('detects international itineraries from airport countries', () => {
    const del = { country: 'India' };
    const dxb = { country: 'United Arab Emirates' };
    expect(isInternationalItinerary([{ from: del, to: del }])).toBe(false);
    expect(isInternationalItinerary([{ from: del, to: dxb }])).toBe(true);
    expect(
      isInternationalItinerary([
        { from: del, to: dxb },
        { from: dxb, to: del },
      ]),
    ).toBe(true);
  });

  it('adds months without overflowing', () => {
    expect(addMonthsIso('2026-08-31', 6)).toBe('2027-02-28');
    expect(addMonthsIso('2026-12-01', 6)).toBe('2027-06-01');
  });

  it('accepts complete, valid documents', () => {
    expect(passengerSchema.safeParse(withDoc).success).toBe(true);
    expect(internationalDocumentIssues([withDoc], '2026-12-01')).toEqual([]);
  });

  it('requires date of birth and all passport/visa fields', () => {
    const issues = internationalDocumentIssues([{ ...adult }], '2026-12-01');
    expect(issues.map((i) => i.field)).toEqual([
      'dateOfBirth',
      'travelDocument.nationality',
      'travelDocument.passportNumber',
      'travelDocument.passportIssuingCountry',
      'travelDocument.passportExpiry',
      'travelDocument.visaType',
      'travelDocument.visaNumber',
      'travelDocument.visaExpiry',
    ]);
  });

  it('needs a passport valid 6 months past the last flight and a visa valid on travel', () => {
    const shortPassport = {
      ...withDoc,
      travelDocument: { ...doc, passportExpiry: '2027-05-31' },
    } as PassengerInput;
    expect(internationalDocumentIssues([shortPassport], '2026-12-01')[0]?.field).toBe(
      'travelDocument.passportExpiry',
    );
    const expiredVisa = {
      ...withDoc,
      travelDocument: { ...doc, visaExpiry: '2026-11-30' },
    } as PassengerInput;
    expect(internationalDocumentIssues([expiredVisa], '2026-12-01')[0]?.field).toBe(
      'travelDocument.visaExpiry',
    );
    // Return flight later in time pushes the passport requirement out.
    // (Passport fine for the outbound date + 6 months, but not for the return + 6 months.)
    const returning = {
      ...withDoc,
      travelDocument: { ...doc, passportExpiry: '2027-12-01', visaExpiry: '2027-09-01' },
    } as PassengerInput;
    expect(internationalDocumentIssues([returning], '2026-12-01').map((i) => i.field)).toEqual([]);
    expect(internationalDocumentIssues([returning], '2026-12-01', '2027-08-01').map((i) => i.field)).toEqual([
      'travelDocument.passportExpiry',
    ]);
  });

  it.each(['123', 'ABCDEFGH', '11111111', 'K12-4567', 'K1234567890'])(
    'rejects passport number %s',
    (passportNumber) => {
      expect(
        passengerSchema.safeParse({ ...withDoc, travelDocument: { ...doc, passportNumber } }).success,
      ).toBe(false);
    },
  );

  it('rejects empty visa details', () => {
    const result = passengerSchema.safeParse({
      ...withDoc,
      travelDocument: { ...doc, visaNumber: '', visaExpiry: '' },
    });
    expect(result.success).toBe(false);
  });
});

describe('date of birth lower limit', () => {
  it.each(['1911-12-31', '1910-05-05', '1885-01-01'])('rejects %s', (dateOfBirth) => {
    const result = passengerSchema.safeParse({ ...adult, dateOfBirth });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Date of birth cannot be accepted');
  });

  it.each(['1912-01-01', '1912-06-15', '1990-05-05'])('accepts %s', (dateOfBirth) => {
    expect(passengerSchema.safeParse({ ...adult, dateOfBirth }).success).toBe(true);
  });
});

describe('bus age', () => {
  it.each(['abc', '2a', '3.5', '-4', '1e2', '', ' ', '0', '121', '1000'])('rejects %j', (age) => {
    expect(busPassengerSchema.safeParse({ ...seat, age }).success).toBe(false);
  });

  it.each(['1', '34', ' 34 ', '120', 34])('accepts %j', (age) => {
    const result = busPassengerSchema.safeParse({ ...seat, age });
    expect(result.success && result.data.age).toBe(Number(String(age).trim()));
  });
});
