import type { PrismaClient } from '@prisma/client';
import {
  allocateBerths,
  buildTrainOffer,
  findTrainPlan,
  journeyAvailability,
  localDate,
  maxSellable,
  MOCK_TRAIN_MAX_PASSENGERS,
  MOCK_TRAIN_MAX_TATKAL_PASSENGERS,
  MOCK_TRAIN_QUOTAS,
  parseTrainOfferId,
  presoldCount,
  RAIL_TZ,
  searchTrainJourneys,
  TRAIN_ADVANCE_DAYS,
  TRAIN_CANCELLATION_RULES,
  TRAIN_CHART_MINUTES,
  trainCancellationCharge,
  trainJourney,
  type TrainJourney,
} from '@zproo/catalog';
import { TRAIN_STATIONS } from '@zproo/config';
import {
  TrainClass,
  type StationSuggestion,
  type TrainCapabilities,
  type TrainLiveStatus,
  type TrainOffer,
  type TrainQuota,
} from '@zproo/types';
import { randomInt } from 'node:crypto';
import type {
  CancellationQuoteRequest,
  CancellationQuoteResult,
  ProviderBookingRef,
  ProviderBookingRequest,
  ProviderBookingResult,
  ProviderCancellationRequest,
  ProviderCancellationResult,
  ProviderPassengerStatus,
  TrainProvider,
  TrainSearchQuery,
} from './TrainProvider';

const digits = (n: number) => Array.from({ length: n }, () => String(randomInt(10))).join('');
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

/**
 * Development railway provider: invented trains (numbers start with "Z") on real station codes,
 * simulated availability (AVL / RAC / WL), demo fares and demo PNRs ("ZD" + 8 digits). Seats it
 * sells are counted in `train_inventory`. Refused in production by env validation.
 *
 * Test hooks (development only): a contact email containing "+railfail" makes the reservation
 * fail after payment (exercising the refund flow); "+railpending" leaves it pending until the
 * next status check (exercising reconciliation).
 */
export class MockTrainProvider implements TrainProvider {
  readonly name = 'mock';
  readonly isDemo = true;
  private readonly now: () => Date;

  constructor(
    private readonly prisma: PrismaClient,
    options: { now?: () => Date } = {},
  ) {
    this.now = options.now ?? (() => new Date());
  }

  capabilities(): TrainCapabilities {
    return {
      provider: this.name,
      demo: true,
      quotas: MOCK_TRAIN_QUOTAS,
      classes: Object.values(TrainClass),
      maxPassengers: MOCK_TRAIN_MAX_PASSENGERS,
      maxTatkalPassengers: MOCK_TRAIN_MAX_TATKAL_PASSENGERS,
      advanceReservationDays: TRAIN_ADVANCE_DAYS,
      berthPreference: true,
      foodChoice: true,
      confirmOnlyOption: true,
      idRequired: false,
      cancellation: true,
      partialCancellation: true,
      liveStatus: false,
    };
  }

  async searchStations(query: string, limit: number): Promise<StationSuggestion[]> {
    const q = query.trim().toLowerCase();
    if (!q) return TRAIN_STATIONS.slice(0, limit).map((s) => ({ ...s }));
    const scored = TRAIN_STATIONS.map((s) => {
      const code = s.code.toLowerCase();
      const name = s.name.toLowerCase();
      const city = s.city.toLowerCase();
      const score =
        code === q
          ? 0
          : code.startsWith(q)
            ? 1
            : name.startsWith(q) || city.startsWith(q)
              ? 2
              : name.includes(q) || city.includes(q)
                ? 3
                : 9;
      return { s, score };
    }).filter((x) => x.score < 9);
    return scored
      .sort((a, b) => a.score - b.score)
      .slice(0, limit)
      .map(({ s }) => ({ code: s.code, name: s.name, city: s.city, state: s.state }));
  }

