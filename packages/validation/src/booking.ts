import { z } from 'zod';
import { isCountryCode, parseNationalNumber, parsePhone } from './countries';
import { emailSchema, indianMobileSchema } from './common';

export const PASSENGER_TITLES = {
  ADULT: ['MR', 'MRS', 'MS'],
  CHILD: ['MSTR', 'MISS'],
  INFANT: ['MSTR', 'MISS'],
} as const;

/** Whole years between date of birth and a date (both YYYY-MM-DD). */
export function ageOn(dateOfBirth: string, onDate: string): number {
  const [by = 0, bm = 0, bd = 0] = dateOfBirth.split('-').map(Number);
  const [ty = 0, tm = 0, td = 0] = onDate.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** Airline age bands on the date of travel: infant under 2, child 2–11, adult 12+. */
export function passengerTypeForAge(age: number): 'ADULT' | 'CHILD' | 'INFANT' {
  if (age < 2) return 'INFANT';
  if (age < 12) return 'CHILD';
  return 'ADULT';
}

/** Placeholder text people type instead of a real name. */
const JUNK_NAMES = new Set([
  'test', 'testing', 'asdf', 'asdfgh', 'qwerty', 'abcd', 'abcde', 'xyz', 'none', 'null',
  'unknown', 'dummy', 'sample', 'demo', 'name', 'firstname', 'lastname', 'fname', 'lname',
  'mr', 'mrs', 'ms', 'miss', 'mstr',
]);

/** True for placeholder names such as "test" or "qwerty". */
export const isJunkName = (value: string): boolean =>
  JUNK_NAMES.has(value.toLowerCase().replace(/ /g, ''));

/** Flight traveller name limits: first + middle name up to 20 letters, last name up to 15. */
export const FLIGHT_FIRST_NAME_MAX = 20;
export const FLIGHT_LAST_NAME_MAX = 15;

const travellerName = (label: string, maxLength = 40) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .max(maxLength, `${label[0]?.toUpperCase()}${label.slice(1)} is too long`)
    .regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, 'Use letters and spaces only')
    // A single letter is not a name: the first word needs at least two letters.
    .refine((v) => (v.split(' ')[0] ?? '').length >= 2, {
      message: `Enter a full ${label}, not a single letter`,
    })
    // "aaaa" / "xxx" are not names either.
    .refine((v) => !/^([A-Za-z])\1+$/i.test(v.replace(/ /g, '')), {
      message: `Enter a valid ${label}`,
    })
    // "test" / "qwerty" / a title typed as the name.
    .refine((v) => !isJunkName(v), { message: `Enter a valid ${label}` });

// ───────────────────── International travel documents ─────────────────────

export const VISA_TYPES = ['TOURIST', 'BUSINESS', 'STUDENT', 'WORK', 'TRANSIT', 'EVISA'] as const;
export const VISA_TYPE_LABEL: Record<(typeof VISA_TYPES)[number], string> = {
  TOURIST: 'Tourist visa',
  BUSINESS: 'Business visa',
  STUDENT: 'Student visa',
  WORK: 'Work visa',
  TRANSIT: 'Transit visa',
  EVISA: 'e-Visa',
};

export const VISA_ENTRY_TYPES = ['SINGLE', 'DOUBLE', 'MULTIPLE'] as const;
export const VISA_ENTRY_TYPE_LABEL: Record<(typeof VISA_ENTRY_TYPES)[number], string> = {
  SINGLE: 'Single entry',
  DOUBLE: 'Double entry',
  MULTIPLE: 'Multiple entry',
};

/** A flight-document date; the form shows it as DD/MM/YYYY. */
const flightDateSchema = z.iso.date({ message: 'Enter a valid date (DD/MM/YYYY)' });

const docDate = (label: string) =>
  z.string({ message: `Enter ${label}` }).min(1, `Enter ${label}`).pipe(flightDateSchema);

