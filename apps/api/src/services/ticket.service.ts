import { BRAND } from '@zproo/config';
import {
  TRAIN_CLASS_LABELS,
  TRAIN_QUOTA_LABELS,
  type BookingDetails,
  type BusBookingInfo,
  type FlightOffer,
  type TrainBookingInfo,
} from '@zproo/types';
import PDFDocument from 'pdfkit';

const RED = BRAND.colors.primary;
const DARK = BRAND.colors.foreground;
const MUTED = BRAND.colors.muted;
const BORDER = BRAND.colors.border;

/** PDF core fonts have no ₹ glyph, so amounts are printed as "INR 5,320". */
const money = (paise: number) =>
  `INR ${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const time = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
const date = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
const duration = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

export class TicketService {
  constructor(private readonly logoPath: string | undefined) {}

  /**
   * Flight or bus e-ticket. Demo bookings carry a watermark so they can never pass as a real
   * ticket.
   */
  ticket(booking: BookingDetails, options: { demo: boolean }): Promise<Buffer> {
    const bus = booking.bus;
    const train = booking.train ?? null;
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: { Title: `E-ticket ${booking.reference}`, Author: BRAND.name },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    const left = 40;
    const width = doc.page.width - 80;

    if (options.demo) {
      doc
        .save()
        .rotate(-35, { origin: [300, 420] })
        .fontSize(54)
        .fillColor(RED)
        .opacity(0.08);
      doc.text('DEMO — NOT VALID FOR TRAVEL', 20, 400, { width: 560, align: 'center' });
      doc.restore().opacity(1);
    }

    // Header
    if (this.logoPath) doc.image(this.logoPath, left, 38, { height: 30 });
    else doc.font('Helvetica-Bold').fontSize(20).fillColor(RED).text(BRAND.name, left, 40);
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(DARK)
      .text('E-TICKET', left, 40, { width, align: 'right' });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(`Booking ${booking.reference}`, left, 62, { width, align: 'right' });
    doc
      .moveTo(left, 82)
      .lineTo(left + width, 82)
      .strokeColor(RED)
      .lineWidth(2)
      .stroke();

    let y = 96;
    if (options.demo) {
      doc.roundedRect(left, y, width, 26, 6).fill('#FEF3C7');
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#92400E')
        .text(
          `Demo booking from the development ${train ? 'railway' : bus ? 'bus' : 'flight'} provider — not valid for travel.`,
          left + 10,
          y + 9,
        );
      y += 36;
    }

    const status = train
      ? train.reservationStatus === 'PARTIALLY_CANCELLED'
        ? 'Booked (partly cancelled)'
        : train.passengers.every((p) => p.status === 'CONFIRMED' || p.status === 'CANCELLED')
          ? 'Booked · confirmed'
          : 'Booked · not all berths confirmed'
      : booking.status === 'CONFIRMED'
        ? 'Confirmed'
        : booking.status.replace(/_/g, ' ').toLowerCase();
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text('STATUS', left, y)
      .text('BOOKED ON', left + 180, y)
      .text('CONTACT', left + 340, y);
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(DARK)
      .text(status, left, y + 12)
      .text(date(booking.createdAt, 'Asia/Kolkata'), left + 180, y + 12)
      .text(booking.contact.phone, left + 340, y + 12);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(booking.contact.email, left + 340, y + 27);
    y += 50;

    for (const leg of booking.flights)
      y = this.flightBlock(doc, leg.offer, leg.pnr, y, left, width);
    if (bus) y = this.busBlock(doc, bus, y, left, width);
    if (train) y = this.trainBlock(doc, train, y, left, width);

    // Passengers
    y = this.heading(doc, train ? 'Passengers' : 'Travellers', y, left);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED);
    if (train) {
      doc
        .text('#', left, y)
        .text('NAME', left + 24, y)
        .text('AGE / GENDER', left + 200, y)
        .text('BOOKING STATUS', left + 300, y)
        .text('CURRENT STATUS', left + 410, y);
      y += 16;
      booking.passengers.forEach((p, i) => {
        const t = train.passengers.find((x) => x.passengerId === p.id);
        doc.font('Helvetica').fontSize(10).fillColor(DARK);
        doc
          .text(String(i + 1), left, y)
          .text(`${p.firstName} ${p.lastName}`.trim(), left + 24, y, { width: 170 })
          .text(`${p.age ?? '-'} / ${p.gender.charAt(0) + p.gender.slice(1).toLowerCase()}`, left + 200, y)
          .text(t?.bookingStatus ?? '-', left + 300, y, { width: 105 })
          .font('Helvetica-Bold')
          .text(t?.status === 'CANCELLED' ? 'CANCELLED' : (t?.currentStatus ?? '-'), left + 410, y, {
            width: width - 410,
          });
        y += 18;
      });
      y += 8;
    } else if (bus) {
      doc
        .text('#', left, y)
        .text('NAME', left + 24, y)
        .text('AGE / GENDER', left + 250, y)
        .text('SEAT', left + 380, y);
      y += 16;
      booking.passengers.forEach((p, i) => {
        doc.font('Helvetica').fontSize(10).fillColor(DARK);
        doc
          .text(String(i + 1), left, y)
          .text(`${p.firstName} ${p.lastName}`, left + 24, y, { width: 220 })
          .text(
            `${p.age ?? '-'} / ${p.gender.charAt(0) + p.gender.slice(1).toLowerCase()}`,
            left + 250,
            y,
          )
          .font('Helvetica-Bold')
          .text(p.seatNumber ?? '-', left + 380, y);
        y += 18;
      });
      y += 8;
    } else {
      doc
        .text('#', left, y)
        .text('NAME', left + 24, y)
        .text('TYPE', left + 250, y)
        .text('E-TICKET NUMBER(S)', left + 330, y);
      y += 16;
      booking.passengers.forEach((p, i) => {
        const tickets = booking.flights
          .map((f) => f.tickets.find((t) => t.passengerId === p.id)?.ticketNumber)
          .filter(Boolean)
          .join(', ');
        doc.font('Helvetica').fontSize(10).fillColor(DARK);
        doc
          .text(String(i + 1), left, y)
          .text(`${p.title} ${p.firstName} ${p.lastName}`, left + 24, y, { width: 220 });
        doc
          .text(p.type.charAt(0) + p.type.slice(1).toLowerCase(), left + 250, y)
          .text(tickets || 'Pending', left + 330, y, { width: width - 330 });
        y += 18;
      });
      y += 8;
    }

    // Fare
    y = this.heading(doc, 'Fare summary', y, left);
    for (const line of booking.price.lines) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(DARK)
        .text(line.label, left, y)
        .text(money(line.amountPaise), left, y, { width, align: 'right' });
      y += 16;
    }
    doc
      .moveTo(left, y)
      .lineTo(left + width, y)
      .strokeColor(BORDER)
      .lineWidth(1)
      .stroke();
    y += 6;
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Total paid', left, y)
      .text(money(booking.price.totalPaise), left, y, { width, align: 'right' });
    y += 30;

    // Important information
    y = this.heading(doc, 'Important information', y, left);
    const notes = train
      ? [
          'This is a railway e-ticket only when issued by a live railway provider. Carry a valid photo ID during the journey.',
          'RAC and waitlisted passengers do not have a confirmed berth. A fully waitlisted e-ticket is cancelled automatically when the chart is prepared, and refunded.',
          'Check the latest PNR status in My Bookings before travelling. Cancellation charges follow the railway rules shown at booking.',
        ]
      : bus
      ? [
          'Reach your boarding point 15 minutes before the time shown. Buses do not wait for late passengers.',
          'Carry a government photo ID; the operator may check it against the traveller names.',
          `Cancellation: ${bus.offer.cancellationPolicy
            .map((r) =>
              r.hoursBefore > 0
                ? `${r.refundPercent}% refund more than ${r.hoursBefore}h before departure`
                : 'no refund after that',
            )
            .join('; ')}.`,
        ]
      : [
          'Carry a valid government photo ID (passport for international travel). Names must match the ID.',
          'Check-in closes 45 minutes before departure for domestic flights and 60 minutes for international flights.',
          'Cancellations and changes follow the airline fare rules shown at booking. Manage your booking in My Bookings.',
        ];
    doc.font('Helvetica').fontSize(9).fillColor(DARK);
    for (const note of notes) {
      doc.text(`•  ${note}`, left, y, { width });
      y = doc.y + 4;
    }

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(`${BRAND.name} — ${BRAND.tagline}`, left, doc.page.height - 50, {
        width,
        align: 'center',
      });
    doc.end();
    return done;
  }

  private busBlock(
    doc: PDFKit.PDFDocument,
    bus: BusBookingInfo,
    y: number,
    left: number,
    width: number,
  ): number {
    const { offer } = bus;
    const tz = 'Asia/Kolkata';
    const height = 150;
    doc.roundedRect(left, y, width, height, 8).lineWidth(1).strokeColor(BORDER).stroke();
    const x = left + 16;
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(DARK)
      .text(`${offer.operator.name}  ·  ${offer.serviceNumber}`, x, y + 14);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(RED)
      .text(bus.pnr ? `PNR ${bus.pnr}` : 'PNR pending', x, y + 14, {
        width: width - 32,
        align: 'right',
      });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(`${date(offer.departureAt, tz)}  ·  ${offer.bus.name}`, x, y + 30);
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(DARK)
      .text(time(bus.boardingPoint.time, tz), x, y + 48)
      .text(time(bus.droppingPoint.time, tz), x, y + 48, { width: width - 32, align: 'right' });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(`${duration(offer.durationMinutes)}  ·  ${offer.distanceKm} km`, x, y + 56, {
        width: width - 32,
        align: 'center',
      });
    const half = (width - 32) / 2;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(DARK)
      .text(`${offer.from.name} · ${bus.boardingPoint.name}`, x, y + 76, { width: half })
      .text(`${offer.to.name} · ${bus.droppingPoint.name}`, x + half, y + 76, {
        width: half,
        align: 'right',
      });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(bus.boardingPoint.address, x, y + 90, { width: half - 10 })
      .text(bus.droppingPoint.address, x + half + 10, y + 90, { width: half - 10, align: 'right' });
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(DARK)
      .text(
        `Seat${bus.seatNumbers.length === 1 ? '' : 's'}: ${bus.seatNumbers.join(', ')}`,
        x,
        y + 124,
      );
    return y + height + 16;
  }

  private trainBlock(
    doc: PDFKit.PDFDocument,
    train: TrainBookingInfo,
    y: number,
    x: number,
    width: number,
  ): number {
    const { offer } = train;
    const tz = 'Asia/Kolkata';
    doc.roundedRect(x, y, width, 112, 8).strokeColor(BORDER).lineWidth(1).stroke();
    const inner = x + 16;
    const w = width - 32;
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(DARK)
      .text(`${offer.trainNumber} ${offer.trainName}`, inner, y + 12, { width: w - 150 })
      .fillColor(RED)
      .text(train.pnr ? `PNR ${train.pnr}` : 'PNR pending', inner, y + 12, { width: w, align: 'right' });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        `${date(offer.departureAt, tz)}  ·  ${TRAIN_CLASS_LABELS[train.travelClass]}  ·  ${TRAIN_QUOTA_LABELS[train.quota]} quota${train.chartStatus ? `  ·  ${train.chartStatus}` : ''}`,
        inner,
        y + 30,
        { width: w },
      );
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(DARK)
      .text(time(offer.departureAt, tz), inner, y + 48)
      .text(time(offer.arrivalAt, tz), inner, y + 48, { width: w, align: 'right' });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(`${duration(offer.durationMinutes)} · ${offer.distanceKm} km`, inner, y + 54, { width: w, align: 'center' });
    const half = w / 2;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(DARK)
      .text(`${offer.from.name} (${offer.from.code})`, inner, y + 76, { width: half })
      .text(`${offer.to.name} (${offer.to.code})`, inner + half, y + 76, { width: half, align: 'right' });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(date(offer.departureAt, tz), inner, y + 92, { width: half })
      .text(date(offer.arrivalAt, tz), inner + half, y + 92, { width: half, align: 'right' });
    return y + 128;
  }

  private heading(doc: PDFKit.PDFDocument, text: string, y: number, left: number): number {
    if (y > doc.page.height - 140) {
      doc.addPage();
      y = 40;
    }
    doc.font('Helvetica-Bold').fontSize(12).fillColor(RED).text(text.toUpperCase(), left, y);
    return y + 20;
  }

  private flightBlock(
    doc: PDFKit.PDFDocument,
    offer: FlightOffer,
    pnr: string | null,
    y: number,
    left: number,
    width: number,
  ): number {
    const height = 96 + (offer.segments.length - 1) * 22;
    if (y + height > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    doc.roundedRect(left, y, width, height, 8).strokeColor(BORDER).lineWidth(1).stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(DARK)
      .text(`${offer.airline.name}  ·  ${offer.flightNumber}`, left + 14, y + 12);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        `${date(offer.departureAt, offer.from.timezone)}  ·  ${offer.cabin.replace('_', ' ')} (${offer.fareFamily})`,
        left + 14,
        y + 27,
      );
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(RED)
      .text(`PNR ${pnr ?? 'pending'}`, left, y + 12, { width: width - 14, align: 'right' });

    const row = y + 46;
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(DARK)
      .text(time(offer.departureAt, offer.from.timezone), left + 14, row);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(`${offer.from.code} · ${offer.from.city}`, left + 14, row + 24);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        `${duration(offer.durationMinutes)} · ${offer.stops === 0 ? 'Non-stop' : `${offer.stops} stop via ${offer.layovers.map((l) => l.airport.code).join(', ')}`}`,
        left + 150,
        row + 6,
        { width: 200, align: 'center' },
      );
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(DARK)
      .text(time(offer.arrivalAt, offer.to.timezone), left, row, {
        width: width - 14,
        align: 'right',
      });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(`${offer.to.code} · ${offer.to.city}`, left, row + 24, {
        width: width - 14,
        align: 'right',
      });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `Baggage: cabin ${offer.baggage.cabinKg} kg, check-in ${offer.baggage.checkInKg} kg per adult/child`,
        left + 14,
        y + height - 16,
      );
    return y + height + 14;
  }
}