  async search(query: TrainSearchQuery): Promise<TrainOffer[]> {
    if (!MOCK_TRAIN_QUOTAS.includes(query.quota)) return [];
    const journeys = searchTrainJourneys(query.from, query.to, query.date).filter(
      (j) => !query.travelClass || j.plan.classes.includes(query.travelClass),
    );
    const sold = await this.soldFor(journeys, query.quota);
    const now = this.now();
    return journeys.map((journey) =>
      buildTrainOffer({
        journey,
        quota: query.quota,
        provider: this.name,
        now,
        extraSold: (c) => sold.get(`${journey.plan.number}|${journey.runDate}|${c}`) ?? 0,
      }),
    );
  }

  async getOffer(
    offerId: string,
    quota: TrainQuota,
    travelClass?: TrainClass,
  ): Promise<TrainOffer | null> {
    const journey = this.journey(offerId);
    if (!journey || !MOCK_TRAIN_QUOTAS.includes(quota)) return null;
    if (travelClass && !journey.plan.classes.includes(travelClass)) return null;
    const sold = await this.soldFor([journey], quota);
    return buildTrainOffer({
      journey,
      quota,
      provider: this.name,
      now: this.now(),
      travelClass,
      extraSold: (c) => sold.get(`${journey.plan.number}|${journey.runDate}|${c}`) ?? 0,
    });
  }

  async book(request: ProviderBookingRequest): Promise<ProviderBookingResult> {
    const existing = await this.stored(request.clientReference);
    if (existing?.pnr) return this.bookedFrom(existing);
    if (request.contact.email.includes('+railfail')) {
      return {
        outcome: 'FAILED',
        providerReference: `MOCKTXN-${digits(10)}`,
        reason: 'The railway system declined this reservation (simulated failure).',
      };
    }
    if (request.contact.email.includes('+railpending') && !existing?.providerReference) {
      return {
        outcome: 'PENDING',
        providerReference: `MOCKTXN-${digits(10)}`,
        message: 'The railway system has not confirmed the reservation yet (simulated delay).',
      };
    }
    return this.reserve(request);
  }

  async status(ref: ProviderBookingRef): Promise<ProviderBookingResult> {
    const stored = await this.stored(ref.clientReference);
    if (!stored) {
      return {
        outcome: 'FAILED',
        providerReference: ref.providerReference,
        reason: 'No reservation found for this transaction.',
      };
    }
    if (stored.pnr) return this.bookedFrom(stored);
    if (stored.reservationStatus === 'FAILED') {
      return {
        outcome: 'FAILED',
        providerReference: stored.providerReference,
        reason: stored.failureReason ?? 'Reservation failed.',
      };
    }
    // A pending (simulated-delay) reservation completes on the next status check.
    const booking = stored.booking;
    return this.reserve(
      {
        clientReference: ref.clientReference,
        offerId: stored.offerId,
        travelClass: stored.travelClass as TrainClass,
        quota: stored.quota as TrainQuota,
        confirmOnly: stored.confirmOnly,
        contact: { email: booking.contactEmail, phone: booking.contactPhone },
        passengers: stored.passengers.map((p) => ({
          name: `${p.bookingPassenger.firstName} ${p.bookingPassenger.lastName}`.trim(),
          age: p.bookingPassenger.age ?? 30,
          gender: p.bookingPassenger.gender,
          berthPreference: p.berthPreference as never,
          foodChoice: (p.foodChoice as never) ?? null,
        })),
      },
      stored.providerReference,
    );
  }

  async cancellationQuote(request: CancellationQuoteRequest): Promise<CancellationQuoteResult> {
    let charges = 0;
    let fare = 0;
    for (const p of request.passengers) {
      const result = trainCancellationCharge({
        travelClass: request.travelClass,
        quota: request.quota,
        status: p.status,
        farePaise: p.farePaise,
        departureAt: request.departureAt,
        now: this.now(),
      });
      if ('reason' in result)
        return { eligible: false, reason: result.reason, rules: TRAIN_CANCELLATION_RULES };
      charges += result.chargePaise;
      fare += p.farePaise;
    }
    return {
      eligible: true,
      chargesPaise: charges,
      refundPaise: fare - charges,
      rules: TRAIN_CANCELLATION_RULES,
    };
  }