const countryField = (label: string) =>
  z.string({ message: `Select ${label}` }).refine(isCountryCode, { message: `Select ${label}` });

const idNumber = (label: string, min: number, max: number) =>
  z
    .string({ message: `Enter ${label}` })
    .trim()
    .toUpperCase()
    .min(1, `Enter ${label}`)
    .regex(new RegExp(`^[A-Z0-9]{${min},${max}}$`), `${label[0]?.toUpperCase()}${label.slice(1)} must be ${min}–${max} letters or digits`)
    .refine((v) => !/^(.)\1+$/.test(v), { message: `Enter a valid ${label}` });

/** Passport and visa details every traveller must give on an international flight. */
export const travelDocumentSchema = z.object({
  nationality: countryField('nationality'),
  passportNumber: idNumber('passport number', 6, 9).refine((v) => /\d/.test(v), {
    message: 'Passport number must contain digits',
  }),
  passportIssuingCountry: countryField('passport issuing country'),
  passportExpiry: docDate('passport expiry date'),
  visaType: z.enum(VISA_TYPES, { message: 'Choose a visa type' }),
  visaNumber: idNumber('visa number', 6, 15),
  visaExpiry: docDate('visa expiry date'),
  /** Optional extras for the document check. */
  passportIssueDate: flightDateSchema.optional(),
  visaIssueDate: flightDateSchema.optional(),
  visaEntryType: z.enum(VISA_ENTRY_TYPES, { message: 'Choose an entry type' }).optional(),
  /** Electronic travel authorisation (ETA / ESTA / eTA etc.), where the destination needs one. */
  travelAuthorisationNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{4,25}$/, 'Enter a valid authorisation number')
    .optional(),
});
export type TravelDocumentInput = z.output<typeof travelDocumentSchema>;

// ───────────────────── Domestic identity documents ─────────────────────

export const ID_TYPES = ['AADHAAR', 'PASSPORT', 'VOTER_ID', 'DRIVING_LICENCE', 'PAN', 'OTHER'] as const;
export type IdType = (typeof ID_TYPES)[number];
export const ID_TYPE_LABEL: Record<IdType, string> = {
  AADHAAR: 'Aadhaar Card',
  PASSPORT: 'Passport',
  VOTER_ID: 'Voter ID',
  DRIVING_LICENCE: 'Driving Licence',
  PAN: 'PAN Card',
  OTHER: 'Other accepted ID',
};

// Verhoeff checksum: every genuine Aadhaar number passes it, so a mistyped digit is caught.
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
] as const;
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
] as const;

/** True when the digits pass the Verhoeff checksum. */
export function verhoeffValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let c = 0;
  const reversed = digits.split('').reverse();
  reversed.forEach((ch, i) => {
    const row = VERHOEFF_P[i % 8] as readonly number[];
    c = (VERHOEFF_D[c] as readonly number[])[row[Number(ch)] as number] as number;
  });
  return c === 0;
}

/** RTO state / union-territory codes that start an Indian driving licence number. */
const DL_STATE_CODES =
  'AN AP AR AS BR CG CH DD DL DN GA GJ HP HR JH JK KA KL LA LD MH ML MN MP MZ NL OD OR PB PY RJ SK TN TR TS UA UK UP WB'.split(
    ' ',
  );

/** PAN: 4th letter is the holder type (P person, C company, H HUF, F firm, ...). */
const PAN_HOLDER_TYPES = 'PCHABGJLFT';

