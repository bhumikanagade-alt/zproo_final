/**
 * Mock flight pricing lives in @zproo/catalog (shared with the static website); the price
 * breakdown lives in @zproo/utils (shared with the web app).
 */
export { quoteFare, unitHash, type FareInputs, type FareQuote } from '@zproo/catalog';
export { flightPriceBreakdown, offerTotal } from '@zproo/utils';
export type { PaxCounts } from '@zproo/types';
