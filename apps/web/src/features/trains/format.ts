import {
  BERTH_PREFERENCE_LABELS,
  TRAIN_CLASS_LABELS,
  TRAIN_QUOTA_LABELS,
  type TrainAvailability,
  type TrainClass,
  type TrainPassengerStatus,
  type TrainQuota,
} from '@zproo/types';
import { localTime } from '@/features/flights/format';

export const IST = 'Asia/Kolkata';
export const istTime = (iso: string) => localTime(iso, IST);
export const classLabel = (c: TrainClass) => TRAIN_CLASS_LABELS[c] ?? c;
export const quotaLabel = (q: TrainQuota) => TRAIN_QUOTA_LABELS[q] ?? q;
export const berthLabel = (b: string) =>
  BERTH_PREFERENCE_LABELS[b as keyof typeof BERTH_PREFERENCE_LABELS] ?? b;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** [1,3,5] → "Mon Wed Fri"; all seven → "Daily". */
export function runningDaysLabel(days: number[]): string {
  if (days.length === 7) return 'Runs daily';
  return `Runs ${days.map((d) => DAYS[d - 1]).join(' ')}`;
}

export type Tone = 'success' | 'warning' | 'danger' | 'outline';

/** Badge tone for availability. The label text always carries the meaning (not colour alone). */
export function availabilityTone(a: Pick<TrainAvailability, 'status'>): Tone {
  switch (a.status) {
    case 'AVAILABLE':
      return 'success';
    case 'RAC':
    case 'WAITLIST':
      return 'warning';
    case 'REGRET':
      return 'danger';
    default:
      return 'outline';
  }
}

/** Plain words next to the provider's code, e.g. "GNWL 12" → "Waiting list". */
export function availabilityWords(a: Pick<TrainAvailability, 'status'>): string {
  switch (a.status) {
    case 'AVAILABLE':
      return 'Available';
    case 'RAC':
      return 'RAC — shared berth';
    case 'WAITLIST':
      return 'Waiting list';
    case 'REGRET':
      return 'Not available';
    case 'BOOKING_CLOSED':
      return 'Booking not open';
    default:
      return 'Not offered';
  }
}

export const PASSENGER_STATUS_LABEL: Record<TrainPassengerStatus, string> = {
  PENDING: 'Awaiting railway',
  CONFIRMED: 'Confirmed',
  RAC: 'RAC (shared berth)',
  WAITLIST: 'Waitlisted',
  CANCELLED: 'Cancelled',
};

export function passengerTone(s: TrainPassengerStatus): Tone {
  return s === 'CONFIRMED'
    ? 'success'
    : s === 'CANCELLED'
      ? 'danger'
      : s === 'PENDING'
        ? 'outline'
        : 'warning';
}
