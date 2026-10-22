/*
 * Domain enums shared by the web app and API. Values that are persisted also exist as
 * Prisma enums; apps/api has a test asserting both stay identical.
 */

export const RoleName = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPPORT: 'SUPPORT',
  OPERATOR: 'OPERATOR',
  DRIVER: 'DRIVER',
  HOTEL_PARTNER: 'HOTEL_PARTNER',
  TRAVEL_PARTNER: 'TRAVEL_PARTNER',
  CORPORATE_ADMIN: 'CORPORATE_ADMIN',
} as const;
export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const ServiceType = {
  FLIGHT: 'FLIGHT',
  BUS: 'BUS',
  TRAIN: 'TRAIN',
  HOTEL: 'HOTEL',
  CAB: 'CAB',
  BIKE: 'BIKE',
  HOLIDAY: 'HOLIDAY',
  PARCEL: 'PARCEL',
} as const;
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const BookingStatus = {
  INITIATED: 'INITIATED',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  /**
   * Paid (gateway signature verified) and waiting for the supplier to confirm the reservation.
   * Used by services whose supplier books only after payment (trains); the booking becomes
   * CONFIRMED once the supplier issues a PNR, or REFUND_PENDING if it refuses.
   */
  PROCESSING: 'PROCESSING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const PaymentStatus = {
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const Currency = {
  INR: 'INR',
  USD: 'USD',
  AED: 'AED',
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const CabinClass = {
  ECONOMY: 'ECONOMY',
  PREMIUM_ECONOMY: 'PREMIUM_ECONOMY',
  BUSINESS: 'BUSINESS',
  FIRST: 'FIRST',
} as const;
export type CabinClass = (typeof CabinClass)[keyof typeof CabinClass];

export const CABIN_CLASS_LABELS: Record<CabinClass, string> = {
  ECONOMY: 'Economy',
  PREMIUM_ECONOMY: 'Premium Economy',
  BUSINESS: 'Business',
  FIRST: 'First',
};

/** Indian Railways reserved classes of travel. */
export const TrainClass = {
  '1A': '1A',
  '2A': '2A',
  '3A': '3A',
  '3E': '3E',
  SL: 'SL',
  CC: 'CC',
  EC: 'EC',
  '2S': '2S',
} as const;
export type TrainClass = (typeof TrainClass)[keyof typeof TrainClass];

export const TRAIN_CLASS_LABELS: Record<TrainClass, string> = {
  '1A': 'AC First Class (1A)',
  '2A': 'AC 2 Tier (2A)',
  '3A': 'AC 3 Tier (3A)',
  '3E': 'AC 3 Economy (3E)',
  SL: 'Sleeper (SL)',
  CC: 'AC Chair Car (CC)',
  EC: 'Executive Chair Car (EC)',
  '2S': 'Second Sitting (2S)',
};

/** Reservation quotas. A provider declares which ones it can sell (TrainCapabilities.quotas). */
export const TrainQuota = {
  GN: 'GN',
  TQ: 'TQ',
  LD: 'LD',
  SS: 'SS',
  PT: 'PT',
} as const;
export type TrainQuota = (typeof TrainQuota)[keyof typeof TrainQuota];

export const TRAIN_QUOTA_LABELS: Record<TrainQuota, string> = {
  GN: 'General',
  TQ: 'Tatkal',
  LD: 'Ladies',
  SS: 'Lower berth / Senior citizen',
  PT: 'Premium Tatkal',
};

export const TripType = {
  ONE_WAY: 'ONE_WAY',
  ROUND_TRIP: 'ROUND_TRIP',
  MULTI_CITY: 'MULTI_CITY',
} as const;
export type TripType = (typeof TripType)[keyof typeof TripType];
