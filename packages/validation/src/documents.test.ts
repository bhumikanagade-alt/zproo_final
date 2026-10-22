import { describe, expect, it } from 'vitest';
import {
  ID_INPUT_RULES,
  passengerSchema,
  sanitizeIdNumber,
  validateIdentityNumber,
  validatePassportNumber,
} from './booking';
import {
  documentVerification,
  overallDocumentStatus,
  type DocumentCheckPassenger,
} from './documents';

const TRAVEL = '2026-12-10';

const adult = (over: Partial<DocumentCheckPassenger> = {}): DocumentCheckPassenger => ({
  type: 'ADULT',
  firstName: 'Amit',
  lastName: 'Sharma',
  identityDocument: { type: 'AADHAAR', number: '234567890124', nationality: 'IN' },
  ...over,
});

const abroad = (over: Partial<NonNullable<DocumentCheckPassenger['travelDocument']>> = {}) =>
  adult({
    identityDocument: undefined,
    dateOfBirth: '1990-05-04',
    travelDocument: {
      nationality: 'IN',
      passportNumber: 'K1234567',
      passportIssuingCountry: 'IN',
      passportExpiry: '2032-01-01',
      visaType: 'TOURIST',
      visaNumber: 'V1234567',
      visaExpiry: '2027-12-31',
      ...over,
    },
  });

describe('identity numbers', () => {
  it('checks each ID type', () => {
    expect(validateIdentityNumber('AADHAAR', '2345 6789 0124')).toBeNull();
    expect(validateIdentityNumber('AADHAAR', '12345')).toMatch(/12-digit Aadhaar/);
    expect(validateIdentityNumber('PAN', 'ABCPE1234F')).toBeNull();
    expect(validateIdentityNumber('PAN', 'ABCPE12345')).toMatch(/PAN/);
    expect(validateIdentityNumber('VOTER_ID', 'ABC1234567')).toBeNull();
    expect(validateIdentityNumber('DRIVING_LICENCE', 'MH12 2011 0012345')).toBeNull();
    expect(validateIdentityNumber('PASSPORT', 'K1234567')).toBeNull();
    expect(validateIdentityNumber('AADHAAR', '')).toBe('Enter ID number');
  });

  it('is part of the passenger form rules', () => {
    const base = { type: 'ADULT', title: 'MR', firstName: 'Amit', lastName: 'Sharma', gender: 'MALE' };
    const bad = passengerSchema.safeParse({
      ...base,
      identityDocument: { type: 'PAN', number: 'nope', nationality: 'IN' },
    });
    expect(bad.success).toBe(false);
    const ok = passengerSchema.safeParse({
      ...base,
      identityDocument: { type: 'AADHAAR', number: '2345 6789 0124', nationality: 'IN' },
    });
    expect(ok.success).toBe(true);
    // ID is optional in the schema, so existing bookings still validate.
    expect(passengerSchema.safeParse(base).success).toBe(true);
  });
});

describe('stricter ID rules', () => {
  it('rejects an Aadhaar number that fails the checksum', () => {
    expect(validateIdentityNumber('AADHAAR', '234567890123')).toMatch(/valid 12-digit Aadhaar/);
    expect(validateIdentityNumber('AADHAAR', '134567890124')).toMatch(/valid 12-digit Aadhaar/);
    expect(validateIdentityNumber('AADHAAR', '345678901238')).toBeNull();
    expect(validateIdentityNumber('AADHAAR', '456789012341')).toBeNull();
  });

  it('checks the PAN holder type, the licence state code and repeated characters', () => {
    expect(validateIdentityNumber('PAN', 'ABCDE1234F')).toMatch(/valid PAN/);
    expect(validateIdentityNumber('PAN', 'ABCPE1234F')).toBeNull();
    expect(validateIdentityNumber('DRIVING_LICENCE', 'ZZ1220110012345')).toMatch(/state code/);
    expect(validateIdentityNumber('DRIVING_LICENCE', 'MH1220110012345')).toBeNull();
    expect(validateIdentityNumber('OTHER', '1111111')).toBe('Enter a valid ID number');
  });

  it('checks Indian passport numbers', () => {
    expect(validatePassportNumber('K1234567', 'IN')).toBeNull();
    expect(validatePassportNumber('Q1234567', 'IN')).toMatch(/Indian passport/);
    expect(validatePassportNumber('K0234567', 'IN')).toMatch(/Indian passport/);
    expect(validatePassportNumber('K1234560', 'IN')).toMatch(/Indian passport/);
    expect(validatePassportNumber('X1234567', 'IN')).toMatch(/Indian passport/);
    // Other countries use their own formats, so only the general shape is checked.
    expect(validatePassportNumber('123456789', 'US')).toBeNull();
    expect(validatePassportNumber('AB', 'US')).toMatch(/6–9/);
  });
});

