import type { BusTripOffer } from '@zproo/types';
import { localTime } from '@/features/flights/format';

export const IST = 'Asia/Kolkata';

/** "21:30" in India time. */
export const istTime = (iso: string) => localTime(iso, IST);

export const busTypeLabel = (bus: BusTripOffer['bus']) => {
  const kind = { SEATER: 'Seater', SLEEPER: 'Sleeper', SEATER_SLEEPER: 'Seater / Sleeper' }[
    bus.type
  ];
  return `${bus.electric ? 'Electric ' : ''}${bus.ac ? 'A/C' : 'Non A/C'} ${kind}`;
};

export const ratingLabel = (rating: number) => rating.toFixed(1);
