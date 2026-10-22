import {
  addMonthsIso,
  FLIGHT_FIRST_NAME_MAX,
  FLIGHT_LAST_NAME_MAX,
  ID_TYPES,
  isDobRequired,
  isJunkName,
  MIN_BIRTH_DATE,
  normalizeIdNumber,
  passengerAgeIssues,
  validateIdentityNumber,
  validatePassportNumber,
  VISA_ENTRY_TYPES,
  VISA_TYPES,
  type IdType,
  type PassengerInput,
} from './booking';
import { isCountryCode } from './countries';

/** Where a traveller's document check stands. */
export type DocumentStatus = 'PENDING' | 'VERIFIED' | 'ACTION_REQUIRED';

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  ACTION_REQUIRED: 'Action required',
};

/** What the document check reads: the traveller form as typed, so every field may be missing. */
export interface DocumentCheckPassenger {
  type: 'ADULT' | 'CHILD' | 'INFANT';
  firstName?: string | undefined;
  lastName?: string | undefined;
  dateOfBirth?: string | undefined;
  identityDocument?:
    | {
        type?: string | undefined;
        number?: string | undefined;
        nationality?: string | undefined;
      }
    | undefined;
  travelDocument?:
    | {
        nationality?: string | undefined;
        passportNumber?: string | undefined;
        passportIssuingCountry?: string | undefined;
        passportIssueDate?: string | undefined;
        passportExpiry?: string | undefined;
        visaType?: string | undefined;
        visaNumber?: string | undefined;
        visaIssueDate?: string | undefined;
        visaExpiry?: string | undefined;
        visaEntryType?: string | undefined;
        travelAuthorisationNumber?: string | undefined;
      }
    | undefined;
}

/** A problem with a field, or a field still to be filled. `field` is relative to the passenger. */
export interface DocumentIssue {
  field: string;
  message: string;
}

export interface DocumentCheck {
  status: DocumentStatus;
  /** Wrong or expired details: the status is "Action required". */
  issues: DocumentIssue[];
  /** Details still to be entered: the status is "Pending". */
  missing: DocumentIssue[];
  /** Things to carry or be aware of; they never change the status. */
  notes: string[];
}

export interface DocumentCheckOptions {
  international: boolean;
  /** Departure date of the first flight, YYYY-MM-DD */
  travelDate: string;
  /** Departure date of the last flight (defaults to `travelDate`) */
  lastTravelDate?: string | undefined;
  /** Today, YYYY-MM-DD (defaults to today in India). Documents are checked against it. */
  today?: string | undefined;
}

const text = (value: string | undefined) => (value ?? '').trim();

/** Today's date in India, YYYY-MM-DD. */
const todayInIndia = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

const isIdType = (value: string | undefined): value is IdType =>
  (ID_TYPES as readonly string[]).includes(value ?? '');

/** A real calendar date written as YYYY-MM-DD (so 2026-02-31 and 12/05/2026 are refused). */
const isRealDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/** `null` when a traveller's name is acceptable, otherwise the message to show (same rules as the form). */
function nameProblem(label: string, value: string, maxLength = 40): string | null {
  if (value.length > maxLength) return `${label[0]?.toUpperCase()}${label.slice(1)} is too long`;
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(value)) return 'Use letters and spaces only';
  if ((value.split(' ')[0] ?? '').length < 2) return `Enter a full ${label}, not a single letter`;
  if (/^([A-Za-z])\1+$/i.test(value.replace(/ /g, '')) || isJunkName(value)) {
    return `Enter a valid ${label}`;
  }
  return null;
}

/** Overall status for a booking: any problem wins, then anything pending. */
export function overallDocumentStatus(checks: DocumentCheck[]): DocumentStatus {
  if (checks.some((c) => c.status === 'ACTION_REQUIRED')) return 'ACTION_REQUIRED';
  if (checks.length === 0 || checks.some((c) => c.status === 'PENDING')) return 'PENDING';
  return 'VERIFIED';
}

