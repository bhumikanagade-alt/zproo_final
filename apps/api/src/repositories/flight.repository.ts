import type { CabinClass, Prisma } from '@prisma/client';
import type { Db } from './db';

export const scheduleInclude = {
  airline: true,
  origin: true,
  destination: true,
  segments: {
    include: { airline: true, origin: true, destination: true },
    orderBy: { sequence: 'asc' },
  },
} satisfies Prisma.FlightInclude;

export type FlightSchedule = Prisma.FlightGetPayload<{ include: typeof scheduleInclude }>;

export class FlightRepository {
  constructor(private readonly db: Db) {}

  findRoute(fromCode: string, toCode: string, weekday: number) {
    return this.db.flight.findMany({
      where: {
        active: true,
        origin: { code: fromCode },
        destination: { code: toCode },
        daysOfWeek: { has: weekday },
      },
      include: scheduleInclude,
    });
  }

  findById(id: string) {
    return this.db.flight.findFirst({ where: { id, active: true }, include: scheduleInclude });
  }

  soldSeats(flightIds: string[], date: Date, cabin: CabinClass) {
    return this.db.flightInventory.findMany({
      where: { flightId: { in: flightIds }, date, cabin },
    });
  }

  /** Creates the inventory row on first use, then takes seats only if enough remain (atomic). */
  async takeSeats(
    flightId: string,
    date: Date,
    cabin: CabinClass,
    capacity: number,
    seats: number,
  ): Promise<boolean> {
    // ON CONFLICT DO NOTHING: two first bookings on the same service can't both try to create it.
    await this.db.$executeRaw`
      INSERT INTO flight_inventory (id, flight_id, date, cabin, capacity, sold)
      VALUES (gen_random_uuid()::text, ${flightId}, ${date}, ${cabin}::"CabinClass", ${capacity}, 0)
      ON CONFLICT (flight_id, date, cabin) DO NOTHING`;
    const updated = await this.db.$executeRaw`
      UPDATE flight_inventory SET sold = sold + ${seats}
      WHERE flight_id = ${flightId} AND date = ${date} AND cabin = ${cabin}::"CabinClass" AND sold + ${seats} <= capacity`;
    return updated === 1;
  }

  async returnSeats(flightId: string, date: Date, cabin: CabinClass, seats: number): Promise<void> {
    await this.db.$executeRaw`
      UPDATE flight_inventory SET sold = GREATEST(sold - ${seats}, 0)
      WHERE flight_id = ${flightId} AND date = ${date} AND cabin = ${cabin}::"CabinClass"`;
  }
}