const ID_PATTERNS: Record<IdType, { test: (v: string) => boolean; message: string }> = {
  AADHAAR: {
    test: (v) => /^[2-9]\d{11}$/.test(v) && verhoeffValid(v),
    message: 'Enter a valid 12-digit Aadhaar number (it cannot start with 0 or 1)',
  },
  PASSPORT: {
    test: (v) => /^[A-Z0-9]{6,9}$/.test(v) && /\d/.test(v),
    message: 'Passport number must be 6–9 letters or digits and contain a digit',
  },
  VOTER_ID: { test: (v) => /^[A-Z]{3}\d{7}$/.test(v), message: 'Voter ID must be 3 letters followed by 7 digits' },
  DRIVING_LICENCE: {
    test: (v) => /^[A-Z]{2}[A-Z0-9]{11,14}$/.test(v) && DL_STATE_CODES.includes(v.slice(0, 2)),
    message: 'Enter the driving licence number as printed, starting with the state code (for example MH1220110012345)',
  },
  PAN: {
    test: (v) => /^[A-Z]{5}\d{4}[A-Z]$/.test(v) && PAN_HOLDER_TYPES.includes(v.charAt(3)),
    message: 'Enter a valid PAN, for example ABCPE1234F',
  },
  OTHER: { test: (v) => /^[A-Z0-9]{4,20}$/.test(v), message: 'ID number must be 4–20 letters or digits' },
};

/** Upper-case, without spaces or hyphens ("2345 6789 0123" → "234567890123"). */
export const normalizeIdNumber = (value: string) => value.toUpperCase().replace(/[\s-]/g, '');

/** Aadhaar: exactly 12 digits, first digit 2–9, passing the Verhoeff checksum. */
function aadhaarProblem(value: string): string | null {
  if (!/^\d+$/.test(value)) {
    return 'Enter a valid 12-digit Aadhaar number (digits only, no letters or symbols)';
  }
  if (value.length !== 12) {
    return `Enter a valid 12-digit Aadhaar number (you entered ${value.length} digit${value.length === 1 ? '' : 's'})`;
  }
  if (!/^[2-9]/.test(value)) {
    return 'Enter a valid 12-digit Aadhaar number (it cannot start with 0 or 1)';
  }
  return verhoeffValid(value)
    ? null
    : 'Enter a valid 12-digit Aadhaar number (the last digits do not match, please re-check it)';
}

/**
 * What each ID type accepts while typing: one character class per position
 * (L = letter, D = digit, A = letter or digit), which also fixes the maximum length.
 */
const ID_SHAPE: Record<IdType, string> = {
  AADHAAR: 'D'.repeat(12),
  PASSPORT: 'A'.repeat(9),
  VOTER_ID: 'LLLDDDDDDD',
  DRIVING_LICENCE: `LL${'A'.repeat(14)}`,
  PAN: 'LLLLLDDDDL',
  OTHER: 'A'.repeat(20),
};
const SHAPE_CLASS = { L: /[A-Z]/, D: /\d/, A: /[A-Z0-9]/ } as const;

/** Longest ID number and keyboard to show for each ID type. */
export const ID_INPUT_RULES: Record<IdType, { maxLength: number; inputMode: 'numeric' | 'text' }> = {
  AADHAAR: { maxLength: 12, inputMode: 'numeric' },
  PASSPORT: { maxLength: 9, inputMode: 'text' },
  VOTER_ID: { maxLength: 10, inputMode: 'text' },
  DRIVING_LICENCE: { maxLength: 16, inputMode: 'text' },
  PAN: { maxLength: 10, inputMode: 'text' },
  OTHER: { maxLength: 20, inputMode: 'text' },
};

/**
 * Cleans what is typed or pasted for an ID type: upper-case, no spaces or hyphens, and only the
 * characters that fit each position ("2345 6789 0124" → "234567890124"; letters are dropped from
 * an Aadhaar number; a PAN is 5 letters, 4 digits, 1 letter), never longer than the ID allows.
 */
export function sanitizeIdNumber(type: IdType, raw: string): string {
  const shape = ID_SHAPE[type];
  let out = '';
  for (const ch of normalizeIdNumber(raw)) {
    if (out.length >= shape.length) break;
    const kind = shape.charAt(out.length) as keyof typeof SHAPE_CLASS;
    if (SHAPE_CLASS[kind].test(ch)) out += ch;
  }
  return out;
}

