import type { TrainClass, TrainQuota } from '@zproo/types';

/** The chosen train and class, before passenger details. Works on reload and as a shared link. */
export const trainSelectionUrl = (s: {
  offerId: string;
  travelClass: TrainClass;
  quota: TrainQuota;
  passengers: number;
}) =>
  `/trains/selection?${new URLSearchParams({
    offer: s.offerId,
    class: s.travelClass,
    quota: s.quota,
    passengers: String(s.passengers),
  }).toString()}`;

export const trainBookingUrl = (reference: string) =>
  `/trains/bookings/${encodeURIComponent(reference)}`;
export const trainCancelUrl = (reference: string) =>
  `/trains/bookings/${encodeURIComponent(reference)}/cancel`;
export const trainLiveStatusUrl = (trainNumber?: string, date?: string) =>
  `/trains/live-status${trainNumber ? `?${new URLSearchParams({ train: trainNumber, ...(date && { date }) }).toString()}` : ''}`;