/**
 * Checks every traveller's identity documents and returns one result each.
 *
 * Domestic: adults need a government photo ID in the right format; children and infants may only
 * need proof of age; a foreign national can only use a passport.
 * International: passport details, a passport valid 6 months after the last flight, a visa valid
 * on arrival, and sensible issue dates.
 *
 * "Verified" means the details are complete and consistent. It is not a guarantee of boarding or
 * entry: the airline and the destination's immigration authority make those decisions.
 */
export function documentVerification(
  passengers: DocumentCheckPassenger[],
  options: DocumentCheckOptions,
): DocumentCheck[] {
  const { international, travelDate } = options;
  const lastTravelDate = options.lastTravelDate ?? travelDate;
  const today = options.today ?? todayInIndia();
  const passportMin = addMonthsIso(lastTravelDate, 6);

  // The same ID or passport number cannot belong to two travellers.
  const owners = new Map<string, number>();
  const keyOf = (p: DocumentCheckPassenger): string => {
    if (international) {
      const n = normalizeIdNumber(text(p.travelDocument?.passportNumber));
      return n ? `PASSPORT:${n}` : '';
    }
    const n = normalizeIdNumber(text(p.identityDocument?.number));
    return n ? `${text(p.identityDocument?.type)}:${n}` : '';
  };
  for (const p of passengers) {
    const key = keyOf(p);
    if (key) owners.set(key, (owners.get(key) ?? 0) + 1);
  }

  // The same name and date of birth cannot belong to two travellers (a repeated entry).
  const personKey = (p: DocumentCheckPassenger): string =>
    text(p.firstName) && text(p.lastName) && p.dateOfBirth
      ? `${text(p.firstName)}|${text(p.lastName)}|${p.dateOfBirth}`.toLowerCase()
      : '';
  const people = new Map<string, number>();
  for (const p of passengers) {
    const key = personKey(p);
    if (key) people.set(key, (people.get(key) ?? 0) + 1);
  }

  return passengers.map((p) => {
    const issues: DocumentIssue[] = [];
    const missing: DocumentIssue[] = [];
    const notes: string[] = [];

    // Name and date of birth (the form's own rules show the detailed messages).
    if (!text(p.firstName)) missing.push({ field: 'firstName', message: 'Enter first name' });
    if (!text(p.lastName)) missing.push({ field: 'lastName', message: 'Enter last name' });
    for (const [field, label, value, maxLength] of [
      ['firstName', 'first name', p.firstName, FLIGHT_FIRST_NAME_MAX],
      ['lastName', 'last name', p.lastName, FLIGHT_LAST_NAME_MAX],
    ] as const) {
      const message = text(value) ? nameProblem(label, text(value), maxLength) : null;
      if (message) issues.push({ field, message });
    }
    const dobRequired = isDobRequired(p.type, international);
    if (!p.dateOfBirth && dobRequired) {
      missing.push({ field: 'dateOfBirth', message: 'Enter date of birth' });
    }
    if (p.dateOfBirth) {
      if (!isRealDate(p.dateOfBirth)) {
        issues.push({ field: 'dateOfBirth', message: 'Enter a valid date of birth' });
      } else if (p.dateOfBirth > today) {
        issues.push({ field: 'dateOfBirth', message: 'Date of birth cannot be in the future' });
      } else if (p.dateOfBirth < MIN_BIRTH_DATE) {
        issues.push({ field: 'dateOfBirth', message: 'Date of birth cannot be accepted' });
      } else {
        for (const issue of passengerAgeIssues(
          [{ type: p.type, dateOfBirth: p.dateOfBirth } as PassengerInput],
          travelDate,
        )) {
          issues.push({ field: 'dateOfBirth', message: issue.message });
        }
      }
    }

    if (international) {
      const d = p.travelDocument ?? {};
      const required: [string, string | undefined, string][] = [
        ['travelDocument.nationality', d.nationality, 'Select nationality'],
        ['travelDocument.passportNumber', d.passportNumber, 'Enter passport number'],
        ['travelDocument.passportIssuingCountry', d.passportIssuingCountry, 'Select passport issuing country'],
        ['travelDocument.passportExpiry', d.passportExpiry, 'Enter passport expiry date'],
        ['travelDocument.visaType', d.visaType, 'Choose a visa type'],
        ['travelDocument.visaNumber', d.visaNumber, 'Enter visa number'],
        ['travelDocument.visaExpiry', d.visaExpiry, 'Enter visa expiry date'],
      ];
      for (const [field, value, message] of required) {
        if (!text(value)) missing.push({ field, message });
      }

      // Country, visa type and date fields must hold real values, not just something.
      if (d.nationality && !isCountryCode(d.nationality)) {
        issues.push({ field: 'travelDocument.nationality', message: 'Select a valid nationality' });
      }
      if (d.passportIssuingCountry && !isCountryCode(d.passportIssuingCountry)) {
        issues.push({
          field: 'travelDocument.passportIssuingCountry',
          message: 'Select a valid passport issuing country',
        });
      }
      if (d.visaType && !(VISA_TYPES as readonly string[]).includes(d.visaType)) {
        issues.push({ field: 'travelDocument.visaType', message: 'Choose a valid visa type' });
      }
      const dateField = (field: string, label: string, value: string | undefined) => {
        if (!value) return undefined;
        if (isRealDate(value)) return value;
        issues.push({ field: `travelDocument.${field}`, message: `Enter a valid ${label}` });
        return undefined;
      };
      const passportExpiry = dateField('passportExpiry', 'passport expiry date', d.passportExpiry);
      const visaExpiry = dateField('visaExpiry', 'visa expiry date', d.visaExpiry);
      const passportIssueDate = dateField('passportIssueDate', 'passport issue date', d.passportIssueDate);
      const visaIssueDate = dateField('visaIssueDate', 'visa issue date', d.visaIssueDate);

      const passport = normalizeIdNumber(text(d.passportNumber));
      if (passport) {
        const message = validatePassportNumber(passport, d.passportIssuingCountry);
        if (message) issues.push({ field: 'travelDocument.passportNumber', message });
      }
      const visa = normalizeIdNumber(text(d.visaNumber));
      if (visa) {
        if (!/^[A-Z0-9]{6,15}$/.test(visa)) {
          issues.push({
            field: 'travelDocument.visaNumber',
            message: 'Visa number must be 6–15 letters or digits',
          });
        } else if (/^(.)\1+$/.test(visa)) {
          issues.push({ field: 'travelDocument.visaNumber', message: 'Enter a valid visa number' });
        }
      }
      if (passportExpiry) {
        if (passportExpiry < today) {
          issues.push({ field: 'travelDocument.passportExpiry', message: 'This passport has expired' });
        } else if (passportExpiry < passportMin) {
          issues.push({
            field: 'travelDocument.passportExpiry',
            message: 'Passport must be valid for at least 6 months after your return/last flight',
          });
        }
      }
      if (visaExpiry) {
        if (visaExpiry < today) {
          issues.push({ field: 'travelDocument.visaExpiry', message: 'This visa has expired' });
        } else if (visaExpiry < lastTravelDate) {
          issues.push({
            field: 'travelDocument.visaExpiry',
            message: 'Visa must be valid on your travel date',
          });
        }
      }
      if (passportIssueDate) {
        if (passportIssueDate > today) {
          issues.push({
            field: 'travelDocument.passportIssueDate',
            message: 'Passport issue date cannot be in the future',
          });
        } else if (passportExpiry && passportIssueDate >= passportExpiry) {
          issues.push({
            field: 'travelDocument.passportIssueDate',
            message: 'Passport issue date must be before its expiry date',
          });
        } else if (p.dateOfBirth && passportIssueDate < p.dateOfBirth) {
          issues.push({
            field: 'travelDocument.passportIssueDate',
            message: 'Passport issue date cannot be before the date of birth',
          });
        } else if (
          passportExpiry &&
          d.passportIssuingCountry === 'IN' &&
          passportExpiry > addMonthsIso(passportIssueDate, 120)
        ) {
          issues.push({
            field: 'travelDocument.passportExpiry',
            message: 'An Indian passport is valid for at most 10 years from its issue date',
          });
        }
      }
      if (visaIssueDate) {
        if (visaIssueDate > today) {
          issues.push({
            field: 'travelDocument.visaIssueDate',
            message: 'Visa issue date cannot be in the future',
          });
        } else if (visaExpiry && visaIssueDate >= visaExpiry) {
          issues.push({
            field: 'travelDocument.visaIssueDate',
            message: 'Visa issue date must be before its expiry date',
          });
        }
      }
      if (d.visaEntryType && !(VISA_ENTRY_TYPES as readonly string[]).includes(d.visaEntryType)) {
        issues.push({ field: 'travelDocument.visaEntryType', message: 'Choose a valid entry type' });
      }
      const authorisation = text(d.travelAuthorisationNumber).toUpperCase();
      if (authorisation && !/^[A-Z0-9-]{4,25}$/.test(authorisation)) {
        issues.push({
          field: 'travelDocument.travelAuthorisationNumber',
          message: 'Enter a valid authorisation number',
        });
      }
      if (p.type === 'INFANT' || p.type === 'CHILD') {
        notes.push('Children and infants travel on their own passport.');
      }
    } else {
      const id = p.identityDocument;
      const number = normalizeIdNumber(text(id?.number));
      const type = isIdType(id?.type) ? id.type : undefined;

      if (p.type === 'ADULT') {
        if (!type) missing.push({ field: 'identityDocument.type', message: 'Choose an ID type' });
        if (!number) missing.push({ field: 'identityDocument.number', message: 'Enter ID number' });
      }
      if (p.type !== 'ADULT' && number && !type) {
        missing.push({ field: 'identityDocument.type', message: 'Choose an ID type' });
      }
      if (id && !text(id.nationality)) {
        missing.push({ field: 'identityDocument.nationality', message: 'Select nationality' });
      } else if (id?.nationality && !isCountryCode(id.nationality)) {
        issues.push({ field: 'identityDocument.nationality', message: 'Select a valid nationality' });
      }
      if (type && number) {
        const message =
          type === 'PASSPORT'
            ? validatePassportNumber(number, id?.nationality === 'IN' ? 'IN' : undefined)
            : validateIdentityNumber(type, number);
        if (message) issues.push({ field: 'identityDocument.number', message });
      }
      if (id?.nationality && id.nationality !== 'IN' && type && type !== 'PASSPORT') {
        issues.push({
          field: 'identityDocument.type',
          message: 'Foreign nationals must use a passport on domestic flights',
        });
      }
      if (p.type === 'INFANT') {
        notes.push('Carry the infant’s birth certificate as proof of age.');
      } else if (p.type === 'CHILD') {
        notes.push('Carry proof of age or identity, such as a birth certificate or school ID card.');
      }
    }

    // Same number on two travellers.
    const key = keyOf(p);
    if (key && (owners.get(key) ?? 0) > 1) {
      issues.push({
        field: international ? 'travelDocument.passportNumber' : 'identityDocument.number',
        message: international
          ? 'Each traveller needs their own passport number'
          : 'Each traveller needs their own ID number',
      });
    }

    const person = personKey(p);
    if (person && (people.get(person) ?? 0) > 1) {
      issues.push({
        field: 'dateOfBirth',
        message: 'Two travellers have the same name and date of birth',
      });
    }

    const status: DocumentStatus =
      issues.length > 0 ? 'ACTION_REQUIRED' : missing.length > 0 ? 'PENDING' : 'VERIFIED';
    return { status, issues, missing, notes };
  });
}
