import type { BookingDetails } from '@zproo/types';
import type { CheckoutService } from './steps';

const BASE: Record<CheckoutService, string> = { flight: '/flights', bus: '/buses', train: '/trains' };

export const serviceOf = (booking: Pick<BookingDetails, 'serviceType'>): CheckoutService =>
  booking.serviceType === 'BUS' ? 'bus' : booking.serviceType === 'TRAIN' ? 'train' : 'flight';

export const paymentUrl = (service: CheckoutService, reference: string) =>
  `${BASE[service]}/payment?ref=${encodeURIComponent(reference)}`;

export const confirmationUrl = (service: CheckoutService, reference: string) =>
  `${BASE[service]}/confirmation?ref=${encodeURIComponent(reference)}`;

export const searchHome = (service: CheckoutService) => BASE[service];
