/**
 * Loads the development bus network (from @zproo/catalog) into the database. Idempotent; also
 * used by the API test setup.
 */
import type { PrismaClient } from '@prisma/client';
import {
  BUS_ROUTES,
  buildBusTimetable,
  COACH_TEMPLATES,
  FLEET,
  MOCK_BUS_OPERATORS,
  pointsFor,
  type CoachTemplate,
} from '@zproo/catalog';

export { buildBusTimetable, MOCK_BUS_OPERATORS };

export async function seedBusData(
  prisma: PrismaClient,
): Promise<{ services: number; routes: number }> {
  const operators = new Map<string, string>();
  for (const op of MOCK_BUS_OPERATORS) {
    const row = await prisma.busOperator.upsert({
      where: { code: op.code },
      update: { name: op.name, rating: op.rating, ratingCount: op.ratingCount },
      create: { ...op },
    });
    operators.set(op.code, row.id);
  }

  // One coach per operator and coach type.
  const buses = new Map<string, string>();
  for (const [operatorCode, types] of Object.entries(FLEET)) {
    const operatorId = operators.get(operatorCode) as string;
    for (const key of types) {
      const t = COACH_TEMPLATES.find((c) => c.key === key) as CoachTemplate;
      const data = {
        name: t.name,
        type: t.type,
        ac: t.ac,
        electric: t.electric,
        amenities: t.amenities,
      };
      const bus = await prisma.bus.upsert({
        where: { operatorId_code: { operatorId, code: key } },
        update: data,
        create: { operatorId, code: key, ...data },
      });
      for (const seat of t.seats()) {
        await prisma.busSeat.upsert({
          where: { busId_number: { busId: bus.id, number: seat.number } },
          update: seat,
          create: { busId: bus.id, ...seat },
        });
      }
      buses.set(`${operatorCode}:${key}`, bus.id);
    }
  }

  const routes = new Map<string, { id: string; minutes: number }>();
  for (const [a, b, km, minutes] of BUS_ROUTES) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ] as const) {
      const route = await prisma.busRoute.upsert({
        where: { originCity_destinationCity: { originCity: from, destinationCity: to } },
        update: { distanceKm: km },
        create: { originCity: from, destinationCity: to, distanceKm: km },
      });
      await prisma.busRoutePoint.deleteMany({ where: { routeId: route.id } });
      const boarding = pointsFor(from).slice(0, 4);
      // A city's points are listed outward from its centre, so an arriving bus meets them reversed.
      const dropping = [...pointsFor(to)].reverse().slice(0, 4);
      await prisma.busRoutePoint.createMany({
        data: [
          ...boarding.map(([name, address], i) => ({
            routeId: route.id,
            kind: 'BOARDING' as const,
            sequence: i + 1,
            name,
            address,
            offsetMinutes: i * 15,
          })),
          // Dropping offsets count back from arrival: the last point is reached at arrival.
          ...dropping.map(([name, address], i) => ({
            routeId: route.id,
            kind: 'DROPPING' as const,
            sequence: i + 1,
            name,
            address,
            offsetMinutes: (dropping.length - 1 - i) * 15,
          })),
        ],
      });
      routes.set(`${from}-${to}`, { id: route.id, minutes });
    }
  }

  const plans = buildBusTimetable();
  for (const plan of plans) {
    const route = routes.get(`${plan.from}-${plan.to}`);
    const busId = buses.get(`${plan.operatorCode}:${plan.template}`);
    if (!route || !busId)
      throw new Error(`Bus service ${plan.serviceNumber} has no route or coach`);
    const data = {
      busId,
      routeId: route.id,
      departureTime: plan.departureTime,
      durationMinutes: plan.durationMinutes,
      daysOfWeek: plan.daysOfWeek,
      baseFarePaise: plan.baseFarePaise,
      active: true,
    };
    await prisma.busSchedule.upsert({
      where: { serviceNumber: plan.serviceNumber },
      update: data,
      create: { serviceNumber: plan.serviceNumber, ...data },
    });
  }
  return { services: plans.length, routes: routes.size };
}
