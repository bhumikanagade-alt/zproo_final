import { findCity } from '@zproo/config';
import {
  TRAIN_CLASS_LABELS,
  type BerthPreference,
  type FoodChoice,
  type TrainBookingInfo,
  type TrainClass,
  type TrainFare,
  type TrainOffer,
  type TrainQuota,
} from '@zproo/types';
import type {
  BookingDetails,
  FlightAddOnsSelection,
  BookingListItem,
  BusBookingInfo,
  BusPoint,
  BusTripOffer,
  FlightOffer,
  PassengerType,
  PriceBreakdown,
} from '@zproo/types';
import type { BookingRecord } from '../repositories/booking.repository';
import { flightPriceBreakdown } from '../services/flightPricing';
import { trainPriceLines, trainStatusLabel } from '@zproo/utils';

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function paxCounts(booking: BookingRecord) {
  const count = (t: PassengerType) => booking.passengers.filter((p) => p.type === t).length;
  return { adults: count('ADULT'), children: count('CHILD'), infants: count('INFANT') };
}

function busInfo(booking: BookingRecord): BusBookingInfo | null {
  const bus = booking.bus;
  if (!bus) return null;
  return {
    offer: bus.offer as unknown as BusTripOffer,
    seatNumbers: bus.seatNumbers,
    boardingPoint: bus.boardingPoint as unknown as BusPoint,
    droppingPoint: bus.droppingPoint as unknown as BusPoint,
    pnr: bus.pnr,
  };
}

type TrainCaps = TrainBookingInfo['capabilities'];
const NO_TRAIN_CAPS: TrainCaps = { cancellation: false, partialCancellation: false, liveStatus: false };

function trainInfo(booking: BookingRecord): TrainBookingInfo | null {
  const t = booking.train;
  if (!t) return null;
  const meta = booking.metadata as { trainCapabilities?: TrainCaps } | null;
  return {
    offer: t.offer as unknown as TrainOffer,
    travelClass: t.travelClass as TrainClass,
    quota: t.quota as TrainQuota,
    confirmOnly: t.confirmOnly,
    provider: t.provider,
    pnr: t.pnr,
    providerReference: t.providerReference,
    reservationStatus: t.reservationStatus,
    chartStatus: t.chartStatus,
    lastCheckedAt: iso(t.lastCheckedAt),
    failureReason: t.failureReason,
    fare: t.fare as unknown as TrainFare,
    passengers: t.passengers.map((p) => ({
      passengerId: p.bookingPassengerId,
      berthPreference: p.berthPreference as BerthPreference,
      foodChoice: (p.foodChoice as FoodChoice | null) ?? null,
      status: p.status,
      bookingStatus: p.bookingStatus,
      currentStatus: p.currentStatus,
      coach: p.coach,
      berth: p.berth,
      berthType: p.berthType,
      farePaise: p.farePaise,
      cancelledAt: iso(p.cancelledAt),
    })),
    cancellations: t.cancellations.map((c) => ({
      id: c.id,
      passengerIds: c.passengerIds,
      status: c.status,
      chargesPaise: c.chargesPaise,
      refundPaise: c.refundPaise,
      failureReason: c.failureReason,
      createdAt: c.createdAt.toISOString(),
      completedAt: iso(c.completedAt),
    })),
    refunds: booking.refunds.map((r) => ({
      id: r.id,
      amountPaise: r.amountPaise,
      status: r.status,
      reason: r.reason,
      gatewayReference: r.gatewayRefundId,
      createdAt: r.createdAt.toISOString(),
      completedAt: iso(r.completedAt),
    })),
    capabilities: meta?.trainCapabilities ?? NO_TRAIN_CAPS,
  };
}

function flightAddOns(booking: BookingRecord): FlightAddOnsSelection | undefined {
  const meta = booking.metadata as { addOns?: FlightAddOnsSelection | null } | null;
  return meta?.addOns ?? undefined;
}

/** Customer-facing lines for the stored amounts; amounts always come from the booking itself. */
function priceLines(booking: BookingRecord, offers: FlightOffer[]): PriceBreakdown['lines'] {
  if (booking.train) {
    return trainPriceLines(
      booking.train.fare as unknown as TrainFare,
      booking.train.passengers.length,
      booking.feeAmountPaise,
    );
  }
  if (booking.serviceType === 'FLIGHT')
    return flightPriceBreakdown(offers, paxCounts(booking), flightAddOns(booking)).lines;
  const seats = booking.passengers.length;
  return [
    {
      label: `Base fare — ${seats} seat${seats === 1 ? '' : 's'}`,
      amountPaise: booking.baseAmountPaise,
    },
    ...(booking.taxAmountPaise > 0 ? [{ label: 'GST', amountPaise: booking.taxAmountPaise }] : []),
  ];
}