describe('domestic document verification', () => {
  const opts = { international: false, travelDate: TRAVEL, today: '2026-10-09' };

  it('is verified when an adult has a valid ID', () => {
    const [check] = documentVerification([adult()], opts);
    expect(check?.status).toBe('VERIFIED');
  });

  it('is pending while the ID number is missing', () => {
    const [check] = documentVerification(
      [adult({ identityDocument: { type: 'AADHAAR', number: '', nationality: 'IN' } })],
      opts,
    );
    expect(check?.status).toBe('PENDING');
    expect(check?.missing[0]?.field).toBe('identityDocument.number');
  });

  it('needs action for a wrong number or a foreign national without a passport', () => {
    const [wrong] = documentVerification(
      [adult({ identityDocument: { type: 'PAN', number: 'ABC', nationality: 'IN' } })],
      opts,
    );
    expect(wrong?.status).toBe('ACTION_REQUIRED');
    const [foreign] = documentVerification(
      [adult({ identityDocument: { type: 'AADHAAR', number: '234567890124', nationality: 'US' } })],
      opts,
    );
    expect(foreign?.issues.some((i) => i.field === 'identityDocument.type')).toBe(true);
  });

  it('lets children and infants travel without an ID but asks for a date of birth', () => {
    const child: DocumentCheckPassenger = {
      type: 'CHILD',
      firstName: 'Riya',
      lastName: 'Sharma',
      dateOfBirth: '2020-03-01',
    };
    const [ok] = documentVerification([child], opts);
    expect(ok?.status).toBe('VERIFIED');
    expect(ok?.notes.length).toBeGreaterThan(0);
    const [noDob] = documentVerification([{ ...child, dateOfBirth: undefined }], opts);
    expect(noDob?.status).toBe('PENDING');
  });

  it('flags the same ID used twice', () => {
    const checks = documentVerification([adult(), adult({ firstName: 'Neha' })], opts);
    expect(checks.map((c) => c.status)).toEqual(['ACTION_REQUIRED', 'ACTION_REQUIRED']);
  });
});

