/**
 * Loads the development flight timetable (from @zproo/catalog) into the database: airports,
 * airlines and scheduled services. Idempotent; also used by the API test setup.
 */
import type { PrismaClient } from '@prisma/client';
import { buildTimetable, MOCK_AIRLINES, planSeats } from '@zproo/catalog';
import { AIRPORTS, airportTimezone } from '@zproo/config';

export { buildTimetable, MOCK_AIRLINES };

export async function seedFlightData(prisma: PrismaClient): Promise<{ flights: number }> {
  for (const airport of AIRPORTS) {
    await prisma.airport.upsert({
      where: { code: airport.code },
      update: {
        name: airport.name,
        city: airport.city,
        country: airport.country,
        timezone: airportTimezone(airport),
      },
      create: {
        code: airport.code,
        name: airport.name,
        city: airport.city,
        country: airport.country,
        timezone: airportTimezone(airport),
      },
    });
  }
  for (const airline of MOCK_AIRLINES) {
    await prisma.airline.upsert({
      where: { code: airline.code },
      update: { name: airline.name },
      create: airline,
    });
  }
  const airports = new Map((await prisma.airport.findMany()).map((a) => [a.code, a.id]));
  const airlines = new Map((await prisma.airline.findMany()).map((a) => [a.code, a.id]));
  const id = (map: Map<string, string>, key: string) => {
    const value = map.get(key);
    if (!value) throw new Error(`Unknown code ${key}`);
    return value;
  };

  const plans = buildTimetable();
  for (const plan of plans) {
    const first = plan.segments[0];
    const last = plan.segments.at(-1);
    if (!first || !last) continue;
    const airlineId = id(airlines, plan.airline);
    const data = {
      originId: id(airports, first.from),
      destinationId: id(airports, last.to),
      daysOfWeek: plan.daysOfWeek,
      baseFarePaise: plan.baseFareRupees * 100,
      seatsEconomy: planSeats(plan).ECONOMY,
      seatsPremium: planSeats(plan).PREMIUM_ECONOMY,
      seatsBusiness: planSeats(plan).BUSINESS,
      seatsFirst: planSeats(plan).FIRST,
      aircraft: plan.aircraft,
    };
    const flight = await prisma.flight.upsert({
      where: { airlineId_flightNumber: { airlineId, flightNumber: plan.flightNumber } },
      update: data,
      create: { airlineId, flightNumber: plan.flightNumber, ...data },
    });
    await prisma.flightSegment.deleteMany({ where: { flightId: flight.id } });
    await prisma.flightSegment.createMany({
      data: plan.segments.map((seg, i) => ({
        flightId: flight.id,
        sequence: i + 1,
        airlineId,
        flightNumber: plan.flightNumber,
        originId: id(airports, seg.from),
        destinationId: id(airports, seg.to),
        departureTime: seg.departureTime,
        dayOffset: seg.dayOffset,
        durationMinutes: seg.durationMinutes,
      })),
    });
  }
  return { flights: plans.length };
}