/** `null` when the number suits the ID type, otherwise a message for the traveller. */
export function validateIdentityNumber(type: IdType, raw: string): string | null {
  const value = normalizeIdNumber(raw);
  if (!value) return 'Enter ID number';
  if (type === 'AADHAAR') return aadhaarProblem(value);
  if (/^(.)\1+$/.test(value)) return 'Enter a valid ID number';
  const rule = ID_PATTERNS[type];
  return rule.test(value) ? null : rule.message;
}

/**
 * Passport number check. Indian passports (issued in IN) are one letter followed by seven digits,
 * the first and last digit not zero; the letters Q, X and Z are never used.
 */
export function validatePassportNumber(raw: string, issuingCountry?: string): string | null {
  const value = normalizeIdNumber(raw);
  if (!value) return 'Enter passport number';
  if (/^(.)\1+$/.test(value)) return 'Enter a valid passport number';
  if (issuingCountry === 'IN') {
    return /^[A-PR-WY][1-9]\d{5}[1-9]$/.test(value)
      ? null
      : 'Indian passport numbers are one letter followed by 7 digits (for example K1234567)';
  }
  return ID_PATTERNS.PASSPORT.test(value) ? null : ID_PATTERNS.PASSPORT.message;
}

/**
 * Identity document for a domestic flight. The number may be blank for children and infants
 * (they may only need proof of age); adults are checked by `documentVerification`.
 */
export const identityDocumentSchema = z.object({
  type: z.enum(ID_TYPES, { message: 'Choose an ID type' }),
  number: z.string({ message: 'Enter ID number' }).max(30, 'ID number is too long').transform(normalizeIdNumber),
  nationality: countryField('nationality'),
});
export type IdentityDocumentInput = z.output<typeof identityDocumentSchema>;

/** Earliest date of birth accepted for a flight traveller. */
export const MIN_BIRTH_DATE = '1912-01-01';

const birthDateSchema = z.iso
  .date({ message: 'Enter a valid date of birth (DD/MM/YYYY)' })
  .refine((d) => d >= MIN_BIRTH_DATE, {
    message: 'Date of birth cannot be accepted',
  });

/**
 * Date of birth is optional for adults on domestic flights. It is required only when a rule
 * demands it: children and infants (fare and age band) and every traveller on an international
 * itinerary (passport/visa checks).
 */
export function isDobRequired(type: 'ADULT' | 'CHILD' | 'INFANT', international: boolean): boolean {
  return type !== 'ADULT' || international;
}

export const passengerSchema = z
  .object({
    type: z.enum(['ADULT', 'CHILD', 'INFANT']),
    title: z.enum(['MR', 'MRS', 'MS', 'MSTR', 'MISS']),
    firstName: travellerName('first name', FLIGHT_FIRST_NAME_MAX),
    lastName: travellerName('last name', FLIGHT_LAST_NAME_MAX),
    dateOfBirth: birthDateSchema.optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    /** Required (checked against the itinerary) only on international flights. */
    travelDocument: travelDocumentSchema.optional(),
    /** Government photo ID on a domestic flight; never set on international flights. */
    identityDocument: identityDocumentSchema.optional(),
  })
  .superRefine((p, ctx) => {
    if (p.identityDocument?.number) {
      const message = validateIdentityNumber(p.identityDocument.type, p.identityDocument.number);
      if (message) {
        ctx.addIssue({ code: 'custom', path: ['identityDocument', 'number'], message });
      }
    }
    if (!(PASSENGER_TITLES[p.type] as readonly string[]).includes(p.title)) {
      ctx.addIssue({ code: 'custom', path: ['title'], message: 'Choose a title' });
    } else if (
      (p.gender === 'MALE' && ['MRS', 'MS', 'MISS'].includes(p.title)) ||
      (p.gender === 'FEMALE' && ['MR', 'MSTR'].includes(p.title))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['title'],
        message: 'Title does not match the selected gender',
      });
    }
    if (p.type !== 'ADULT' && !p.dateOfBirth) {
      ctx.addIssue({
        code: 'custom',
        path: ['dateOfBirth'],
        message: 'Date of birth is required for children and infants',
      });
    }
  });