  async cancel(request: ProviderCancellationRequest): Promise<ProviderCancellationResult> {
    const stored = await this.stored(request.clientReference);
    if (!stored?.pnr || stored.pnr !== request.pnr)
      return { outcome: 'FAILED', reason: 'PNR not found.' };
    const done = stored.cancellations.find(
      (c) => c.id === request.cancellationReference && c.status === 'COMPLETED',
    );
    if (done?.providerCancellationId) {
      return {
        outcome: 'CANCELLED',
        providerCancellationId: done.providerCancellationId,
        refundPaise: done.refundPaise,
        chargesPaise: done.chargesPaise,
      };
    }
    const passengers = request.passengerNumbers.map((n) =>
      stored.passengers.find((p) => p.sequence === n),
    );
    if (passengers.some((p) => !p || p.status === 'CANCELLED' || p.status === 'PENDING')) {
      return { outcome: 'FAILED', reason: 'One or more passengers cannot be cancelled.' };
    }
    const quote = await this.cancellationQuote({
      travelClass: stored.travelClass as TrainClass,
      quota: stored.quota as TrainQuota,
      departureAt: stored.departureAt,
      passengers: passengers.map((p) => ({
        status: p?.status as 'CONFIRMED',
        farePaise: p?.farePaise ?? 0,
      })),
    });
    if (!quote.eligible) return { outcome: 'FAILED', reason: quote.reason };
    // Release the cancelled passengers' places.
    const plan = findTrainPlan(stored.trainNumber);
    const journey =
      plan &&
      trainJourney(
        plan,
        stored.fromStation,
        stored.toStation,
        stored.journeyDate.toISOString().slice(0, 10),
      );
    if (journey) {
      await this.prisma.trainInventory.updateMany({
        where: {
          trainNumber: stored.trainNumber,
          runDate: day(journey.runDate),
          travelClass: stored.travelClass,
          quota: stored.quota,
          sold: { gte: passengers.length },
        },
        data: { sold: { decrement: passengers.length } },
      });
    }
    return {
      outcome: 'CANCELLED',
      providerCancellationId: `MOCKCAN-${digits(10)}`,
      refundPaise: quote.refundPaise,
      chargesPaise: quote.chargesPaise,
    };
  }

  async liveStatus(trainNumber: string, date: string): Promise<TrainLiveStatus> {
    return {
      supported: false,
      trainNumber,
      date,
      message:
        'Live running status needs a railway data provider. The development provider has no live train data, so none is shown.',
      lastUpdatedAt: null,
      stale: false,
      state: null,
      currentStation: null,
      delayMinutes: null,
      stations: [],
    };
  }

  // ───────── internals ─────────

  private journey(offerId: string): TrainJourney | null {
    const key = parseTrainOfferId(offerId);
    const plan = key && findTrainPlan(key.number);
    return plan && key ? trainJourney(plan, key.from, key.to, key.date) : null;
  }

  /** Seats this deployment sold, keyed "<train>|<runDate>|<class>". */
  private async soldFor(journeys: TrainJourney[], quota: TrainQuota): Promise<Map<string, number>> {
    if (journeys.length === 0) return new Map();
    const rows = await this.prisma.trainInventory.findMany({
      where: {
        quota,
        OR: journeys.map((j) => ({ trainNumber: j.plan.number, runDate: day(j.runDate) })),
      },
    });
    return new Map(
      rows.map((r) => [
        `${r.trainNumber}|${r.runDate.toISOString().slice(0, 10)}|${r.travelClass}`,
        r.sold,
      ]),
    );
  }

  private stored(clientReference: string) {
    return this.prisma.trainBooking.findFirst({
      where: { booking: { reference: clientReference } },
      include: {
        booking: true,
        passengers: { include: { bookingPassenger: true }, orderBy: { sequence: 'asc' } },
        cancellations: true,
      },
    });
  }

