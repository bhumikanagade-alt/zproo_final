/**
 * Reference data every environment needs: roles, permissions and default settings.
 * Idempotent. Used by `prisma/seed.ts` and by the API test setup.
 */
import type { PrismaClient } from '@prisma/client';
import { PERMISSION_DESCRIPTIONS, ROLE_PERMISSIONS, RoleName } from '@zproo/types';

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  USER: 'Customer',
  ADMIN: 'Platform administrator',
  SUPER_ADMIN: 'Full access including roles and system settings',
  SUPPORT: 'Customer support agent',
  OPERATOR: 'Operations: inventory, bookings and drivers',
  DRIVER: 'Cab or bike driver',
  HOTEL_PARTNER: 'Hotel partner managing own properties',
  TRAVEL_PARTNER: 'Travel partner managing own inventory',
  CORPORATE_ADMIN: 'Administrator of a corporate account',
};

const SYSTEM_SETTINGS: { key: string; value: unknown; description: string }[] = [
  {
    key: 'booking.holdMinutes',
    value: 10,
    description: 'Minutes a seat or room is held before payment',
  },
  { key: 'otp.ttlSeconds', value: 300, description: 'OTP validity in seconds' },
  { key: 'otp.resendSeconds', value: 60, description: 'Minimum seconds between OTP sends' },
  {
    key: 'wallet.maxBalancePaise',
    value: 20000000,
    description: 'Maximum wallet balance (₹2,00,000)',
  },
  { key: 'support.hours', value: '24x7', description: 'Customer support availability' },
];

async function seedPermissions(prisma: PrismaClient) {
  for (const [key, description] of Object.entries(PERMISSION_DESCRIPTIONS)) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }
}

async function seedRoles(prisma: PrismaClient) {
  const permissions = await prisma.permission.findMany({ select: { id: true, key: true } });
  const idByKey = new Map(permissions.map((p) => [p.key, p.id]));

  for (const name of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: ROLE_DESCRIPTIONS[name] },
      create: { name, description: ROLE_DESCRIPTIONS[name], isSystem: true },
    });
    const wanted = ROLE_PERMISSIONS[name].map((key) => {
      const id = idByKey.get(key);
      if (!id) throw new Error(`Permission ${key} missing — seedPermissions must run first`);
      return id;
    });
    // Replace the role's permission set so removals in code propagate to the database.
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: wanted.map((permissionId) => ({ roleId: role.id, permissionId })),
      }),
    ]);
  }
}

async function seedSettings(prisma: PrismaClient) {
  for (const setting of SYSTEM_SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      // Never overwrite values an admin may have changed.
      update: {},
      create: { key: setting.key, value: setting.value as never, description: setting.description },
    });
  }
}

export async function seedReferenceData(prisma: PrismaClient): Promise<void> {
  await seedPermissions(prisma);
  await seedRoles(prisma);
  await seedSettings(prisma);
}