export type PassengerInput = z.output<typeof passengerSchema>;

/** Indian mobile for bookings: also refuses 9999999999-style numbers. */
export const bookingMobileSchema = indianMobileSchema.refine(
  (value) => {
    const digits = value.slice(3);
    if (/^(\d)\1{9}$/.test(digits)) return false; // 9999999999
    if (/^(\d\d)\1{4}$/.test(digits)) return false; // 9898989898
    if (/(\d)\1{6,}/.test(digits)) return false; // 9000000000, 9111111123
    return true;
  },
  { message: 'Enter a valid mobile number' },
);

/** Bus contact: Indian mobile only. */
export const contactSchema = z.object({ email: emailSchema, phone: bookingMobileSchema });

/** Any supported country as `+<dial><digits>` (Indian numbers may omit the +91). Outputs E.164. */
export const internationalMobileSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const result = parsePhone(value);
    if (!result.ok) {
      ctx.addIssue({ code: 'custom', message: result.message });
      return z.NEVER;
    }
    return result.e164;
  });

/** Flight contact as the API receives it. */
export const flightContactSchema = z.object({ email: emailSchema, phone: internationalMobileSchema });

/** Flight contact as the web form holds it (country + national digits); outputs `{ email, phone }`. */
export const flightContactFormSchema = z
  .object({
    email: emailSchema,
    countryCode: z.string().refine(isCountryCode, { message: 'Select a country code' }),
    phone: z.string(),
  })
  .transform((value, ctx) => {
    const result = parseNationalNumber(value.countryCode, value.phone);
    if (!result.ok) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: result.message });
      return z.NEVER;
    }
    return { email: value.email, phone: result.e164 };
  });

/**
 * Checks each passenger's age band on the travel date (so an 11-year-old who turns 12 before the
 * flight travels as an adult).
 */
export function passengerAgeIssues(
  passengers: PassengerInput[],
  travelDate: string,
): { index: number; message: string }[] {
  const issues: { index: number; message: string }[] = [];
  passengers.forEach((p, index) => {
    if (!p.dateOfBirth) return;
    if (p.dateOfBirth > travelDate) {
      issues.push({ index, message: 'Date of birth must be before the travel date' });
      return;
    }
    const actual = passengerTypeForAge(ageOn(p.dateOfBirth, travelDate));
    if (actual !== p.type) {
      const band = {
        ADULT: 'an adult (12+)',
        CHILD: 'a child (2–11)',
        INFANT: 'an infant (under 2)',
      }[actual];
      issues.push({ index, message: `On the travel date this passenger is ${band}` });
    }
  });
  return issues;
}

/** True when the journey touches more than one country (any leg). */
export function isInternationalItinerary(
  offers: { from: { country: string }; to: { country: string } }[],
): boolean {
  const countries = new Set(offers.flatMap((o) => [o.from.country, o.to.country]));
  return countries.size > 1;
}

