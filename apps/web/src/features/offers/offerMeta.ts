import type { OfferItem, OfferService } from './offersData';

export type OfferType = 'New user' | 'App only' | 'Limited time' | 'Everyday';
export const OFFER_TYPES: readonly ('All types' | OfferType)[] = [
  'All types',
  'New user',
  'App only',
  'Limited time',
  'Everyday',
];

export interface OfferMeta {
  type: OfferType;
  /** Human readable expiry, e.g. "31 Dec 2026". */
  validTill: string;
  /** Sort key (YYYYMMDD). */
  validKey: number;
  endsSoon?: boolean;
  minSpend: string;
  terms: string[];
}

const COMMON = 'ZPROO may modify or withdraw this offer at any time without prior notice.';

export const OFFER_META: Record<string, OfferMeta> = {
  FIRSTFLIGHT: { type: 'New user', validTill: '31 Dec 2026', validKey: 20261231, minSpend: '₹4,000', terms: ['Valid on your first domestic flight booking only.', 'Minimum fare ₹4,000 (base fare + taxes).', 'Not combinable with other coupons.', COMMON] },
  FLYMORE12: { type: 'Everyday', validTill: '31 Jan 2027', validKey: 20270131, minSpend: '₹3,000', terms: ['Maximum discount ₹1,200 per booking.', 'Valid on selected airlines only.', COMMON] },
  SKY1000: { type: 'Limited time', validTill: '31 Oct 2026', validKey: 20261031, endsSoon: true, minSpend: '₹25,000', terms: ['International itineraries on selected routes.', 'Minimum fare ₹25,000.', COMMON] },
  BUS100: { type: 'Everyday', validTill: '31 Dec 2026', validKey: 20261231, minSpend: '₹500', terms: ['Minimum booking value ₹500.', 'Usable twice per user.', 'Valid on eligible operators and routes.', COMMON] },
  ZPROO10: { type: 'App only', validTill: '30 Nov 2026', validKey: 20261130, minSpend: '₹400', terms: ['Valid on bookings made through the ZPROO app.', 'Applies to eligible bus bookings.', COMMON] },
  ZPROO20: { type: 'Limited time', validTill: '25 Oct 2026', validKey: 20261025, endsSoon: true, minSpend: '₹600', terms: ['Maximum discount applies per booking.', 'Valid on eligible ZPROO bus bookings.', COMMON] },
  BUS250: { type: 'Limited time', validTill: '15 Nov 2026', validKey: 20261115, minSpend: '₹1,200', terms: ['Valid on selected routes only.', 'Minimum booking value ₹1,200.', COMMON] },
  HOTEL10: { type: 'Everyday', validTill: '31 Dec 2026', validKey: 20261231, minSpend: '₹3,000', terms: ['Up to ₹1,500 off.', 'Stays of 2 or more nights.', COMMON] },
  STAY400: { type: 'Everyday', validTill: '31 Jan 2027', validKey: 20270131, minSpend: '₹3,000', terms: ['Weekend check-ins only.', 'Minimum booking value ₹3,000.', COMMON] },
  LUXE25: { type: 'Limited time', validTill: '20 Oct 2026', validKey: 20261020, endsSoon: true, minSpend: '₹8,000', terms: ['Selected 4 & 5-star hotels.', 'Maximum discount ₹3,000.', COMMON] },
  CAB150: { type: 'Everyday', validTill: '31 Dec 2026', validKey: 20261231, minSpend: '₹1,500', terms: ['Outstation rides above ₹1,500.', COMMON] },
  RIDE15: { type: 'App only', validTill: '30 Nov 2026', validKey: 20261130, minSpend: '₹500', terms: ['Airport pickups and drops only.', 'Maximum discount ₹200.', COMMON] },
  RAIL50: { type: 'Everyday', validTill: '31 Dec 2026', validKey: 20261231, minSpend: '₹0', terms: ['Applies to the convenience fee on train bookings.', COMMON] },
  HOLIDAY2K: { type: 'Limited time', validTill: '30 Nov 2026', validKey: 20261130, minSpend: '₹20,000', terms: ['Packages above ₹20,000.', 'Selected destinations only.', COMMON] },
  PARCEL10: { type: 'Everyday', validTill: '31 Dec 2026', validKey: 20261231, minSpend: '₹0', terms: ['Applies to the delivery charge and handling fees.', COMMON] },
  SHIP20: { type: 'New user', validTill: '31 Dec 2026', validKey: 20261231, minSpend: '₹200', terms: ['First parcel order only.', 'Same-day intercity delivery.', COMMON] },
  WELCOME500: { type: 'New user', validTill: '31 Dec 2026', validKey: 20261231, minSpend: '₹2,000', terms: ['Valid on any service for new users.', 'Minimum spend ₹2,000.', COMMON] },
};

const FALLBACK: OfferMeta = {
  type: 'Everyday',
  validTill: '31 Dec 2026',
  validKey: 20261231,
  minSpend: '₹0',
  terms: [COMMON],
};

export function metaFor(offer: OfferItem): OfferMeta {
  return OFFER_META[offer.code] ?? FALLBACK;
}

export const SERVICE_PATH: Record<OfferService | 'all', string> = {
  all: '/',
  flights: '/flights',
  buses: '/buses',
  hotels: '/hotels',
  cabs: '/cabs',
  trains: '/trains',
  holidays: '/holidays',
  parcel: '/parcel',
};