export function toBookingDetails(booking: BookingRecord): BookingDetails {
  const offers = booking.flights.map((f) => f.offer as unknown as FlightOffer);
  return {
    reference: booking.reference,
    serviceType:
      booking.serviceType === 'BUS' ? 'BUS' : booking.serviceType === 'TRAIN' ? 'TRAIN' : 'FLIGHT',
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    createdAt: booking.createdAt.toISOString(),
    holdExpiresAt: iso(booking.holdExpiresAt),
    confirmedAt: iso(booking.confirmedAt),
    cancelledAt: iso(booking.cancelledAt),
    travelDate: isoDate(booking.travelDate),
    // Amounts come from the stored booking (what was charged), not re-computed.
    price: {
      lines: priceLines(booking, offers),
      currency: 'INR',
      basePaise: booking.baseAmountPaise,
      taxesPaise: booking.taxAmountPaise,
      feesPaise: booking.feeAmountPaise,
      discountPaise: booking.discountAmountPaise,
      totalPaise: booking.totalAmountPaise,
    },
    contact: { email: booking.contactEmail, phone: booking.contactPhone },
    passengers: booking.passengers.map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth ? isoDate(p.dateOfBirth) : null,
      age: p.age,
      gender: p.gender,
      seatNumber: p.seatNumber,
    })),
    flights: booking.flights.map((f, i) => ({
      sequence: f.sequence,
      offer: offers[i] as FlightOffer,
      pnr: f.pnr,
      tickets: (f.tickets as { passengerId: string; ticketNumber: string }[] | null) ?? [],
    })),
    bus: busInfo(booking),
    train: trainInfo(booking),
    ...(flightAddOns(booking) ? { addOns: flightAddOns(booking) } : {}),
  };
}

export function toBookingListItem(booking: BookingRecord): BookingListItem {
  const train = trainInfo(booking);
  if (train) {
    const n = train.passengers.length;
    return {
      reference: booking.reference,
      serviceType: booking.serviceType,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      title: `${train.offer.from.name} → ${train.offer.to.name}`,
      subtitle: `${train.offer.trainNumber} ${train.offer.trainName} · ${TRAIN_CLASS_LABELS[train.travelClass] ?? train.travelClass} · ${n} passenger${n === 1 ? '' : 's'}${train.pnr ? ` · PNR ${train.pnr}` : ''}`,
      travelDate: isoDate(booking.travelDate),
      totalPaise: booking.totalAmountPaise,
      createdAt: booking.createdAt.toISOString(),
      statusLabel: trainStatusLabel(train, booking.status),
    };
  }
  if (booking.bus) {
    const seats = booking.bus.seatNumbers;
    return {
      reference: booking.reference,
      serviceType: booking.serviceType,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      title: `${findCity(booking.bus.originCity)?.name ?? booking.bus.originCity} → ${findCity(booking.bus.destinationCity)?.name ?? booking.bus.destinationCity}`,
      subtitle: `${booking.bus.operatorName} · Seat${seats.length === 1 ? '' : 's'} ${seats.join(', ')}`,
      travelDate: isoDate(booking.travelDate),
      totalPaise: booking.totalAmountPaise,
      createdAt: booking.createdAt.toISOString(),
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    };
  }
  const first = booking.flights[0];
  const last = booking.flights.at(-1);
  const roundTrip = booking.flights.length === 2 && first?.originCode === last?.destinationCode;
  return {
    reference: booking.reference,
    serviceType: booking.serviceType,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    title:
      first && last
        ? `${first.originCode} ${roundTrip ? '⇄' : '→'} ${roundTrip ? first.destinationCode : last.destinationCode}`
        : 'Booking',
    subtitle: `${booking.passengers.length} traveller${booking.passengers.length === 1 ? '' : 's'} · ${booking.flights.length} flight${booking.flights.length === 1 ? '' : 's'}`,
    travelDate: isoDate(booking.travelDate),
    totalPaise: booking.totalAmountPaise,
    createdAt: booking.createdAt.toISOString(),
  };
}
