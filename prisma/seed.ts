/**
 * Seeds the database (`npm run db:seed`). Idempotent — safe to run repeatedly.
 * Reference data (roles, permissions, settings) plus development demo data.
 */
import { PrismaClient } from '@prisma/client';
import { seedAdminContent } from './seed/admin';
import { seedDemoUsers } from './seed/demoUsers';
import { seedBusData } from './seed/buses';
import { seedFlightData } from './seed/flights';
import { seedReferenceData } from './seed/reference';

const prisma = new PrismaClient();

/**
 * Demo staff accounts (with known sign-in) and one-time codes must never be created on a real
 * database: they are only seeded when the database is on this machine (or ALLOW_DEMO_SEED=true).
 */
function demoSeedAllowed(): boolean {
  if (process.env.ALLOW_DEMO_SEED === 'true') return true;
  if (process.env.NODE_ENV === 'production') return false;
  let host = '';
  try {
    host = new URL(process.env.DATABASE_URL ?? '').hostname;
  } catch {
    return false;
  }
  return ['localhost', '127.0.0.1', '::1', '[::1]', 'postgres', 'db', 'host.docker.internal'].includes(host);
}

async function main() {
  await seedReferenceData(prisma);
  const allowDemo = demoSeedAllowed();
  if (!allowDemo) {
    console.warn('Skipping demo users: the database is not local (set ALLOW_DEMO_SEED=true to override).');
  }
  const demo = allowDemo ? await seedDemoUsers(prisma) : { printed: '' };
  const { flights } = await seedFlightData(prisma);
  const buses = await seedBusData(prisma);
  await seedAdminContent(prisma);
  const [roles, permissions, settings, users] = await Promise.all([
    prisma.role.count(),
    prisma.permission.count(),
    prisma.systemSetting.count(),
    prisma.user.count(),
  ]);
  console.info(
    `Seed complete: ${roles} roles, ${permissions} permissions, ${settings} settings, ${users} users, ${flights} flight services, ${buses.services} bus services on ${buses.routes} routes`,
  );
  if (demo.printed) console.info(demo.printed);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
