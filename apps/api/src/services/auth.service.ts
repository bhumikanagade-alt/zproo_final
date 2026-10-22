import type { AuthProvider, PrismaClient } from '@prisma/client';
import type { AuthSession, OtpSent, VerifyOtpResult } from '@zproo/types';
import type { Identifier, SocialProvider } from '@zproo/validation';
import type { Logger } from 'pino';
import { AUTH } from '../config/constants';
import { roleNames, toPublicUser } from '../models/user.dto';
import type { IdentityVerifiers } from '../providers/identity';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository';
import type { RoleRepository } from '../repositories/role.repository';
import type { UserRepository, UserWithRoles } from '../repositories/user.repository';
import { randomToken } from '../utils/crypto';
import {
  AccountDisabledError,
  AuthenticationError,
  ConflictError,
  InvalidCredentialsError,
  OtpExpiredError,
  ProviderNotConfiguredError,
} from '../utils/errors';
import type { AuditService, RequestContext } from './audit.service';
import type { OtpService } from './otp.service';
import type { PasswordService } from './password.service';
import type { RbacService } from './rbac.service';
import type { TokenService } from './token.service';

/** A signed-in session plus the refresh token, which the controller puts in an HttpOnly cookie. */
export interface IssuedSession {
  session: AuthSession;
  refreshToken: string;
}

export interface RegisterInput {
  signupToken: string;
  fullName: string;
  email?: string | undefined;
  password?: string | undefined;
}

interface AuthServiceDeps {
  prisma: PrismaClient;
  users: UserRepository;
  refreshTokens: RefreshTokenRepository;
  roles: RoleRepository;
  tokens: TokenService;
  passwords: PasswordService;
  otp: OtpService;
  rbac: RbacService;
  audit: AuditService;
  identityVerifiers: IdentityVerifiers;
  logger: Logger;
}

