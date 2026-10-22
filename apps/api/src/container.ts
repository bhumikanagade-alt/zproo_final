import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import type { Env } from './config/env';
import { resolveLogoPath } from './config/brand';
import { createBusProvider, type BusProvider } from './providers/bus';
import { createEmailProvider, type EmailProvider } from './providers/email';
import { createFlightProvider, type FlightProvider } from './providers/flight';
import { createPaymentProvider, type PaymentProvider } from './providers/payment';
import { createIdentityVerifiers, type IdentityVerifiers } from './providers/identity';
import { createSmsProvider, type SmsProvider } from './providers/sms';
import { createTrainProvider, type TrainProvider } from './providers/train';
import { AuditRepository } from './repositories/audit.repository';
import { databaseCheck, redisCheck } from './repositories/health.repository';
import { OtpRepository } from './repositories/otp.repository';
import { RefreshTokenRepository } from './repositories/refreshToken.repository';
import { RoleRepository } from './repositories/role.repository';
import { UserRepository } from './repositories/user.repository';
import { AdminService } from './services/admin.service';
import { BusCancellationService } from './services/busCancellation.service';
import { AuditService } from './services/audit.service';
import { AuthService } from './services/auth.service';
import { BookingService } from './services/booking.service';
import { BusService } from './services/bus.service';
import { CacheService } from './services/cache.service';
import { FlightService } from './services/flight.service';
import { PaymentService } from './services/payment.service';
import { CouponService } from './services/coupon.service';
import { RefundService } from './services/refund.service';
import { TrainService } from './services/train.service';
import { TrainReservationService } from './services/trainReservation.service';
import { TicketService } from './services/ticket.service';
import { HealthService, type DependencyCheck } from './services/health.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { RbacService } from './services/rbac.service';
import { TokenService } from './services/token.service';
import { UserService } from './services/user.service';

export interface Providers {
  sms: SmsProvider;
  email: EmailProvider;
  identityVerifiers: IdentityVerifiers;
  flights: FlightProvider;
  buses: BusProvider;
  trains: TrainProvider;
  payments: PaymentProvider;
}

export interface ContainerOptions {
  env: Env;
  logger: Logger;
  prisma: PrismaClient;
  redis?: Redis | undefined;
  /** Replace external providers (tests use fakes). */
  providers?: Partial<Providers>;
  /** Replace health checks (tests). */
  healthChecks?: DependencyCheck[];
  healthTimeoutMs?: number;
}

/** Composition root: the only place that wires concrete classes together. */
export function createServices({
  env,
  logger,
  prisma,
  redis,
  providers = {},
  healthChecks,
  healthTimeoutMs,
}: ContainerOptions) {
  const sms = providers.sms ?? createSmsProvider(env);
  const email = providers.email ?? createEmailProvider(env);
  const identityVerifiers = providers.identityVerifiers ?? createIdentityVerifiers(env);
  const flightProvider = providers.flights ?? createFlightProvider(env, prisma);
  const busProvider = providers.buses ?? createBusProvider(env, prisma);
  const trainProvider = providers.trains ?? createTrainProvider(env, prisma, logger);
  const paymentProvider = providers.payments ?? createPaymentProvider(env);

  const users = new UserRepository(prisma);
  const roles = new RoleRepository(prisma);
  const refreshTokens = new RefreshTokenRepository(prisma);

  const tokens = new TokenService(env);
  const rbac = new RbacService(roles);
  const audit = new AuditService(new AuditRepository(prisma), logger);
  const otp = new OtpService(new OtpRepository(prisma), sms, email, env.JWT_SECRET);
  const passwords = new PasswordService();

  const checks = healthChecks ?? [databaseCheck(prisma), ...(redis ? [redisCheck(redis)] : [])];
  const coupons = new CouponService({ prisma });
  const bookings = new BookingService({
    prisma,
    flights: flightProvider,
    buses: busProvider,
    trains: trainProvider,
    audit,
    logger,
    // The admin panel's "Seat hold (minutes)" setting is used; BOOKING_HOLD_MINUTES only applies if settings cannot be read.
    holdMinutes: () => admin.settings().then((s) => s.bookingHoldMinutes, () => env.BOOKING_HOLD_MINUTES),
    trainFeePaise: env.TRAIN_SERVICE_FEE_PAISE,
    unlisted: (service) => admin.unlisted(service),
    coupons,
  });
  const refunds = new RefundService({ prisma, provider: paymentProvider, audit, logger });
  const trainReservations = new TrainReservationService({
    prisma,
    provider: trainProvider,
    bookings,
    refunds,
    audit,
    email,
    logger,
  });

  const busCancellations = new BusCancellationService({ prisma, buses: busProvider, refunds, audit, email, payments: paymentProvider, logger });

  const admin = new AdminService({ prisma, audit, refunds, flights: flightProvider, buses: busProvider, payments: paymentProvider, logger });

  return {
    admin,
    health: new HealthService(checks, env.APP_VERSION, healthTimeoutMs),
    tokens,
    rbac,
    audit,
    auth: new AuthService({
      prisma,
      users,
      refreshTokens,
      roles,
      tokens,
      passwords,
      otp,
      rbac,
      audit,
      identityVerifiers,
      logger,
    }),
    users: new UserService(users, rbac, audit, passwords, refreshTokens),
    flights: new FlightService(flightProvider, new CacheService(redis, logger)),
    buses: new BusService(busProvider, new CacheService(redis, logger)),
    trains: new TrainService(trainProvider, new CacheService(redis, logger), env.TRAIN_SERVICE_FEE_PAISE),
    trainReservations,
    busCancellations,
    refunds,
    bookings,
    coupons,
    email,
    payments: new PaymentService({
      prisma,
      provider: paymentProvider,
      flights: flightProvider,
      buses: busProvider,
      bookings,
      trains: trainReservations,
      audit,
      logger,
    }),
    tickets: new TicketService(resolveLogoPath(env.BRAND_LOGO_PATH)),
  };
}

export type Services = ReturnType<typeof createServices>;