/** `YYYY-MM-DD` plus whole months (clamped to month end). */
export function addMonthsIso(date: string, months: number): string {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

const DOCUMENT_FIELDS = [
  'nationality',
  'passportNumber',
  'passportIssuingCountry',
  'passportExpiry',
  'visaType',
  'visaNumber',
  'visaExpiry',
] as const;

/**
 * On an international flight every traveller needs a date of birth, a passport valid for 6 months
 * after the (last) travel date and a visa valid on arrival. `lastTravelDate` is the departure date
 * of the final leg (defaults to `travelDate`).
 */
export function internationalDocumentIssues(
  passengers: PassengerInput[],
  travelDate: string,
  lastTravelDate: string = travelDate,
): { index: number; field: string; message: string }[] {
  const issues: { index: number; field: string; message: string }[] = [];
  const passportMin = addMonthsIso(lastTravelDate, 6);
  passengers.forEach((p, index) => {
    if (!p.dateOfBirth) {
      issues.push({
        index,
        field: 'dateOfBirth',
        message: 'Date of birth is required for international travel',
      });
    }
    const doc = p.travelDocument;
    if (!doc) {
      for (const field of DOCUMENT_FIELDS) {
        issues.push({ index, field: `travelDocument.${field}`, message: 'Passport and visa details are required' });
      }
      return;
    }
    if (doc.passportExpiry < passportMin) {
      issues.push({
        index,
        field: 'travelDocument.passportExpiry',
        message: 'Passport must be valid for at least 6 months after your return/last flight',
      });
    }
    if (doc.visaExpiry < lastTravelDate) {
      issues.push({
        index,
        field: 'travelDocument.visaExpiry',
        message: 'Visa must be valid on your travel date',
      });
    }
  });
  return issues;
}

/** Seats, meals and baggage chosen after traveller details; re-priced and re-checked by the API. */
export const flightAddOnsSchema = z.object({
  seats: z.record(z.string().max(20), z.string().max(8)).default({}),
  meals: z.record(z.string().max(20), z.string().max(40)).default({}),
  baggage: z.record(z.string().max(20), z.string().max(20)).default({}),
});

/** Longest promo code accepted on a booking (bus, train and flight; matches the admin coupon form). */
export const BUS_PROMO_MAX = 20;

export const bookFlightSchema = z.object({
  /** One offer per journey leg, in order. */
  offerIds: z.array(z.string().min(5).max(200)).min(1).max(5),
  passengers: z.array(passengerSchema).min(1).max(18),
  contact: flightContactSchema,
  /** Optional paid extras (seat selection, meals, extra baggage). */
  addOns: flightAddOnsSchema.optional(),
  /** Optional coupon made in the admin panel (Marketing → Coupons, valid on flights). */
  promoCode: z.string().trim().max(BUS_PROMO_MAX, `Promo code can be at most ${BUS_PROMO_MAX} characters`).optional(),
  /** The total the customer saw (after any coupon); if the price moved, the API refuses with PRICE_CHANGED. */
  expectedTotalPaise: z.number().int().positive(),
});
export type BookFlightInput = z.output<typeof bookFlightSchema>;

// ───────────────────────────── Buses ─────────────────────────────

export const MAX_BUS_SEATS = 6;

/** Bus traveller name limits: first + middle name up to 20 characters, last name up to 15. */
export const BUS_FIRST_NAME_MAX = 20;
export const BUS_LAST_NAME_MAX = 15;

export const busPassengerSchema = z.object({
  seatNumber: z.string().trim().min(1, 'Select a seat').max(8),
  /** First + middle name up to 20 characters, last name up to 15 (same limits as flights). */
  firstName: travellerName('first name', BUS_FIRST_NAME_MAX),
  lastName: travellerName('last name', BUS_LAST_NAME_MAX),
  age: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? v.trim() : String(v)))
    .refine((v) => v !== '', { message: 'Enter age' })
    .refine((v) => /^\d+$/.test(v), { message: 'Age must be a number (digits only)' })
    .transform(Number)
    .pipe(
      z
        .number({ message: 'Enter age' })
        .int('Enter age in whole years')
        .min(1, 'Enter a valid age (1–120)')
        .max(120, 'Enter a valid age (1–120)'),
    ),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
});
export type BusPassengerInput = z.output<typeof busPassengerSchema>;

