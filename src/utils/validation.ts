/**
 * ZPROO GO - shared form validation rules.
 * Every page (Login, Register, Passenger Details, Bus Search, Filters) imports from here,
 * so one rule is written once and behaves the same everywhere.
 *
 * Each `getXxxError` returns an error message, or "" when the value is valid.
 */

/* ------------------------------------------------------------------ */
/* Basic checks                                                         */
/* ------------------------------------------------------------------ */

/** Indian mobile: exactly 10 digits, first digit 6-9. */
export const isValidMobile = (value: string): boolean =>
  /^[6-9]\d{9}$/.test(value);

/** Simple email format check, max 254 characters. */
export const isValidEmail = (value: string): boolean => {
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/** Name: 2-80 characters, letters, spaces and ' . - only (must contain a letter). */
export const isValidName = (value: string): boolean => {
  const name = value.trim();
  return (
    name.length >= 2 &&
    name.length <= 80 &&
    /^[\p{L}\p{M}' .-]+$/u.test(name) &&
    /\p{L}/u.test(name)
  );
};

/** Password: at least 8 characters, with at least one letter and one number. */
export const isValidPassword = (value: string): boolean =>
  value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

/** OTP: exactly 6 digits. */
export const isValidOtp = (value: string): boolean => /^\d{6}$/.test(value);

/** Age: whole number from 1 to 120. */
export const isValidAge = (value: string): boolean =>
  /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 120;

/* ------------------------------------------------------------------ */
/* Messages                                                             */
/* ------------------------------------------------------------------ */

export const MOBILE_ERROR =
  "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.";
export const EMAIL_ERROR = "Enter a valid email address.";
export const OTP_ERROR = "Enter the 6-digit OTP.";
export const OTP_NOT_SENT_ERROR = "Please send the OTP first.";
export const PASSWORD_ERROR =
  "Password must be at least 8 characters and contain letters and numbers.";

export const getNameError = (value: string, label = "Name"): string => {
  const name = value.trim();
  if (!name) return `${label} is required`;
  if (name.length < 2) return `${label} must be at least 2 characters`;
  if (name.length > 80) return `${label} must be at most 80 characters`;
  if (!isValidName(value)) {
    return `${label} can contain only letters, spaces, ' . and -`;
  }
  return "";
};

export const getMobileError = (value: string, label = "Phone number"): string => {
  if (!value) return `${label} is required`;
  if (!isValidMobile(value)) {
    return `${label} must be 10 digits and start with 6, 7, 8 or 9`;
  }
  return "";
};

export const getEmailError = (value: string): string => {
  if (!value.trim()) return "Email is required";
  if (!isValidEmail(value)) return "Enter a valid email address";
  return "";
};

export const getAgeError = (value: string): string => {
  if (!value) return "Age is required";
  if (!isValidAge(value)) return "Enter a whole number from 1 to 120";
  return "";
};

/* ------------------------------------------------------------------ */
/* Bus search                                                           */
/* ------------------------------------------------------------------ */

export interface BusSearchErrors {
  from?: string;
  to?: string;
  date?: string;
}

/** Today as YYYY-MM-DD in the visitor's local time. */
export const todayIso = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/** Finds a city from the list, ignoring upper/lower case and extra spaces. */
export const findCity = (value: string, cityNames: string[]): string | undefined => {
  const wanted = value.trim().toLowerCase();
  return cityNames.find((city) => city.toLowerCase() === wanted);
};

export const validateBusSearch = (
  input: { from: string; to: string; date: string },
  cityNames: string[]
): BusSearchErrors => {
  const errors: BusSearchErrors = {};

  const from = findCity(input.from, cityNames);
  const to = findCity(input.to, cityNames);

  if (!input.from.trim()) {
    errors.from = "Please enter the departure city.";
  } else if (!from) {
    errors.from = "Please select the departure city from the list.";
  }

  if (!input.to.trim()) {
    errors.to = "Please enter the destination city.";
  } else if (!to) {
    errors.to = "Please select the destination city from the list.";
  }

  if (from && to && from === to) {
    errors.to = "From and To cities must be different.";
  }

  if (!input.date) {
    errors.date = "Please select the travel date.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.date = "Enter a valid travel date.";
  } else if (input.date < todayIso()) {
    errors.date = "Travel date cannot be in the past.";
  }

  return errors;
};

/* ------------------------------------------------------------------ */
/* Filters                                                              */
/* ------------------------------------------------------------------ */

/** Minimum price must not be greater than maximum price. */
export const isPriceRangeValid = (min: number, max: number): boolean =>
  min <= max;
