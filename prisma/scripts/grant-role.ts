/**
 * Grants a role to an existing account — how the first super admin is created in production.
 *
 *   npm run admin:grant -- +919876543210 SUPER_ADMIN
 *   npm run admin:grant -- owner@company.com ADMIN
 *
 * The person signs up on the website first (mobile OTP), then you run this once on the server.
 * They must sign in again for the new role to apply.
 */
import 'dotenv/config';
import { PrismaClient, RoleName } from '@prisma/client';

const [identifier, roleArg = 'SUPER_ADMIN'] = process.argv.slice(2);
const prisma = new PrismaClient();

async function main() {
  if (!identifier) throw new Error('Usage: npm run admin:grant -- <mobile or email> [ROLE]');
  const role = roleArg.toUpperCase() as RoleName;
  if (!Object.values(RoleName).includes(role)) throw new Error(`Unknown role ${roleArg}. Use one of: ${Object.values(RoleName).join(', ')}`);
  const phone = identifier.replace(/[\s-]/g, '');
  const user = await prisma.user.findFirst({
    where: { deletedAt: null, OR: [{ email: identifier.toLowerCase() }, { phone }, { phone: `+91${phone.replace(/^\+?91/, '')}` }] },
  });
  if (!user) throw new Error(`No account found for ${identifier}. Ask them to sign up on the website first.`);
  const roleRow = await prisma.role.findUniqueOrThrow({ where: { name: role } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: roleRow.id } },
    create: { userId: user.id, roleId: roleRow.id },
    update: {},
  });
  await prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await prisma.auditLog.create({
    data: { action: 'user.roles', entityType: 'User', entityId: user.id, after: { summary: `Granted ${role} to ${user.fullName} from the command line` } },
  });
  console.info(`${user.fullName} is now ${role}. They should sign in again.`);
}

main()
  .catch((error: unknown) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