export const bookBusSchema = z
  .object({
    tripId: z.string().min(5).max(200),
    boardingPointId: z.string().min(1, 'Choose a boarding point').max(64),
    droppingPointId: z.string().min(1, 'Choose a dropping point').max(64),
    /** One traveller per seat: at least 1 seat, at most 6 per booking. */
    passengers: z
      .array(busPassengerSchema)
      .min(1, 'Select at least 1 seat')
      .max(MAX_BUS_SEATS, `Up to ${MAX_BUS_SEATS} seats per booking`),
    contact: contactSchema,
    /** Optional promotion applied to this booking: trimmed, at most 10 characters. */
    promoCode: z.string().trim().max(BUS_PROMO_MAX, `Promo code can be at most ${BUS_PROMO_MAX} characters`).optional(),
    /** The total the customer saw; if the price moved, the API refuses with PRICE_CHANGED. */
    expectedTotalPaise: z.number().int().positive(),
  })
  .superRefine((b, ctx) => {
    const seen = new Set<string>();
    b.passengers.forEach((p, i) => {
      if (seen.has(p.seatNumber)) {
        ctx.addIssue({
          code: 'custom',
          path: ['passengers', i, 'seatNumber'],
          message: 'Each traveller needs their own seat',
        });
      }
      seen.add(p.seatNumber);
    });
  });
export type BookBusInput = z.output<typeof bookBusSchema>;

// ───────────────────────────── Trains ─────────────────────────────

/**
 * Railway passenger. Indian Railways asks for name, age and gender (no date of birth or ID at
 * booking), so identity documents are deliberately not collected. Children under 5 travel
 * without a ticket and are not entered as passengers.
 */
export const TRAIN_MIN_PASSENGER_AGE = 5;

export const trainPassengerSchema = z.object({
  firstName: travellerName('first name', 20),
  /** Optional: some travellers have a single name. */
  lastName: z
    .string()
    .trim()
    .max(15, 'Last name is too long')
    .regex(/^(?:[A-Za-z]+(?: [A-Za-z]+)*)?$/, 'Use letters and spaces only')
    .default(''),
  age: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? v.trim() : String(v)))
    .refine((v) => v !== '', { message: 'Enter age' })
    .refine((v) => /^\d+$/.test(v), { message: 'Age must be a number (digits only)' })
    .transform(Number)
    .pipe(
      z
        .number({ message: 'Enter age' })
        .int('Enter age in whole years')
        .min(TRAIN_MIN_PASSENGER_AGE, `Children under ${TRAIN_MIN_PASSENGER_AGE} travel without a ticket — don't add them`)
        .max(125, 'Enter a valid age'),
    ),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { message: 'Choose gender' }),
  berthPreference: z
    .enum(['NO_PREFERENCE', 'LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER', 'WINDOW'])
    .default('NO_PREFERENCE'),
  /** Only sent when the provider and train offer a food choice. */
  foodChoice: z.enum(['VEG', 'NON_VEG', 'NO_FOOD']).optional(),
});
export type TrainPassengerInput = z.output<typeof trainPassengerSchema>;

const trainClassValues = ['1A', '2A', '3A', '3E', 'SL', 'CC', 'EC', '2S'] as const;
const trainQuotaValues = ['GN', 'TQ', 'LD', 'SS', 'PT'] as const;