describe('international document verification', () => {
  const opts = {
    international: true,
    travelDate: TRAVEL,
    lastTravelDate: '2026-12-20',
    today: '2026-10-09',
  };

  it('is verified with a valid passport and visa', () => {
    const [check] = documentVerification([abroad()], opts);
    expect(check?.status).toBe('VERIFIED');
  });

  it('needs action when the passport has under 6 months left', () => {
    const [check] = documentVerification([abroad({ passportExpiry: '2027-02-01' })], opts);
    expect(check?.status).toBe('ACTION_REQUIRED');
    expect(check?.issues[0]?.field).toBe('travelDocument.passportExpiry');
  });

  it('needs action when the visa expires before the last flight', () => {
    const [check] = documentVerification([abroad({ visaExpiry: '2026-12-15' })], opts);
    expect(check?.issues.some((i) => i.field === 'travelDocument.visaExpiry')).toBe(true);
  });

  it('checks optional issue dates', () => {
    const [check] = documentVerification(
      [abroad({ passportIssueDate: '2033-01-01', visaIssueDate: '2027-12-31' })],
      { ...opts, today: '2026-10-09' },
    );
    expect(check?.issues.map((i) => i.field)).toEqual([
      'travelDocument.passportIssueDate',
      'travelDocument.visaIssueDate',
    ]);
  });

  it('is pending while passport details are missing', () => {
    const [check] = documentVerification([abroad({ passportNumber: '' })], opts);
    expect(check?.status).toBe('PENDING');
  });

  it('uses the Indian passport rules for an Indian passport', () => {
    const [check] = documentVerification([abroad({ passportNumber: 'Q1234567' })], opts);
    expect(check?.issues[0]?.field).toBe('travelDocument.passportNumber');
  });

  it('reports an expired passport or visa against today', () => {
    const dated = { ...opts, today: '2026-10-09' };
    const [passport] = documentVerification([abroad({ passportExpiry: '2026-01-01' })], dated);
    expect(passport?.issues[0]?.message).toBe('This passport has expired');
    const [visa] = documentVerification([abroad({ visaExpiry: '2026-06-01' })], dated);
    expect(visa?.issues.some((i) => i.message === 'This visa has expired')).toBe(true);
  });

  it('checks issue dates against today, the date of birth and the 10-year limit', () => {
    const dated = { ...opts, today: '2026-10-09' };
    const future = documentVerification([abroad({ passportIssueDate: '2027-01-01' })], dated)[0];
    expect(future?.issues[0]?.message).toBe('Passport issue date cannot be in the future');
    const beforeBirth = documentVerification(
      [abroad({ passportIssueDate: '1980-01-01', passportExpiry: '1990-01-01' })],
      dated,
    )[0];
    expect(beforeBirth?.issues.some((i) => /before the date of birth/.test(i.message))).toBe(true);
    const tooLong = documentVerification(
      [abroad({ passportIssueDate: '2020-01-01', passportExpiry: '2032-01-01' })],
      dated,
    )[0];
    expect(tooLong?.issues.some((i) => /at most 10 years/.test(i.message))).toBe(true);
    const ok = documentVerification(
      [abroad({ passportIssueDate: '2022-01-01', passportExpiry: '2032-01-01' })],
      dated,
    )[0];
    expect(ok?.status).toBe('VERIFIED');
  });

  it('summarises a booking', () => {
    const verified = documentVerification([abroad()], opts);
    const pending = documentVerification([abroad({ passportNumber: '' })], opts);
    const action = documentVerification([abroad({ passportExpiry: '2027-02-01' })], opts);
    expect(overallDocumentStatus(verified)).toBe('VERIFIED');
    expect(overallDocumentStatus([...verified, ...pending])).toBe('PENDING');
    expect(overallDocumentStatus([...verified, ...pending, ...action])).toBe('ACTION_REQUIRED');
    expect(overallDocumentStatus([])).toBe('PENDING');
  });
});

