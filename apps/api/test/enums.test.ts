import {
  BookingStatus as DbBookingStatus,
  CabinClass as DbCabinClass,
  PaymentStatus as DbPaymentStatus,
  RoleName as DbRoleName,
  ServiceType as DbServiceType,
  UserStatus as DbUserStatus,
} from '@prisma/client';
import {
  BookingStatus,
  CabinClass,
  PaymentStatus,
  RoleName,
  ServiceType,
  UserStatus,
} from '@zproo/types';
import { describe, expect, it } from 'vitest';

/** Shared enums must match the database enums exactly, or clients and API will disagree. */
describe('shared enums match Prisma enums', () => {
  it.each([
    ['RoleName', RoleName, DbRoleName],
    ['UserStatus', UserStatus, DbUserStatus],
    ['CabinClass', CabinClass, DbCabinClass],
    ['BookingStatus', BookingStatus, DbBookingStatus],
    ['PaymentStatus', PaymentStatus, DbPaymentStatus],
  ])('%s', (_name, shared, db) => {
    expect(Object.values(shared).sort()).toEqual(Object.values(db).sort());
  });
});

/** CORPORATE is reserved in the database for the corporate-travel module; the apps add it when it ships. */
it('ServiceType matches Prisma apart from the reserved CORPORATE value', () => {
  expect([...Object.values(ServiceType), 'CORPORATE'].sort()).toEqual(Object.values(DbServiceType).sort());
});
