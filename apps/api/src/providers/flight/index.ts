import type { PrismaClient } from '@prisma/client';
import type { Env } from '../../config/env';
import type { FlightProvider } from './FlightProvider';
import { MockFlightProvider } from './MockFlightProvider';

export type { FlightLegQuery, FlightProvider, IssuedTickets } from './FlightProvider';

export function createFlightProvider(
  env: Pick<Env, 'FLIGHT_PROVIDER'>,
  prisma: PrismaClient,
): FlightProvider {
  switch (env.FLIGHT_PROVIDER) {
    case 'mock':
      return new MockFlightProvider(prisma);
  }
}