describe('stricter document checks', () => {
  const dom = { international: false, travelDate: TRAVEL, today: '2026-10-09' };
  const intl = {
    international: true,
    travelDate: TRAVEL,
    lastTravelDate: '2026-12-20',
    today: '2026-10-09',
  };

  it('checks traveller names the same way the form does', () => {
    const bad = (firstName: string) => documentVerification([adult({ firstName })], dom)[0];
    expect(bad('Am1t')?.issues[0]).toEqual({ field: 'firstName', message: 'Use letters and spaces only' });
    expect(bad('A')?.issues[0]?.message).toMatch(/single letter/);
    expect(bad('aaaa')?.issues[0]?.message).toBe('Enter a valid first name');
    expect(bad('A'.repeat(41))?.issues[0]?.message).toBe('First name is too long');
    expect(bad('Amit Kumar')?.status).toBe('VERIFIED');
  });

  it('refuses an impossible, future or too old date of birth', () => {
    const dob = (dateOfBirth: string) =>
      documentVerification([adult({ dateOfBirth })], dom)[0]?.issues[0]?.message;
    expect(dob('1990-02-31')).toBe('Enter a valid date of birth');
    expect(dob('05/04/1990')).toBe('Enter a valid date of birth');
    expect(dob('2026-12-01')).toBe('Date of birth cannot be in the future');
    expect(dob('1900-01-01')).toBe('Date of birth cannot be accepted');
    expect(dob('1990-05-04')).toBeUndefined();
  });

  it('needs an ID type once a child or infant gives an ID number', () => {
    const child: DocumentCheckPassenger = {
      type: 'CHILD',
      firstName: 'Riya',
      lastName: 'Sharma',
      dateOfBirth: '2020-03-01',
      identityDocument: { type: '', number: '234567890124', nationality: 'IN' },
    };
    const [check] = documentVerification([child], dom);
    expect(check?.status).toBe('PENDING');
    expect(check?.missing[0]?.field).toBe('identityDocument.type');
  });

  it('checks the nationality on a domestic ID', () => {
    const withNationality = (nationality: string) =>
      documentVerification(
        [adult({ identityDocument: { type: 'PASSPORT', number: 'K1234567', nationality } })],
        dom,
      )[0];
    expect(withNationality('ZZ')?.issues[0]).toEqual({
      field: 'identityDocument.nationality',
      message: 'Select a valid nationality',
    });
    expect(withNationality('')?.missing[0]?.field).toBe('identityDocument.nationality');
    expect(withNationality('IN')?.status).toBe('VERIFIED');
  });

  it('refuses unknown countries and visa types', () => {
    const [check] = documentVerification(
      [abroad({ nationality: 'ZZ', passportIssuingCountry: 'QQ', visaType: 'HOLIDAY' })],
      intl,
    );
    expect(check?.status).toBe('ACTION_REQUIRED');
    expect(check?.issues.map((i) => i.field)).toEqual([
      'travelDocument.nationality',
      'travelDocument.passportIssuingCountry',
      'travelDocument.visaType',
    ]);
  });

  it('refuses dates that are not real calendar dates', () => {
    const [check] = documentVerification(
      [abroad({ passportExpiry: '2032-02-30', visaExpiry: 'soon' })],
      intl,
    );
    expect(check?.issues.map((i) => i.message)).toEqual([
      'Enter a valid passport expiry date',
      'Enter a valid visa expiry date',
    ]);
  });

  it('checks the visa number, entry type and travel authorisation number', () => {
    const issues = (over: Parameters<typeof abroad>[0]) =>
      documentVerification([abroad(over)], intl)[0]?.issues.map((i) => i.field) ?? [];
    expect(issues({ visaNumber: 'V12' })).toEqual(['travelDocument.visaNumber']);
    expect(issues({ visaNumber: '1111111' })).toEqual(['travelDocument.visaNumber']);
    expect(issues({ visaNumber: 'V-123 4567' })).toEqual([]);
    expect(issues({ visaEntryType: 'TRIPLE' })).toEqual(['travelDocument.visaEntryType']);
    expect(issues({ visaEntryType: 'MULTIPLE' })).toEqual([]);
    expect(issues({ travelAuthorisationNumber: '#!' })).toEqual([
      'travelDocument.travelAuthorisationNumber',
    ]);
    expect(issues({ travelAuthorisationNumber: 'ETA-12345' })).toEqual([]);
  });
});

