import { Prisma } from '@prisma/client';
import type { Db } from './db';

export const busScheduleInclude = {
  bus: {
    include: {
      operator: true,
      seats: { orderBy: [{ deck: 'asc' }, { row: 'asc' }, { column: 'asc' }] },
    },
  },
  route: { include: { points: { orderBy: { sequence: 'asc' } } } },
} satisfies Prisma.BusScheduleInclude;

export type BusScheduleRecord = Prisma.BusScheduleGetPayload<{
  include: typeof busScheduleInclude;
}>;

export class BusRepository {
  constructor(private readonly db: Db) {}

  findRoute(fromCity: string, toCity: string, weekday: number) {
    return this.db.busSchedule.findMany({
      where: {
        active: true,
        daysOfWeek: { has: weekday },
        route: { originCity: fromCity, destinationCity: toCity },
      },
      include: busScheduleInclude,
    });
  }

  findSchedule(id: string) {
    return this.db.busSchedule.findFirst({
      where: { id, active: true },
      include: busScheduleInclude,
    });
  }

  /** Seat IDs already held or sold per schedule on a date. */
  async takenSeats(scheduleIds: string[], date: Date): Promise<Map<string, Set<string>>> {
    const rows = await this.db.busSeatBooking.findMany({
      where: { trip: { scheduleId: { in: scheduleIds }, date } },
      select: { seatId: true, trip: { select: { scheduleId: true } } },
    });
    const taken = new Map<string, Set<string>>();
    for (const row of rows) {
      const set = taken.get(row.trip.scheduleId) ?? new Set<string>();
      set.add(row.seatId);
      taken.set(row.trip.scheduleId, set);
    }
    return taken;
  }

  /** The trip row for a schedule and date, created on first use (safe under concurrency). */
  async ensureTrip(scheduleId: string, date: Date): Promise<string> {
    await this.db.$executeRaw`
      INSERT INTO bus_trips (id, schedule_id, date)
      VALUES (gen_random_uuid()::text, ${scheduleId}, ${date})
      ON CONFLICT (schedule_id, date) DO NOTHING`;
    const trip = await this.db.busTrip.findUniqueOrThrow({
      where: { scheduleId_date: { scheduleId, date } },
      select: { id: true },
    });
    return trip.id;
  }

  /**
   * Holds seats for a booking. The unique (trip, seat) constraint makes this all-or-nothing:
   * if any seat is already taken, nothing is written and false is returned.
   */
  async takeSeats(tripId: string, seatIds: string[], bookingId: string): Promise<boolean> {
    try {
      await this.db.busSeatBooking.createMany({
        data: seatIds.map((seatId) => ({ tripId, seatId, bookingId })),
      });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false;
      throw err;
    }
  }

  releaseSeats(bookingId: string) {
    return this.db.busSeatBooking.deleteMany({ where: { bookingId } });
  }
}
