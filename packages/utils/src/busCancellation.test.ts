import { describe, expect, it } from 'vitest';
import { busCancellationQuote } from './busCancellation';

const now = new Date('2026-10-20T06:00:00.000Z');
const hoursFromNow = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();
const base = { status: 'CONFIRMED', paymentStatus: 'SUCCESS', totalPaise: 100_000, now } as const;

describe('busCancellationQuote', () => {
  it('refunds 90% more than 24 hours before departure', () => {
    const q = busCancellationQuote({ ...base, departureAt: hoursFromNow(30) });
    expect(q).toMatchObject({ eligible: true, paid: true, refundPercent: 90, refundPaise: 90_000, chargesPaise: 10_000 });
  });

  it('steps down as departure gets closer', () => {
    expect(busCancellationQuote({ ...base, departureAt: hoursFromNow(13) }).refundPercent).toBe(75);
    expect(busCancellationQuote({ ...base, departureAt: hoursFromNow(5) }).refundPercent).toBe(50);
    const late = busCancellationQuote({ ...base, departureAt: hoursFromNow(2) });
    expect(late).toMatchObject({ eligible: true, refundPercent: 0, refundPaise: 0, chargesPaise: 100_000 });
  });

  it('refuses once the bus has departed', () => {
    const q = busCancellationQuote({ ...base, departureAt: hoursFromNow(-1) });
    expect(q.eligible).toBe(false);
    expect(q.reason).toMatch(/departed/);
  });

  it('releases an unpaid booking without any charge or refund', () => {
    const q = busCancellationQuote({ ...base, status: 'PENDING_PAYMENT', paymentStatus: 'CREATED', departureAt: hoursFromNow(2) });
    expect(q).toMatchObject({ eligible: true, paid: false, refundPaise: 0 });
  });

  it('refuses bookings that are already cancelled, complete or still processing', () => {
    for (const status of ['CANCELLED', 'REFUNDED', 'REFUND_PENDING', 'COMPLETED', 'PROCESSING'] as const) {
      expect(busCancellationQuote({ ...base, status, departureAt: hoursFromNow(48) }).eligible).toBe(false);
    }
  });

  it('uses the operator policy sold with the trip', () => {
    const q = busCancellationQuote({
      ...base,
      departureAt: hoursFromNow(10),
      policy: [{ hoursBefore: 6, refundPercent: 100 }, { hoursBefore: 0, refundPercent: 0 }],
    });
    expect(q.refundPercent).toBe(100);
  });
});
