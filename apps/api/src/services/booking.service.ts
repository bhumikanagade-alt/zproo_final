import { Prisma, type PrismaClient } from '@prisma/client';
import type { BookingDetails, BookingListItem, FlightOffer } from '@zproo/types';
import { generateBookingReference } from '@zproo/utils';
import {
  documentVerification,
  internationalDocumentIssues,
  isInternationalItinerary,
  passengerAgeIssues,
  type BookBusInput,
  type BookFlightInput,
  type BookTrainInput,
} from '@zproo/validation';
import type { Logger } from 'pino';
import { toBookingDetails, toBookingListItem } from '../models/booking.dto';
import type { BusProvider } from '../providers/bus';
import type { FlightProvider } from '../providers/flight';
import type { TrainProvider } from '../providers/train';
import { BookingRepository, type BookingRecord } from '../repositories/booking.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import {
  NotFoundError,
  OfferExpiredError,
  PriceChangedError,
  SeatUnavailableError,
  SoldOutError,
  ValidationError,
} from '../utils/errors';
import { localDate } from '../utils/time';
import type { AuditService, RequestContext } from './audit.service';
import { flightPriceBreakdown, type PaxCounts } from './flightPricing';
import { trainQuotePrice } from '@zproo/utils';
import type { CouponService } from './coupon.service';
import { seatSummary, validateAddOns } from '@zproo/utils';

interface BookingServiceDeps {
  prisma: PrismaClient;
  flights: FlightProvider;
  buses: BusProvider;
  trains: TrainProvider;
  audit: AuditService;
  logger: Logger;
  /** Minutes seats stay held for an unpaid booking: a fixed number, or read per booking (admin setting). */
  holdMinutes: number | (() => Promise<number>);
  /** Platform fee per train booking (paise). */
  trainFeePaise?: number;
  /** Catalogue items an admin has hidden (by service); a hidden item cannot be booked even with a direct request. */
  unlisted?: (service: 'FLIGHT' | 'BUS' | 'TRAIN') => Promise<ReadonlySet<string>>;
  /** Admin-created coupons (checked before the built-in promo codes). */
  coupons?: CouponService;
  now?: () => Date;
}

export class BookingService {
  private readonly now: () => Date;