const SOCIAL_PROVIDER: Record<SocialProvider, AuthProvider> = { google: 'GOOGLE', apple: 'APPLE' };

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  // ───────────── Mobile OTP (sign up and log in share one flow) ─────────────

  /** Same response whether or not the number is registered, so it cannot be used to probe accounts. */
  async sendPhoneOtp(phone: string, ctx: RequestContext): Promise<OtpSent> {
    const user = await this.deps.users.findByPhone(phone);
    return this.deps.otp.issue({
      target: phone,
      channel: 'SMS',
      purpose: user ? 'LOGIN' : 'SIGNUP',
      userId: user?.id,
      ip: ctx.ip,
    });
  }

  async verifyPhoneOtp(
    phone: string,
    code: string,
    ctx: RequestContext,
  ): Promise<{ result: VerifyOtpResult; refreshToken?: string }> {
    await this.deps.otp.verify(phone, ['LOGIN', 'SIGNUP'], code);
    const user = await this.deps.users.findByPhone(phone);
    if (!user) {
      const signupToken = await this.deps.tokens.signSignupToken(phone);
      return { result: { status: 'SIGNUP_REQUIRED', signupToken, phone } };
    }
    this.assertActive(user);
    const verified = user.phoneVerifiedAt
      ? user
      : await this.deps.users.update(user.id, { phoneVerifiedAt: new Date() });
    const { session, refreshToken } = await this.startSession(verified, ctx, 'otp');
    return { result: { status: 'AUTHENTICATED', ...session }, refreshToken };
  }

  async register(input: RegisterInput, ctx: RequestContext): Promise<IssuedSession> {
    const phone = await this.deps.tokens.verifySignupToken(input.signupToken);
    if (await this.deps.users.existsWithContact({ phone })) {
      throw new ConflictError('This mobile number is already registered. Please log in.');
    }
    if (input.email && (await this.deps.users.existsWithContact({ email: input.email }))) {
      throw new ConflictError('This email is already linked to another account.');
    }
    const role = await this.requireRole('USER');
    const user = await this.deps.users.create(
      {
        phone,
        fullName: input.fullName,
        email: input.email ?? null,
        passwordHash: input.password ? await this.deps.passwords.hash(input.password) : null,
        phoneVerifiedAt: new Date(),
      },
      role.id,
    );
    await this.deps.audit.record({
      action: 'AUTH_REGISTER',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      after: {
        method: 'phone',
        hasEmail: Boolean(input.email),
        hasPassword: Boolean(input.password),
      },
      context: ctx,
    });
    return this.startSession(user, ctx, 'register');
  }

  // ───────────── Password ─────────────

  async loginWithPassword(
    identifier: Identifier,
    password: string,
    ctx: RequestContext,
  ): Promise<IssuedSession> {
    const user = await this.findByIdentifier(identifier);
    // Always runs a hash comparison, so timing does not reveal whether the account exists.
    const valid = await this.deps.passwords.verify(user?.passwordHash, password);
    if (!user || !valid) {
      this.deps.logger.warn(
        { requestId: ctx.requestId, identifierType: identifier.type },
        'Password login failed',
      );
      throw new InvalidCredentialsError();
    }
    this.assertActive(user);
    return this.startSession(user, ctx, 'password');
  }

  /** Always "sent" from the caller's perspective; a code is only issued for active accounts. */
  async forgotPassword(identifier: Identifier, ctx: RequestContext): Promise<OtpSent> {
    const user = await this.findByIdentifier(identifier);
    if (user?.status === 'ACTIVE') {
      return this.deps.otp.issue({
        target: identifier.value,
        channel: identifier.type === 'phone' ? 'SMS' : 'EMAIL',
        purpose: 'PASSWORD_RESET',
        userId: user.id,
        ip: ctx.ip,
      });
    }
    return { expiresIn: AUTH.otpTtlSeconds, resendIn: AUTH.otpResendSeconds };
  }

  async resetPassword(
    identifier: Identifier,
    code: string,
    newPassword: string,
    ctx: RequestContext,
  ): Promise<void> {
    await this.deps.otp.verify(identifier.value, ['PASSWORD_RESET'], code);
    const user = await this.findByIdentifier(identifier);
    if (!user) throw new OtpExpiredError();
    const passwordHash = await this.deps.passwords.hash(newPassword);
    await this.deps.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          // Receiving the code proves ownership of that contact.
          ...(identifier.type === 'email' &&
            !user.emailVerifiedAt && { emailVerifiedAt: new Date() }),
          ...(identifier.type === 'phone' &&
            !user.phoneVerifiedAt && { phoneVerifiedAt: new Date() }),
        },
      });
      // Every existing session ends: whoever knew the old password is signed out.
      await new RefreshTokenRepository(tx).revokeAllForUser(user.id);
    });
    await this.deps.audit.record({
      action: 'AUTH_PASSWORD_RESET',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      after: { via: identifier.type },
      context: ctx,
    });
  }

  // ───────────── Social (Google, Apple) ─────────────

  async socialLogin(
    provider: SocialProvider,
    idToken: string,
    ctx: RequestContext,
  ): Promise<IssuedSession> {
    const verifier = this.deps.identityVerifiers[provider];
    if (!verifier)
      throw new ProviderNotConfiguredError(
        `Sign in with ${provider === 'google' ? 'Google' : 'Apple'} is not available`,
      );
    const identity = await verifier.verify(idToken);
    const dbProvider = SOCIAL_PROVIDER[provider];

    let user = await this.deps.users.findByIdentity(dbProvider, identity.providerUserId);
    let action = 'AUTH_SOCIAL_LOGIN';

    if (!user && identity.email && identity.emailVerified) {
      // Link to an existing account only when the provider has verified the email address.
      const existing = await this.deps.users.findByEmail(identity.email);
      if (existing) {
        await this.deps.users.linkIdentity(
          existing.id,
          dbProvider,
          identity.providerUserId,
          identity.email,
        );
        user = existing;
        action = 'AUTH_SOCIAL_LINKED';
      }
    }

    if (!user) {
      const role = await this.requireRole('USER');
      const email =
        identity.email &&
        identity.emailVerified &&
        !(await this.deps.users.existsWithContact({ email: identity.email }))
          ? identity.email
          : null;
      user = await this.deps.users.create(
        {
          fullName: identity.name?.trim() || identity.email?.split('@')[0] || 'ZPROO GO Traveller',
          email,
          emailVerifiedAt: email ? new Date() : null,
          avatarUrl: identity.picture,
          identities: {
            create: {
              provider: dbProvider,
              providerUserId: identity.providerUserId,
              email: identity.email,
            },
          },
        },
        role.id,
      );
      action = 'AUTH_REGISTER';
    }

    this.assertActive(user);
    await this.deps.audit.record({
      action,
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      after: { method: provider },
      context: ctx,
    });
    return this.startSession(user, ctx, provider);
  }

  // ───────────── Sessions ─────────────

  /**
   * Rotates the refresh token. Presenting an already-rotated token means it was copied and used
   * by someone else, so the whole session is revoked.
   */
  async refresh(refreshToken: string | undefined, ctx: RequestContext): Promise<IssuedSession> {
    if (!refreshToken) throw new AuthenticationError('Please sign in to continue');
    const record = await this.deps.refreshTokens.findByHash(
      this.deps.tokens.hashRefreshToken(refreshToken),
    );
    if (!record) throw new AuthenticationError('Please sign in to continue');

    if (record.revokedAt) {
      if (record.replacedById) {
        await this.deps.refreshTokens.revokeFamily(record.familyId);
        this.deps.logger.warn(
          { requestId: ctx.requestId, userId: record.userId },
          'Refresh token reuse detected',
        );
        await this.deps.audit.record({
          action: 'AUTH_REFRESH_REUSE',
          actorId: record.userId,
          entityType: 'RefreshToken',
          entityId: record.id,
          after: { familyId: record.familyId },
          context: ctx,
        });
      }
      throw new AuthenticationError('Your session has ended. Please sign in again.');
    }
    if (record.expiresAt <= new Date())
      throw new AuthenticationError('Your session has expired. Please sign in again.');

    const user = await this.deps.users.findById(record.userId);
    if (!user || user.status !== 'ACTIVE') {
      await this.deps.refreshTokens.revokeFamily(record.familyId);
      if (user) this.assertActive(user);
      throw new AuthenticationError('Please sign in to continue');
    }

    const next = this.deps.tokens.newRefreshToken();
    const rotated = await this.deps.prisma.$transaction(async (tx) => {
      const repo = new RefreshTokenRepository(tx);
      const created = await repo.create({
        userId: user.id,
        tokenHash: next.hash,
        familyId: record.familyId,
        expiresAt: new Date(Date.now() + this.deps.tokens.refreshTokenTtlMs),
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent?.slice(0, 512),
      });
      if (!(await repo.markRotated(record.id, created.id)))
        throw new AuthenticationError('Please sign in to continue');
      return created;
    });

    return { session: await this.buildSession(user, rotated.familyId), refreshToken: next.token };
  }

  /** Ends this device's session. Idempotent; unknown tokens are ignored. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const record = await this.deps.refreshTokens.findByHash(
      this.deps.tokens.hashRefreshToken(refreshToken),
    );
    if (record) await this.deps.refreshTokens.revokeFamily(record.familyId);
  }

  async logoutAll(userId: string, ctx: RequestContext): Promise<void> {
    const { count } = await this.deps.refreshTokens.revokeAllForUser(userId);
    await this.deps.audit.record({
      action: 'AUTH_LOGOUT_ALL',
      actorId: userId,
      entityType: 'User',
      entityId: userId,
      after: { sessionsEnded: count },
      context: ctx,
    });
  }

  // ───────────── Internals ─────────────

  private async startSession(
    user: UserWithRoles,
    ctx: RequestContext,
    method: string,
  ): Promise<IssuedSession> {
    const familyId = randomToken(16);
    const { token, hash } = this.deps.tokens.newRefreshToken();
    await this.deps.refreshTokens.create({
      userId: user.id,
      tokenHash: hash,
      familyId,
      expiresAt: new Date(Date.now() + this.deps.tokens.refreshTokenTtlMs),
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent?.slice(0, 512),
    });
    await this.deps.users.touchLastLogin(user.id);
    await this.deps.audit.record({
      action: 'AUTH_LOGIN',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      after: { method },
      context: ctx,
    });
    return { session: await this.buildSession(user, familyId), refreshToken: token };
  }

  private async buildSession(user: UserWithRoles, sessionId: string): Promise<AuthSession> {
    const roles = roleNames(user);
    const [permissions, accessToken] = await Promise.all([
      this.deps.rbac.permissionsFor(roles),
      this.deps.tokens.signAccessToken({ userId: user.id, roles, sessionId }),
    ]);
    return {
      user: toPublicUser(user, permissions),
      accessToken,
      expiresIn: this.deps.tokens.accessTokenTtlSeconds,
    };
  }

  private findByIdentifier(identifier: Identifier) {
    return identifier.type === 'phone'
      ? this.deps.users.findByPhone(identifier.value)
      : this.deps.users.findByEmail(identifier.value);
  }

  private assertActive(user: UserWithRoles): void {
    if (user.status !== 'ACTIVE') throw new AccountDisabledError();
  }

  private async requireRole(name: 'USER') {
    const role = await this.deps.roles.findByName(name);
    if (!role) throw new Error(`Role ${name} is missing — run \`npm run db:seed\``);
    return role;
  }
}