describe('ID number entry rules', () => {
  it('accepts exactly 12 digits for an Aadhaar number, and says what is wrong otherwise', () => {
    expect(validateIdentityNumber('AADHAAR', '234567890124')).toBeNull();
    expect(validateIdentityNumber('AADHAAR', '2345 6789 0124')).toBeNull();
    expect(validateIdentityNumber('AADHAAR', '23456789012A')).toMatch(/digits only/);
    expect(validateIdentityNumber('AADHAAR', '2345678901')).toMatch(/you entered 10 digits/);
    expect(validateIdentityNumber('AADHAAR', '2345678901245')).toMatch(/you entered 13 digits/);
    expect(validateIdentityNumber('AADHAAR', '034567890124')).toMatch(/cannot start with 0 or 1/);
    expect(validateIdentityNumber('AADHAAR', '234567890123')).toMatch(/valid 12-digit Aadhaar/);
  });

  it('keeps only what each ID type accepts while typing', () => {
    expect(sanitizeIdNumber('AADHAAR', '2345 6789 0124')).toBe('234567890124');
    expect(sanitizeIdNumber('AADHAAR', 'ab2345x6789012499')).toBe('234567890124');
    expect(sanitizeIdNumber('PAN', 'abcpe1234f99')).toBe('ABCPE1234F');
    expect(sanitizeIdNumber('PAN', '12abcpe1234f')).toBe('ABCPE1234F');
    expect(sanitizeIdNumber('VOTER_ID', 'abc-1234567')).toBe('ABC1234567');
    expect(sanitizeIdNumber('DRIVING_LICENCE', 'mh12 2011 0012345')).toBe('MH1220110012345');
    expect(sanitizeIdNumber('PASSPORT', 'k123 4567')).toBe('K1234567');
    expect(sanitizeIdNumber('OTHER', 'ab-12 cd#34')).toBe('AB12CD34');
  });

  it('never lets a typed number pass its ID type length', () => {
    expect(ID_INPUT_RULES.AADHAAR).toEqual({ maxLength: 12, inputMode: 'numeric' });
    expect(sanitizeIdNumber('PASSPORT', 'A'.repeat(30)).length).toBe(9);
    expect(sanitizeIdNumber('OTHER', 'A'.repeat(30)).length).toBe(20);
  });
});

describe('traveller checks', () => {
  const dom = { international: false, travelDate: TRAVEL, today: '2026-10-09' };

  it('refuses placeholder names', () => {
    for (const name of ['Test', 'qwerty', 'Mr', 'Unknown']) {
      const [check] = documentVerification([adult({ firstName: name })], dom);
      expect(check?.issues[0]?.message).toBe('Enter a valid first name');
    }
  });

  it('flags a traveller entered twice with the same name and date of birth', () => {
    const dob = '1990-05-04';
    const ids = [
      { type: 'AADHAAR', number: '234567890124', nationality: 'IN' },
      { type: 'AADHAAR', number: '345678901238', nationality: 'IN' },
    ];
    const checks = documentVerification(
      [
        adult({ dateOfBirth: dob, identityDocument: ids[0] }),
        adult({ dateOfBirth: dob, identityDocument: ids[1] }),
      ],
      dom,
    );
    expect(checks.map((c) => c.status)).toEqual(['ACTION_REQUIRED', 'ACTION_REQUIRED']);
    expect(checks[0]?.issues[0]?.message).toBe('Two travellers have the same name and date of birth');
    const other = documentVerification(
      [
        adult({ dateOfBirth: dob, identityDocument: ids[0] }),
        adult({ firstName: 'Neha', dateOfBirth: dob, identityDocument: ids[1] }),
      ],
      dom,
    );
    expect(other.map((c) => c.status)).toEqual(['VERIFIED', 'VERIFIED']);
  });

  it('requires the title to match the gender', () => {
    const base = { type: 'ADULT', firstName: 'Amit', lastName: 'Sharma' };
    const mismatch = passengerSchema.safeParse({ ...base, title: 'MR', gender: 'FEMALE' });
    expect(mismatch.success).toBe(false);
    expect(passengerSchema.safeParse({ ...base, title: 'MRS', gender: 'MALE' }).success).toBe(false);
    expect(passengerSchema.safeParse({ ...base, title: 'MS', gender: 'FEMALE' }).success).toBe(true);
    expect(passengerSchema.safeParse({ ...base, title: 'MR', gender: 'OTHER' }).success).toBe(true);
  });
});