  private bookedFrom(
    stored: NonNullable<Awaited<ReturnType<MockTrainProvider['stored']>>>,
  ): ProviderBookingResult {
    return {
      outcome: 'BOOKED',
      pnr: stored.pnr as string,
      providerReference: stored.providerReference ?? `MOCKTXN-${stored.id}`,
      chartStatus: this.chartStatus(stored.departureAt),
      passengers: stored.passengers.map((p) => ({
        status: p.status === 'PENDING' ? 'WAITLIST' : p.status,
        bookingStatus: p.bookingStatus ?? '',
        currentStatus: p.currentStatus ?? p.bookingStatus ?? '',
        coach: p.coach,
        berth: p.berth,
        berthType: p.berthType,
      })),
    };
  }

  private chartStatus(departureAt: Date): string {
    return departureAt.getTime() - this.now().getTime() > TRAIN_CHART_MINUTES * 60_000
      ? 'Chart not prepared'
      : 'Chart prepared';
  }

  /** Takes places from inventory atomically and allocates berths / RAC / waiting list. */
  private async reserve(
    request: ProviderBookingRequest,
    providerReference?: string | null,
  ): Promise<ProviderBookingResult> {
    const reference = providerReference ?? `MOCKTXN-${digits(10)}`;
    const failed = (reason: string): ProviderBookingResult => ({
      outcome: 'FAILED',
      providerReference: reference,
      reason,
    });
    const journey = this.journey(request.offerId);
    if (
      !journey ||
      !journey.plan.classes.includes(request.travelClass) ||
      !MOCK_TRAIN_QUOTAS.includes(request.quota)
    ) {
      return failed('This train or class is no longer available.');
    }
    const now = this.now();
    const availability = journeyAvailability({
      journey,
      travelClass: request.travelClass,
      quota: request.quota,
      extraSold: 0,
      now,
    });
    if (!availability.bookable && availability.status !== 'REGRET') {
      return failed(availability.note ?? 'Booking is not open for this class.');
    }
    const n = request.passengers.length;
    const presold = presoldCount({
      trainNumber: journey.plan.number,
      runDate: journey.runDate,
      travelClass: request.travelClass,
      quota: request.quota,
      today: localDate(now, RAIL_TZ),
    });
    const limit = maxSellable(request.travelClass, request.quota) - presold;
    const key = {
      trainNumber: journey.plan.number,
      runDate: day(journey.runDate),
      travelClass: request.travelClass,
      quota: request.quota,
    };
    try {
      const allocated = await this.prisma.$transaction(async (tx) => {
        await tx.trainInventory.upsert({
          where: { trainNumber_runDate_travelClass_quota: key },
          create: { ...key, sold: 0 },
          update: {},
        });
        const { count } = await tx.trainInventory.updateMany({
          where: { ...key, sold: { lte: limit - n } },
          data: { sold: { increment: n } },
        });
        if (count !== 1) throw new Regret('No seats and the waiting list is full (REGRET).');
        const row = await tx.trainInventory.findUniqueOrThrow({
          where: { trainNumber_runDate_travelClass_quota: key },
        });
        const seats = allocateBerths({
          travelClass: request.travelClass,
          quota: request.quota,
          sold: presold + row.sold - n,
          count: n,
        });
        if (seats.length !== n) throw new Regret('No seats and the waiting list is full (REGRET).');
        if (request.confirmOnly && seats.some((s) => s.status !== 'CONFIRMED')) {
          throw new Regret(
            'Confirmed berths are no longer available, and you chose to book only confirmed berths.',
          );
        }
        return seats;
      });
      const passengers: ProviderPassengerStatus[] = allocated.map((s) => ({
        status: s.status,
        bookingStatus: s.label,
        currentStatus: s.label,
        coach: s.coach,
        berth: s.berth,
        berthType: s.berthType,
      }));
      return {
        outcome: 'BOOKED',
        pnr: `ZD${digits(8)}`,
        providerReference: reference,
        chartStatus: this.chartStatus(journey.departureAt),
        passengers,
      };
    } catch (err) {
      if (err instanceof Regret) return failed(err.message);
      throw err;
    }
  }
}

class Regret extends Error {}
