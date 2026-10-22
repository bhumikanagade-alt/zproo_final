import type { Currency } from '@zproo/types';

/**
 * All amounts are handled as integer minor units (paise for INR) to avoid floating-point
 * rounding errors in fares, taxes, refunds and wallet balances.
 */
export type MinorUnits = number;

export function toMinorUnits(major: number): MinorUnits {
  if (!Number.isFinite(major)) throw new RangeError('Amount must be a finite number');
  return Math.round(major * 100);
}

export function fromMinorUnits(minor: MinorUnits): number {
  assertMinorUnits(minor);
  return minor / 100;
}

export function assertMinorUnits(value: number): asserts value is MinorUnits {
  if (!Number.isSafeInteger(value))
    throw new RangeError('Amount in minor units must be an integer');
}

const formatters = new Map<string, Intl.NumberFormat>();

/** Formats minor units for display, e.g. `formatMoney(532000)` → `₹5,320`. */
export function formatMoney(
  minor: MinorUnits,
  currency: Currency = 'INR',
  { showDecimals = 'auto' }: { showDecimals?: 'auto' | 'always' | 'never' } = {},
): string {
  assertMinorUnits(minor);
  const hasFraction = minor % 100 !== 0;
  const decimals = showDecimals === 'always' || (showDecimals === 'auto' && hasFraction) ? 2 : 0;
  const key = `${currency}:${decimals}`;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(key, fmt);
  }
  return fmt.format(minor / 100);
}

/** Percentage of an amount in minor units, rounded half-up to the nearest minor unit. */
export function percentOf(minor: MinorUnits, percent: number): MinorUnits {
  assertMinorUnits(minor);
  return Math.round((minor * percent) / 100);
}