  constructor(private readonly deps: BookingServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  createFlightBooking(
    userId: string,
    input: BookFlightInput,
    idempotencyKey: string,
    ctx: RequestContext,
  ): Promise<BookingDetails> {
    return this.idempotent(userId, idempotencyKey, () =>
      this.newFlightBooking(userId, input, idempotencyKey, ctx),
    );
  }

  createBusBooking(
    userId: string,
    input: BookBusInput,
    idempotencyKey: string,
    ctx: RequestContext,
  ): Promise<BookingDetails> {
    return this.idempotent(userId, idempotencyKey, () =>
      this.newBusBooking(userId, input, idempotencyKey, ctx),
    );
  }

  createTrainBooking(
    userId: string,
    input: BookTrainInput,
    idempotencyKey: string,
    ctx: RequestContext,
  ): Promise<BookingDetails> {
    return this.idempotent(userId, idempotencyKey, () =>
      this.newTrainBooking(userId, input, idempotencyKey, ctx),
    );
  }

  /**
   * Creates a train booking awaiting payment. Railway systems reserve only after payment, so
   * nothing is held here: the fare and availability are re-checked live with the provider, the
   * server computes the total, and the reservation is made once the payment is verified
   * (TrainReservationService). If the railway then refuses, the payment is refunded in full.
   */
  private async newTrainBooking(
    userId: string,
    input: BookTrainInput,
    idempotencyKey: string,
    ctx: RequestContext,
  ): Promise<BookingDetails> {
    const caps = this.deps.trains.capabilities();
    const n = input.passengers.length;
    const issues: { path: string; message: string }[] = [];
    if (!caps.quotas.includes(input.quota))
      issues.push({ path: 'body.quota', message: 'This quota is not offered by the railway provider' });
    const max = input.quota === 'TQ' ? caps.maxTatkalPassengers : caps.maxPassengers;
    if (n > max) issues.push({ path: 'body.passengers', message: `Up to ${max} passengers per ticket` });
    if (input.confirmOnly && !caps.confirmOnlyOption)
      issues.push({ path: 'body.confirmOnly', message: 'This option is not offered by the railway provider' });
    input.passengers.forEach((p, i) => {
      if (!caps.berthPreference && p.berthPreference !== 'NO_PREFERENCE')
        issues.push({ path: `body.passengers.${i}.berthPreference`, message: 'Berth preference is not offered' });
    });
    if (issues.length > 0) throw new ValidationError(issues);

    const offer = await this.deps.trains.getOffer(input.offerId, input.quota, input.travelClass);
    const option = offer?.classes.find((c) => c.travelClass === input.travelClass);
    if (!offer || !option?.fare)
      throw new OfferExpiredError('This train or class is no longer available. Please search again.');
    await this.assertListed('TRAIN', offer.trainNumber);
    const foodOffered = caps.foodChoice && offer.pantry;
    input.passengers.forEach((p, i) => {
      if (p.foodChoice && !foodOffered)
        issues.push({ path: `body.passengers.${i}.foodChoice`, message: 'Food choice is not offered on this train' });
    });
    if (issues.length > 0) throw new ValidationError(issues);
    if (!option.availability.bookable) {
      throw new SoldOutError(option.availability.note ?? `${option.availability.label}: this class cannot be booked now.`);
    }
    if (
      input.confirmOnly &&
      (option.availability.status !== 'AVAILABLE' || (option.availability.count ?? 0) < n)
    ) {
      throw new SoldOutError(
        'Confirmed berths are not available for every passenger. Untick "Book only if confirmed berths are available" to accept RAC or waiting list.',
      );
    }
    const gross = trainQuotePrice(option.fare, n, this.deps.trainFeePaise ?? 0);
    // A coupon made in the admin panel (valid on trains) comes off the whole fare, checked here so the amount
    // the review page showed and the booking's amount cannot disagree.
    const promo = input.promoCode?.trim();
    const adminCoupon = promo && this.deps.coupons
      ? await this.deps.coupons.quote({ code: promo, service: 'TRAIN', userId, orderPaise: gross.totalPaise })
      : null;
    if (promo && !adminCoupon) throw new ValidationError([{ path: 'body.promoCode', message: 'Invalid or expired coupon code' }]);
    const discountPaise = adminCoupon?.discountPaise ?? 0;
    const price = { ...gross, discountPaise, totalPaise: gross.totalPaise - discountPaise };
    if (price.totalPaise !== input.expectedTotalPaise) throw new PriceChangedError(price.totalPaise);
    // Each passenger's share of the discount, so a later cancellation never refunds more than was paid.
    const shareOf = (i: number) => Math.floor(discountPaise / n) + (i === 0 ? discountPaise % n : 0);

    const fare = option.fare;
    const sold: typeof offer = { ...offer, classes: [option] };
    return this.createHeld(userId, 'TRAIN', ctx, async (reference, tx) => {
      const repo = new BookingRepository(tx);
      const created = await repo.create({
        reference,
        userId,
        serviceType: 'TRAIN',
        status: 'PENDING_PAYMENT',
        paymentStatus: 'CREATED',
        baseAmountPaise: price.basePaise,
        taxAmountPaise: price.taxesPaise,
        feeAmountPaise: price.feesPaise,
        discountAmountPaise: price.discountPaise,
        totalAmountPaise: price.totalPaise,
        contactEmail: input.contact.email,
        contactPhone: input.contact.phone,
        travelDate: new Date(`${offer.date}T00:00:00Z`),
        holdExpiresAt: new Date(this.now().getTime() + (await this.holdMinutes()) * 60_000),
        idempotencyKey,
        metadata: {
          demo: this.deps.trains.isDemo,
          provider: this.deps.trains.name,
          promoCode: adminCoupon?.code ?? null,
          trainCapabilities: {
            cancellation: caps.cancellation,
            partialCancellation: caps.partialCancellation,
            liveStatus: caps.liveStatus,
          },
        },
        passengers: {
          create: input.passengers.map((p, i) => ({
            sequence: i + 1,
            type: p.age < 12 ? 'CHILD' : 'ADULT',
            title: busTitle(p.gender, p.age),
            firstName: p.firstName,
            lastName: p.lastName,
            age: p.age,
            gender: p.gender,
          })),
        },
      });
      if (adminCoupon && this.deps.coupons) {
        await this.deps.coupons.redeem(tx, { couponId: adminCoupon.couponId, code: adminCoupon.code, userId, bookingId: created.id });
      }
      await tx.trainBooking.create({
        data: {
          bookingId: created.id,
          provider: offer.provider,
          offerId: offer.id,
          trainNumber: offer.trainNumber,
          trainName: offer.trainName,
          fromStation: offer.from.code,
          toStation: offer.to.code,
          journeyDate: new Date(`${offer.date}T00:00:00Z`),
          departureAt: new Date(offer.departureAt),
          arrivalAt: new Date(offer.arrivalAt),
          travelClass: input.travelClass,
          quota: input.quota,
          confirmOnly: input.confirmOnly,
          fare: fare as unknown as Prisma.InputJsonValue,
          offer: sold as unknown as Prisma.InputJsonValue,
          passengers: {
            create: created.passengers.map((bp) => {
              const p = input.passengers[bp.sequence - 1] as BookTrainInput['passengers'][number];
              return {
                bookingPassengerId: bp.id,
                sequence: bp.sequence,
                berthPreference: p.berthPreference,
                foodChoice: p.foodChoice ?? null,
                farePaise: Math.max(0, fare.totalPaise - shareOf(bp.sequence - 1)),
              };
            }),
          },
        },
      });
      return (await repo.findById(created.id)) as BookingRecord;
    });
  }

  /**
   * Creates a flight booking awaiting payment: re-prices every offer, checks passengers, then holds
   * the seats and writes the booking in one transaction. Retrying with the same Idempotency-Key
   * returns the original booking instead of holding seats twice.
   */
  private async newFlightBooking(
    userId: string,
    input: BookFlightInput,
    idempotencyKey: string,
    ctx: RequestContext,
  ): Promise<BookingDetails> {
    const pax = this.countPassengers(input);
    const offers: FlightOffer[] = [];
    for (const id of input.offerIds) {
      const offer = await this.deps.flights.getOffer(id, pax);
      if (!offer) throw new OfferExpiredError();
      await this.assertListed('FLIGHT', offer.flightNumber.replace(/\s+/g, ''));
      offers.push(offer);
    }
    this.checkItinerary(offers);
    const travelDate = localDate(
      new Date(offers[0]?.departureAt ?? ''),
      offers[0]?.from.timezone ?? 'Asia/Kolkata',
    );
    const ageIssues = passengerAgeIssues(input.passengers, travelDate);
    if (ageIssues.length > 0) {
      throw new ValidationError(
        ageIssues.map((i) => ({
          path: `body.passengers.${i.index}.dateOfBirth`,
          message: i.message,
        })),
      );
    }

    const international = isInternationalItinerary(offers);
    if (international) {
      const last = offers[offers.length - 1] as FlightOffer;
      const lastDate = localDate(new Date(last.departureAt), last.from.timezone);
      const docIssues = internationalDocumentIssues(input.passengers, travelDate, lastDate);
      if (docIssues.length > 0) {
        throw new ValidationError(
          docIssues.map((i) => ({
            path: `body.passengers.${i.index}.${i.field}`,
            message: i.message,
          })),
        );
      }
    }

    // Identity documents, checked again on the server so the web form cannot be bypassed:
    // domestic adults need a valid government ID; international travellers a valid passport and visa.
    const lastOffer = offers[offers.length - 1] as FlightOffer;
    const documentChecks = documentVerification(input.passengers, {
      international,
      travelDate,
      lastTravelDate: localDate(new Date(lastOffer.departureAt), lastOffer.from.timezone),
      today: localDate(this.now(), 'Asia/Kolkata'),
    });
    const documentProblems = documentChecks.flatMap((check, index) =>
      [...check.issues, ...check.missing].map((issue) => ({
        path: `body.passengers.${index}.${issue.field}`,
        message: issue.message,
      })),
    );
    if (documentProblems.length > 0) throw new ValidationError(documentProblems);

    const addOnIssues = validateAddOns(offers, input.passengers, input.addOns);
    if (addOnIssues.length > 0) throw new ValidationError(addOnIssues);

    const gross = flightPriceBreakdown(offers, pax, input.addOns);
    // A coupon made in the admin panel (valid on flights) comes off the whole fare, seats/meals/baggage
    // included. It is checked here so the amount the review page showed and the booking's amount cannot disagree.
    const promo = input.promoCode?.trim();
    const adminCoupon =
      promo && this.deps.coupons
        ? await this.deps.coupons.quote({ code: promo, service: 'FLIGHT', userId, orderPaise: gross.totalPaise })
        : null;
    if (promo && !adminCoupon)
      throw new ValidationError([{ path: 'body.promoCode', message: 'Invalid or expired coupon code' }]);
    const discountPaise = adminCoupon?.discountPaise ?? 0;
    if (discountPaise >= gross.totalPaise)
      throw new ValidationError([
        { path: 'body.promoCode', message: 'This coupon would cover the whole fare, so it cannot be used on this booking' },
      ]);
    const price = { ...gross, discountPaise, totalPaise: gross.totalPaise - discountPaise };
    if (price.totalPaise !== input.expectedTotalPaise)
      throw new PriceChangedError(price.totalPaise);

    const seats = pax.adults + pax.children; // infants travel on a lap
    return this.createHeld(userId, 'FLIGHT', ctx, async (reference, tx) => {
      for (const offer of offers) await this.deps.flights.hold(offer.id, seats, tx);
      const created = await new BookingRepository(tx).create({
        reference,
        userId,
        serviceType: 'FLIGHT',
        status: 'PENDING_PAYMENT',
        paymentStatus: 'CREATED',
        baseAmountPaise: price.basePaise,
        taxAmountPaise: price.taxesPaise,
        feeAmountPaise: price.feesPaise,
        discountAmountPaise: price.discountPaise,
        totalAmountPaise: price.totalPaise,
        contactEmail: input.contact.email,
        contactPhone: input.contact.phone,
        travelDate: new Date(`${travelDate}T00:00:00Z`),
        holdExpiresAt: new Date(this.now().getTime() + (await this.holdMinutes()) * 60_000),
        idempotencyKey,
        metadata: {
          demo: this.deps.flights.isDemo,
          provider: this.deps.flights.name,
          promoCode: adminCoupon?.code ?? null,
          addOns: (input.addOns ?? null) as unknown as Prisma.InputJsonValue,
          international,
          travelDocuments: (international
            ? input.passengers.map((p) => p.travelDocument ?? null)
            : null) as unknown as Prisma.InputJsonValue,
          identityDocuments: (international
            ? null
            : input.passengers.map((p) => p.identityDocument ?? null)) as unknown as Prisma.InputJsonValue,
        },
        passengers: {
          create: input.passengers.map((p, i) => ({
            sequence: i + 1,
            type: p.type,
            title: p.title,
            firstName: p.firstName,
            lastName: p.lastName,
            dateOfBirth: p.dateOfBirth ? new Date(`${p.dateOfBirth}T00:00:00Z`) : null,
            gender: p.gender,
            seatNumber: seatSummary(offers, input.addOns, i),
          })),
        },
        flights: {
          create: offers.map((offer, i) => {
            const service = this.mockServiceKey(offer.id);
            return {
              sequence: i + 1,
              provider: offer.provider,
              offerId: offer.id,
              flightId: service?.flightId ?? null,
              serviceDate: service ? new Date(`${service.date}T00:00:00Z`) : null,
              cabin: offer.cabin,
              seats,
              originCode: offer.from.code,
              destinationCode: offer.to.code,
              departureAt: new Date(offer.departureAt),
              arrivalAt: new Date(offer.arrivalAt),
              offer: offer as unknown as Prisma.InputJsonValue,
            };
          }),
        },
      });
      // The use is recorded in the same transaction as the booking, so the admin panel's "Used" column
      // moves and the usage limits hold even when two customers check out at once.
      if (adminCoupon && this.deps.coupons) {
        await this.deps.coupons.redeem(tx, { couponId: adminCoupon.couponId, code: adminCoupon.code, userId, bookingId: created.id });
      }
      return created;
    });
  }

  /**
   * Creates a bus booking awaiting payment: re-checks the trip, seats, points and prices, then
   * holds the seats and writes the booking in one transaction. Retrying with the same
   * Idempotency-Key returns the original booking.
   */
  private async newBusBooking(
    userId: string,
    input: BookBusInput,
    idempotencyKey: string,
    ctx: RequestContext,
  ): Promise<BookingDetails> {
    const unavailable = 'This bus is no longer available. Please choose another.';
    const trip = await this.deps.buses.getTrip(input.tripId);
    const seatMap = trip && (await this.deps.buses.seatMap(input.tripId));
    if (!trip || !seatMap) throw new OfferExpiredError(unavailable);
    await this.assertListed('BUS', trip.serviceNumber);

    const boarding = trip.boardingPoints.find((p) => p.id === input.boardingPointId);
    const dropping = trip.droppingPoints.find((p) => p.id === input.droppingPointId);
    const issues = [];
    if (!boarding)
      issues.push({ path: 'body.boardingPointId', message: 'Choose a boarding point' });
    if (!dropping)
      issues.push({ path: 'body.droppingPointId', message: 'Choose a dropping point' });

    const seatsByNumber = new Map(seatMap.decks.flatMap((d) => d.seats).map((s) => [s.number, s]));
    const seats = input.passengers.map((p, i) => {
      const seat = seatsByNumber.get(p.seatNumber);
      if (!seat) {
        issues.push({
          path: `body.passengers.${i}.seatNumber`,
          message: `Seat ${p.seatNumber} does not exist on this bus`,
        });
      } else if (seat.ladiesOnly && p.gender !== 'FEMALE') {
        issues.push({
          path: `body.passengers.${i}.gender`,
          message: `Seat ${p.seatNumber} is reserved for women`,
        });
      }
      return seat;
    });
    if (issues.length > 0) throw new ValidationError(issues);
    if (seats.some((s) => !s?.available)) throw new SeatUnavailableError();

    const basePaise = seats.reduce((sum, s) => sum + (s?.basePaise ?? 0), 0);
    const taxPaise = seats.reduce((sum, s) => sum + (s?.taxPaise ?? 0), 0);
    const grossTotalPaise = basePaise + taxPaise;
    // Admin-created coupons first; the two built-in promo codes remain for existing customers.
    const adminCoupon = input.promoCode && this.deps.coupons
      ? await this.deps.coupons.quote({ code: input.promoCode, service: 'BUS', userId, orderPaise: grossTotalPaise })
      : null;
    const discountPaise = adminCoupon
      ? adminCoupon.discountPaise
      : input.promoCode?.toUpperCase() === 'ZPROO10'
      ? Math.floor(grossTotalPaise * 0.10)
      : input.promoCode?.toUpperCase() === 'BUS100'
        ? Math.min(10_000, grossTotalPaise)
        : 0;
    const totalPaise = grossTotalPaise - discountPaise;
    if (totalPaise !== input.expectedTotalPaise) throw new PriceChangedError(totalPaise);

    const seatNumbers = input.passengers.map((p) => p.seatNumber);
    return this.createHeld(userId, 'BUS', ctx, async (reference, tx) => {
      const repo = new BookingRepository(tx);
      const created = await repo.create({
        reference,
        userId,
        serviceType: 'BUS',
        status: 'PENDING_PAYMENT',
        paymentStatus: 'CREATED',
        baseAmountPaise: basePaise,
        taxAmountPaise: taxPaise,
        feeAmountPaise: 0,
        discountAmountPaise: discountPaise,
        totalAmountPaise: totalPaise,
        contactEmail: input.contact.email,
        contactPhone: input.contact.phone,
        travelDate: new Date(`${trip.date}T00:00:00Z`),
        holdExpiresAt: new Date(this.now().getTime() + (await this.holdMinutes()) * 60_000),
        idempotencyKey,
        metadata: { demo: this.deps.buses.isDemo, provider: this.deps.buses.name, promoCode: input.promoCode ?? null },
        passengers: {
          create: input.passengers.map((p, i) => ({
            sequence: i + 1,
            type: p.age < 12 ? 'CHILD' : 'ADULT',
            title: busTitle(p.gender, p.age),
            firstName: p.firstName,
            lastName: p.lastName,
            age: p.age,
            gender: p.gender,
            seatNumber: p.seatNumber,
          })),
        },
        bus: {
          create: {
            provider: trip.provider,
            offerId: trip.id,
            operatorName: trip.operator.name,
            originCity: trip.from.code,
            destinationCity: trip.to.code,
            departureAt: new Date(trip.departureAt),
            arrivalAt: new Date(trip.arrivalAt),
            seatNumbers,
            boardingPoint: boarding as unknown as Prisma.InputJsonValue,
            droppingPoint: dropping as unknown as Prisma.InputJsonValue,
            offer: trip as unknown as Prisma.InputJsonValue,
          },
        },
      });
      if (adminCoupon && this.deps.coupons) {
        await this.deps.coupons.redeem(tx, { couponId: adminCoupon.couponId, code: adminCoupon.code, userId, bookingId: created.id });
      }
      const { localTripId } = await this.deps.buses.hold(trip.id, seatNumbers, created.id, tx);
      if (localTripId)
        await tx.busBooking.update({
          where: { bookingId: created.id },
          data: { tripId: localTripId },
        });
      return created;
    });
  }

  /** Owners see their bookings; staff with booking:read:any see all. Others get 404, not 403. */
  async get(
    reference: string,
    viewer: { userId: string; canReadAny: boolean },
  ): Promise<BookingRecord> {
    const booking = await new BookingRepository(this.deps.prisma).findByReference(reference);
    if (!booking || (booking.userId !== viewer.userId && !viewer.canReadAny))
      throw new NotFoundError('Booking not found');
    return booking;
  }

  async getDetails(
    reference: string,
    viewer: { userId: string; canReadAny: boolean },
  ): Promise<BookingDetails> {
    return toBookingDetails(await this.get(reference, viewer));
  }

  async list(userId: string): Promise<BookingListItem[]> {
    return (await new BookingRepository(this.deps.prisma).listForUser(userId)).map(
      toBookingListItem,
    );
  }

  /** Cancels unpaid bookings whose hold ran out and returns their seats. Safe to run on every replica. */
  async expireHolds(): Promise<number> {
    const expired = await new BookingRepository(this.deps.prisma).findExpiredHolds(this.now());
    let count = 0;
    for (const booking of expired) {
      const done = await this.deps.prisma.$transaction(async (tx) => {
        const moved = await new BookingRepository(tx).transition(
          booking.id,
          'PENDING_PAYMENT',
          {
            status: 'CANCELLED',
            cancelledAt: this.now(),
            cancellationReason: 'HOLD_EXPIRED',
            paymentStatus: 'CANCELLED',
          },
          { holdExpiresAt: { lt: this.now() } },
        );
        if (!moved) return false; // paid or handled by another instance meanwhile
        for (const leg of booking.flights)
          await this.deps.flights.release(leg.offerId, leg.seats, tx);
        if (booking.bus) await this.deps.buses.release(booking.id, tx);
        await new PaymentRepository(tx).cancelOpenForBooking(booking.id);
        return true;
      });
      if (done) count += 1;
    }
    if (count > 0) this.deps.logger.info({ count }, 'Expired unpaid booking holds');
    return count;
  }

  // ───────── internals ─────────

  /** Refuses an item an admin has taken off sale. */
  private async assertListed(service: 'FLIGHT' | 'BUS' | 'TRAIN', id: string): Promise<void> {
    const hidden = await this.deps.unlisted?.(service);
    if (hidden?.has(id)) throw new OfferExpiredError('This service is no longer available. Please choose another.');
  }

  private async holdMinutes(): Promise<number> {
    const { holdMinutes } = this.deps;
    return typeof holdMinutes === 'number' ? holdMinutes : holdMinutes();
  }

  private countPassengers(input: BookFlightInput): PaxCounts {
    const count = (t: string) => input.passengers.filter((p) => p.type === t).length;
    const pax = { adults: count('ADULT'), children: count('CHILD'), infants: count('INFANT') };
    const issues = [];
    if (pax.adults < 1)
      issues.push({ path: 'body.passengers', message: 'At least one adult must travel' });
    if (pax.infants > pax.adults)
      issues.push({ path: 'body.passengers', message: 'Each infant must travel with an adult' });
    if (pax.adults + pax.children > 9)
      issues.push({
        path: 'body.passengers',
        message: 'Up to 9 travellers per booking (excluding infants)',
      });
    if (issues.length > 0) throw new ValidationError(issues);
    return pax;
  }

  private checkItinerary(offers: FlightOffer[]) {
    offers.forEach((offer, i) => {
      const previous = offers[i - 1];
      if (previous && Date.parse(offer.departureAt) < Date.parse(previous.arrivalAt)) {
        throw new ValidationError([
          {
            path: `body.offerIds.${i}`,
            message: 'This flight departs before the previous one lands',
          },
        ]);
      }
    });
  }

  private mockServiceKey(offerId: string): { flightId: string; date: string } | null {
    const m = /^mk_([a-z0-9]+)_(\d{4})(\d{2})(\d{2})_[EPBF]$/.exec(offerId);
    return m ? { flightId: m[1] as string, date: `${m[2]}-${m[3]}-${m[4]}` } : null;
  }

  /**
   * Retries with the same Idempotency-Key return the original booking. Checked before creating
   * and again if creating fails: a concurrent retry may have won the race (unique key conflict)
   * or taken the very seats this request wanted.
   */
  private async idempotent(
    userId: string,
    idempotencyKey: string,
    create: () => Promise<BookingDetails>,
  ): Promise<BookingDetails> {
    const repo = new BookingRepository(this.deps.prisma);
    const existing = await repo.findByIdempotencyKey(userId, idempotencyKey);
    if (existing) return toBookingDetails(existing);
    try {
      return await create();
    } catch (err) {
      const winner = await repo.findByIdempotencyKey(userId, idempotencyKey);
      if (winner) return toBookingDetails(winner);
      throw err;
    }
  }

  /** Holds inventory and writes a booking in one transaction (via `create`), with a unique reference. */
  private async createHeld(
    userId: string,
    service: 'FLIGHT' | 'BUS' | 'TRAIN',
    ctx: RequestContext,
    create: (reference: string, tx: Prisma.TransactionClient) => Promise<BookingRecord>,
  ): Promise<BookingDetails> {
    const booking = await this.withUniqueReference((reference) =>
      this.deps.prisma.$transaction((tx) => create(reference, tx)),
    );
    await this.deps.audit.record({
      action: 'BOOKING_CREATED',
      actorId: userId,
      entityType: 'Booking',
      entityId: booking.id,
      after: { reference: booking.reference, service, totalPaise: booking.totalAmountPaise },
      context: ctx,
    });
    return toBookingDetails(booking);
  }

  /** Booking references are random; on the (very rare) collision, try again with a new one. */
  private async withUniqueReference<T>(create: (reference: string) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await create(generateBookingReference(this.now()));
      } catch (err) {
        const collision =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          String((err.meta as { target?: unknown } | undefined)?.target ?? '').includes(
            'reference',
          );
        if (!collision || attempt >= 3) throw err;
      }
    }
  }
}

/** Title printed on bus tickets, from gender and age. */
function busTitle(gender: 'MALE' | 'FEMALE' | 'OTHER', age: number): string {
  if (gender === 'MALE') return age < 12 ? 'MSTR' : 'MR';
  if (gender === 'FEMALE') return age < 12 ? 'MISS' : 'MS';
  return 'MX';
}
