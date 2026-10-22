import type { TrainAvailability, TrainBookingInfo } from '@zproo/types';
import { describe, expect, it } from 'vitest';
import { trainAvailabilityWarnings, trainQuotePrice, trainStatusLabel } from './trainPrice';

const fare = {
  basePaise: 60_000,
  reservationPaise: 2_000,
  superfastPaise: 3_000,
  tatkalPaise: 0,
  gstPaise: 0,
  totalPaise: 65_000,
};
const avail = (
  status: TrainAvailability['status'],
  label: string,
  count: number | null = 3,
): TrainAvailability => ({
  status,
  label,
  count,
  bookable: status !== 'REGRET',
  note: null,
  checkedAt: '2026-10-12T00:00:00Z',
});

describe('trainQuotePrice', () => {
  it('multiplies per-passenger components and adds the platform fee once', () => {
    const p = trainQuotePrice(fare, 3, 2_000);
    expect(p.totalPaise).toBe(65_000 * 3 + 2_000);
    expect(p.basePaise + p.taxesPaise + p.feesPaise).toBe(p.totalPaise);
    expect(p.lines).toEqual([
      { label: 'Base fare × 3 passengers', amountPaise: 180_000 },
      { label: 'Reservation charges', amountPaise: 6_000 },
      { label: 'Superfast charges', amountPaise: 9_000 },
      { label: 'Service fee', amountPaise: 2_000 },
    ]);
    expect(p.lines.reduce((s, l) => s + l.amountPaise, 0)).toBe(p.totalPaise);
  });
});

describe('trainAvailabilityWarnings', () => {
  it('never lets RAC or a waitlisted ticket look confirmed', () => {
    expect(trainAvailabilityWarnings(avail('AVAILABLE', 'AVL 40', 40), 2, 'GN')).toEqual([]);
    expect(trainAvailabilityWarnings(avail('AVAILABLE', 'AVL 1', 1), 2, 'GN')[0]).toMatch(
      /Only 1 berth is available/,
    );
    expect(trainAvailabilityWarnings(avail('RAC', 'RAC 3'), 1, 'GN').join(' ')).toMatch(
      /not confirmed/,
    );
    expect(trainAvailabilityWarnings(avail('WAITLIST', 'GNWL 12'), 1, 'GN').join(' ')).toMatch(
      /NOT a confirmed berth/,
    );
    expect(trainAvailabilityWarnings(avail('AVAILABLE', 'AVL 9', 9), 1, 'TQ').join(' ')).toMatch(
      /Tatkal/,
    );
  });
});

describe('trainStatusLabel', () => {
  const info = (
    passengers: { status: string; currentStatus: string }[],
    reservationStatus = 'BOOKED',
  ) => ({ reservationStatus, passengers }) as unknown as TrainBookingInfo;
  it('describes the reservation as the railway reports it', () => {
    expect(
      trainStatusLabel(
        info([{ status: 'CONFIRMED', currentStatus: 'CNF/B1/4/LOWER' }]),
        'CONFIRMED',
      ),
    ).toBe('Booked · Confirmed');
    expect(
      trainStatusLabel(
        info([
          { status: 'CONFIRMED', currentStatus: 'CNF/B1/4/LOWER' },
          { status: 'WAITLIST', currentStatus: 'GNWL 3' },
        ]),
        'CONFIRMED',
      ),
    ).toBe('Booked · GNWL 3');
    expect(trainStatusLabel(info([], 'PENDING'), 'PROCESSING')).toBe(
      'Payment received · reserving',
    );
    expect(trainStatusLabel(info([], 'FAILED'), 'REFUNDED')).toBe('Reservation failed');
  });
});
