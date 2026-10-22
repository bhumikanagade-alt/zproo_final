import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { seedBusData } from '../../../prisma/seed/buses';
import { seedFlightData } from '../../../prisma/seed/flights';
import { seedReferenceData } from '../../../prisma/seed/reference';
import { TEST_DATABASE_URL } from './testUrls';

const repoRoot = path.resolve(import.meta.dirname, '../../..');

/** Creates/migrates the test database and loads reference data, the flight timetable and the bus network once per run. */
export default async function setup() {
  const url = TEST_DATABASE_URL;
  if (!url.includes('test')) {
    throw new Error(
      `Refusing to run tests against a database whose URL does not contain "test": ${url.replace(/\/\/.*@/, '//***@')}`,
    );
  }
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: url, DIRECT_DATABASE_URL: url },
    stdio: 'pipe',
  });
  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    await seedReferenceData(prisma);
    await seedFlightData(prisma);
    await seedBusData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
