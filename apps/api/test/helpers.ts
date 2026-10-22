import { PrismaClient, type RoleName } from '@prisma/client';
import type { SocialProvider } from '@zproo/validation';
import { pino } from 'pino';
import { createApp } from '../src/app';
import { parseEnv } from '../src/config/env';
import { createServices, type Providers } from '../src/container';
import type { EmailMessage, EmailProvider } from '../src/providers/email';
import type { IdentityVerifier, VerifiedIdentity } from '../src/providers/identity';
import type { SmsMessage, SmsProvider } from '../src/providers/sms';
import type { DependencyCheck } from '../src/services/health.service';
import { AuthenticationError } from '../src/utils/errors';

export const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  FRONTEND_URL: 'http://localhost:5173',
  JWT_SECRET: 'test-access-secret-000000000000000000000000',
  JWT_REFRESH_SECRET: 'test-refresh-secret-11111111111111111111111',
};

export const up = (name: string): DependencyCheck => ({ name, check: async () => {} });
export const down = (name: string, message = 'connection refused'): DependencyCheck => ({
  name,
  check: async () => {
    throw new Error(message);
  },
});

/** One shared client for the test database. */
export const prisma = new PrismaClient();

/** Records messages instead of sending them; behaves like a real (non-development) provider. */
export class FakeSmsProvider implements SmsProvider {
  readonly name = 'fake';
  readonly isDevelopment = false;
  readonly sent: SmsMessage[] = [];
  async send(message: SmsMessage) {
    this.sent.push(message);
  }
  lastCodeFor(to: string): string {
    const message = this.sent.filter((m) => m.to === to).at(-1);
    const code = message?.body.match(/\b\d{6}\b/)?.[0];
    if (!code) throw new Error(`No code sent to ${to}`);
    return code;
  }
}

export class FakeEmailProvider implements EmailProvider {
  readonly name = 'fake';
  readonly isDevelopment = false;
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage) {
    this.sent.push(message);
  }
  lastCodeFor(to: string): string {
    const code = this.sent
      .filter((m) => m.to === to)
      .at(-1)
      ?.text.match(/\b\d{6}\b/)?.[0];
    if (!code) throw new Error(`No code sent to ${to}`);
    return code;
  }
}

/** Accepts tokens of the form `valid:<key>` for identities registered with `add()`. */
export class FakeIdentityVerifier implements IdentityVerifier {
  private readonly identities = new Map<string, VerifiedIdentity>();
  constructor(readonly provider: SocialProvider) {}
  add(key: string, identity: Omit<VerifiedIdentity, 'provider'>): string {
    this.identities.set(key, { provider: this.provider, ...identity });
    return `valid:${key}`.padEnd(24, '.');
  }
  async verify(idToken: string): Promise<VerifiedIdentity> {
    const identity = this.identities.get(idToken.replace(/\.+$/, '').replace(/^valid:/, ''));
    if (!idToken.startsWith('valid:') || !identity) {
      // Same failure the real OIDC verifier raises.
      throw new AuthenticationError('Could not verify your sign-in. Please try again.');
    }
    return identity;
  }
}

interface TestContextOptions {
  checks?: DependencyCheck[];
  env?: Record<string, string>;
  providers?: Partial<Providers>;
}

export function createTestContext(options: TestContextOptions = {}) {
  const env = parseEnv({ ...baseEnv, ...options.env });
  const sms = new FakeSmsProvider();
  const email = new FakeEmailProvider();
  const google = new FakeIdentityVerifier('google');
  const logger = pino({ level: 'silent' });
  const services = createServices({
    env,
    logger,
    prisma,
    providers: { sms, email, identityVerifiers: { google }, ...options.providers },
    healthChecks: options.checks ?? [up('database'), up('redis')],
    healthTimeoutMs: 200,
  });
  return { app: createApp({ env, logger, services }), env, services, sms, email, google };
}

export function buildTestApp(options: TestContextOptions = {}) {
  return createTestContext(options).app;
}

/** Removes all user and booking data between tests; roles, permissions, settings and the timetable stay. */
export async function resetUsers() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE users, otp_codes, refresh_tokens, audit_logs, auth_identities, addresses, user_roles, ' +
      'payments, flight_bookings, bus_bookings, bus_seat_bookings, bus_trips, booking_passengers, bookings, ' +
      'flight_inventory, train_inventory, refunds, train_bookings, admin_records, wallets, wallet_transactions RESTART IDENTITY CASCADE',
  );
  await prisma.$executeRawUnsafe('ALTER SEQUENCE admin_ticket_number_seq RESTART WITH 1041');
  await prisma.systemSetting.deleteMany({ where: { key: { in: ['platform.settings', 'inventory.unlisted'] } } });
}

let nextPhone = 100_000_000 + Math.floor(Math.random() * 800_000_000);
/** A fresh, valid Indian mobile number per call (keeps per-number rate limits independent). */
export function uniquePhone(): string {
  nextPhone += 1;
  return `+917${nextPhone}`;
}

type TestContext = ReturnType<typeof createTestContext>;

/** Extracts the refresh-token cookie (`zp_rt=…`) from a response, or undefined if not set. */
export function refreshCookie(res: { headers: Record<string, unknown> }): string | undefined {
  const cookies = (res.headers['set-cookie'] as string[] | undefined) ?? [];
  const cookie = cookies.find((c) => c.startsWith('zp_rt='));
  const value = cookie?.split(';')[0];
  return value && value !== 'zp_rt=' ? value : undefined;
}

/** Full mobile-OTP signup. Returns the session body and the refresh cookie. */
export async function signUp(
  ctx: TestContext,
  options: { phone?: string; fullName?: string; email?: string; password?: string } = {},
) {
  const { default: request } = await import('supertest');
  const phone = options.phone ?? uniquePhone();
  await request(ctx.app).post('/api/auth/send-otp').send({ phone }).expect(200);
  const verify = await request(ctx.app)
    .post('/api/auth/verify-otp')
    .send({ phone, otp: ctx.sms.lastCodeFor(phone) })
    .expect(200);
  const res = await request(ctx.app)
    .post('/api/auth/register')
    .send({
      signupToken: verify.body.data.signupToken,
      fullName: options.fullName ?? 'Amit Sharma',
      ...(options.email && { email: options.email }),
      ...(options.password && { password: options.password }),
    })
    .expect(201);
  return {
    phone,
    body: res.body,
    accessToken: res.body.data.accessToken as string,
    cookie: refreshCookie(res) as string,
  };
}

/** Grants a role to a user directly in the database (for authorization tests). */
export async function grantRole(userId: string, role: RoleName) {
  const found = await prisma.role.findUniqueOrThrow({ where: { name: role } });
  await prisma.userRole.create({ data: { userId, roleId: found.id } });
}
