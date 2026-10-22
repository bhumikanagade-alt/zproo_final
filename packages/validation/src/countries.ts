/**
 * Countries offered for phone numbers and travel documents on international flights.
 * `min`/`max` are the allowed digits of the national number (without the dial code); none exceeds
 * 10 so every booking form keeps the "no more than 10 digits" rule.
 */
export interface Country {
  /** ISO 3166-1 alpha-2 */
  code: string;
  name: string;
  /** International dial code without the plus sign */
  dial: string;
  flag: string;
  min: number;
  max: number;
}

export const COUNTRIES: readonly Country[] = [
  { code: 'IN', name: 'India', dial: '91', flag: '🇮🇳', min: 10, max: 10 },
  { code: 'AE', name: 'United Arab Emirates', dial: '971', flag: '🇦🇪', min: 9, max: 9 },
  { code: 'US', name: 'United States', dial: '1', flag: '🇺🇸', min: 10, max: 10 },
  { code: 'CA', name: 'Canada', dial: '1', flag: '🇨🇦', min: 10, max: 10 },
  { code: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧', min: 10, max: 10 },
  { code: 'AU', name: 'Australia', dial: '61', flag: '🇦🇺', min: 9, max: 9 },
  { code: 'SG', name: 'Singapore', dial: '65', flag: '🇸🇬', min: 8, max: 8 },
  { code: 'MY', name: 'Malaysia', dial: '60', flag: '🇲🇾', min: 9, max: 10 },
  { code: 'TH', name: 'Thailand', dial: '66', flag: '🇹🇭', min: 9, max: 9 },
  { code: 'ID', name: 'Indonesia', dial: '62', flag: '🇮🇩', min: 9, max: 10 },
  { code: 'LK', name: 'Sri Lanka', dial: '94', flag: '🇱🇰', min: 9, max: 9 },
  { code: 'NP', name: 'Nepal', dial: '977', flag: '🇳🇵', min: 10, max: 10 },
  { code: 'BD', name: 'Bangladesh', dial: '880', flag: '🇧🇩', min: 10, max: 10 },
  { code: 'MV', name: 'Maldives', dial: '960', flag: '🇲🇻', min: 7, max: 7 },
  { code: 'QA', name: 'Qatar', dial: '974', flag: '🇶🇦', min: 8, max: 8 },
  { code: 'SA', name: 'Saudi Arabia', dial: '966', flag: '🇸🇦', min: 9, max: 9 },
  { code: 'OM', name: 'Oman', dial: '968', flag: '🇴🇲', min: 8, max: 8 },
  { code: 'KW', name: 'Kuwait', dial: '965', flag: '🇰🇼', min: 8, max: 8 },
  { code: 'BH', name: 'Bahrain', dial: '973', flag: '🇧🇭', min: 8, max: 8 },
  { code: 'FR', name: 'France', dial: '33', flag: '🇫🇷', min: 9, max: 9 },
  { code: 'DE', name: 'Germany', dial: '49', flag: '🇩🇪', min: 10, max: 10 },
  { code: 'IT', name: 'Italy', dial: '39', flag: '🇮🇹', min: 9, max: 10 },
  { code: 'ES', name: 'Spain', dial: '34', flag: '🇪🇸', min: 9, max: 9 },
  { code: 'CH', name: 'Switzerland', dial: '41', flag: '🇨🇭', min: 9, max: 9 },
  { code: 'JP', name: 'Japan', dial: '81', flag: '🇯🇵', min: 10, max: 10 },
  { code: 'KR', name: 'South Korea', dial: '82', flag: '🇰🇷', min: 9, max: 10 },
  { code: 'HK', name: 'Hong Kong', dial: '852', flag: '🇭🇰', min: 8, max: 8 },
  { code: 'NZ', name: 'New Zealand', dial: '64', flag: '🇳🇿', min: 8, max: 10 },
  { code: 'ZA', name: 'South Africa', dial: '27', flag: '🇿🇦', min: 9, max: 9 },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [string, ...string[]];

export const getCountry = (code: string): Country | undefined =>
  COUNTRIES.find((c) => c.code === code);

export const isCountryCode = (code: string): boolean => getCountry(code) !== undefined;

export type PhoneResult =
  | { ok: true; e164: string; country: string; national: string }
  | { ok: false; message: string };

/** Keep only digits and cap at 10 — used to sanitise typing and pasting. */
export const sanitizeDigits = (value: string): string => value.replace(/\D/g, '').slice(0, 10);

/** Validates the national part of a number for one country. Returns an error message or undefined. */
export function nationalNumberError(country: Country, rawDigits: string): string | undefined {
  const digits = rawDigits.replace(/[\s-]/g, '');
  if (!digits) return 'Enter a mobile number';
  if (!/^\d+$/.test(digits)) return 'Mobile number can contain digits only';
  if (digits.length > 10) return 'Mobile number cannot be more than 10 digits';
  if (digits.length < country.min || digits.length > country.max) {
    return country.min === country.max
      ? `Enter a ${country.min}-digit mobile number for ${country.name}`
      : `Enter a ${country.min}–${country.max} digit mobile number for ${country.name}`;
  }
  if (country.code === 'IN' && !/^[6-9]/.test(digits)) {
    return 'Indian mobile numbers start with 6, 7, 8 or 9';
  }
  if (country.code !== 'IN' && digits.startsWith('0')) {
    return 'Do not start the number with 0';
  }
  if (/^(\d)\1+$/.test(digits)) return 'Enter a valid mobile number';
  return undefined;
}

/** Validates a number typed next to a chosen country and returns it as E.164 (`+919876543210`). */
export function parseNationalNumber(countryCode: string, input: string): PhoneResult {
  const country = getCountry(countryCode);
  if (!country) return { ok: false, message: 'Select a country code' };
  let digits = input.replace(/[\s-]/g, '');
  // Indian numbers pasted as 09876543210 or 919876543210.
  if (country.code === 'IN') digits = digits.replace(/^(91|0)(?=\d{10}$)/, '');
  const error = nationalNumberError(country, digits);
  if (error) return { ok: false, message: error };
  return { ok: true, e164: `+${country.dial}${digits}`, country: country.code, national: digits };
}

/**
 * Parses a full phone number. Numbers without a leading `+` are treated as Indian (so the older
 * `9876543210` form still works); `+<dial><digits>` is matched against the supported countries.
 */
export function parsePhone(raw: string): PhoneResult {
  const value = raw.trim().replace(/[\s-]/g, '');
  if (!value.startsWith('+')) return parseNationalNumber('IN', value);
  const digits = value.slice(1);
  if (!/^\d+$/.test(digits)) return { ok: false, message: 'Mobile number can contain digits only' };
  const candidates = COUNTRIES.filter((c) => digits.startsWith(c.dial)).sort(
    (a, b) => b.dial.length - a.dial.length,
  );
  let firstError = 'Enter a valid mobile number with a supported country code';
  for (const [i, country] of candidates.entries()) {
    const result = parseNationalNumber(country.code, digits.slice(country.dial.length));
    if (result.ok) return result;
    if (i === 0) firstError = result.message;
  }
  return { ok: false, message: firstError };
}

/** Splits a stored E.164 number into country + national digits for editing in a form. */
export function splitPhone(phone: string | undefined | null): { countryCode: string; national: string } {
  if (!phone) return { countryCode: 'IN', national: '' };
  const result = parsePhone(phone);
  if (result.ok) return { countryCode: result.country, national: result.national };
  return { countryCode: 'IN', national: phone.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10) };
}