/** Berth preferences that exist in a class (seating classes offer window seats only). */
export function berthPreferencesFor(travelClass: string): string[] {
  switch (travelClass) {
    case '1A':
      return ['NO_PREFERENCE', 'LOWER', 'UPPER'];
    case '2A':
      return ['NO_PREFERENCE', 'LOWER', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER'];
    case '3A':
    case '3E':
    case 'SL':
      return ['NO_PREFERENCE', 'LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER'];
    default:
      return ['NO_PREFERENCE', 'WINDOW'];
  }
}

/**
 * Quota and class rules for a passenger list (shared by the booking API and the web form):
 * Tatkal allows 4 passengers, berth preferences must exist in the class, and Ladies quota is for
 * women (boys under 12 may travel with them).
 */
export function trainPassengerRuleIssues(b: {
  quota: string;
  travelClass: string;
  passengers: { firstName?: string; lastName?: string; gender: string; age: number; berthPreference: string }[];
}): { path: (string | number)[]; message: string }[] {
  const issues: { path: (string | number)[]; message: string }[] = [];
  const seen = new Map<string, number>();
  b.passengers.forEach((p, i) => {
    const { firstName = '', lastName = '' } = p as { firstName?: string; lastName?: string };
    const key = [firstName, lastName].join(' ').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!key) return;
    const id = `${key}|${p.age}|${p.gender}`;
    const first = seen.get(id);
    if (first !== undefined) {
      issues.push({
        path: ['passengers', i, 'firstName'],
        message: `Same name, age and gender as passenger ${first + 1} — remove the duplicate`,
      });
    } else {
      seen.set(id, i);
    }
  });
  if (b.quota === 'TQ' && b.passengers.length > 4) {
    issues.push({ path: ['passengers'], message: 'Tatkal tickets allow up to 4 passengers' });
  }
  const allowed = berthPreferencesFor(b.travelClass);
  b.passengers.forEach((p, i) => {
    if (!allowed.includes(p.berthPreference)) {
      issues.push({
        path: ['passengers', i, 'berthPreference'],
        message: 'This berth preference does not exist in the chosen class',
      });
    }
    if (b.quota === 'LD' && p.gender !== 'FEMALE' && !(p.gender === 'MALE' && p.age < 12)) {
      issues.push({
        path: ['passengers', i, 'gender'],
        message: 'Ladies quota is for women (and boys under 12 travelling with them)',
      });
    }
  });
  if (b.quota === 'LD' && b.passengers.length > 0 && b.passengers.every((p) => p.gender !== 'FEMALE')) {
    issues.push({ path: ['passengers'], message: 'Ladies quota needs at least one woman passenger' });
  }
  return issues;
}

/** Server-side fare quote request; the passenger count drives the total. */
export const trainQuoteSchema = z.object({
  offerId: z.string().trim().min(5).max(120),
  travelClass: z.enum(trainClassValues, { message: 'Choose a travel class' }),
  quota: z.enum(trainQuotaValues, { message: 'Choose a quota' }),
  passengers: z.coerce.number().int().min(1).max(6),
});
export type TrainQuoteInput = z.output<typeof trainQuoteSchema>;

export const bookTrainSchema = z
  .object({
    offerId: z.string().trim().min(5).max(120),
    travelClass: z.enum(trainClassValues, { message: 'Choose a travel class' }),
    quota: z.enum(trainQuotaValues, { message: 'Choose a quota' }),
    passengers: z.array(trainPassengerSchema).min(1, 'Add at least one passenger').max(6, 'Up to 6 passengers per ticket'),
    contact: contactSchema,
    /** "Book only if confirmed berths are available" (when the provider supports it). */
    confirmOnly: z.boolean().default(false),
    /** Optional coupon made in the admin panel (Marketing → Coupons, valid on trains). */
    promoCode: z.string().trim().max(BUS_PROMO_MAX, `Promo code can be at most ${BUS_PROMO_MAX} characters`).optional(),
    /** The total the customer saw (after any coupon); if the fare moved, the API refuses with PRICE_CHANGED. */
    expectedTotalPaise: z.number().int().positive(),
  })
  .superRefine((b, ctx) => {
    for (const issue of trainPassengerRuleIssues(b)) ctx.addIssue({ code: 'custom', ...issue });
  });
export type BookTrainInput = z.output<typeof bookTrainSchema>;

/** Cancel some or all passengers of a train booking (passenger ids from the booking). */
export const cancelTrainSchema = z.object({
  passengerIds: z
    .array(z.string().trim().min(1).max(64))
    .min(1, 'Choose at least one passenger to cancel')
    .max(6)
    .refine((ids) => new Set(ids).size === ids.length, 'Each passenger once'),
});
export type CancelTrainInput = z.output<typeof cancelTrainSchema>;

/** Cancel a whole bus booking (buses are cancelled as one ticket). */
export const cancelBusSchema = z.object({
  reason: z.string().trim().max(200, 'Use at most 200 characters').optional(),
});
export type CancelBusInput = z.output<typeof cancelBusSchema>;
