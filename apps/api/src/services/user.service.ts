import type { AdminUserRow, Paginated, PublicUser } from '@zproo/types';
import { toAdminUserRow, toPublicUser, roleNames } from '../models/user.dto';
import type { UserListQuery, UserRepository } from '../repositories/user.repository';
import type { RefreshTokenRepository } from '../repositories/refreshToken.repository';
import { AuthenticationError, InvalidCredentialsError } from '../utils/errors';
import type { AuditService, RequestContext } from './audit.service';
import type { RbacService } from './rbac.service';
import type { PasswordService } from './password.service';

export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly passwords: PasswordService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    // The access token outlived the account (deleted); treat as signed out.
    if (!user) throw new AuthenticationError('Please sign in to continue');
    return toPublicUser(user, await this.rbac.permissionsFor(roleNames(user)));
  }

  async updateProfile(
    userId: string,
    changes: { fullName: string; dateOfBirth?: string | null; gender?: 'MALE' | 'FEMALE' | 'OTHER' | null; state?: string | null; avatarUrl?: string | null },
    ctx: RequestContext,
  ): Promise<PublicUser> {
    const before = await this.users.findById(userId);
    if (!before) throw new AuthenticationError('Please sign in to continue');
    const user = await this.users.update(userId, {
      fullName: changes.fullName,
      ...(changes.dateOfBirth !== undefined && {
        dateOfBirth: changes.dateOfBirth ? new Date(`${changes.dateOfBirth}T00:00:00.000Z`) : null,
      }),
      ...(changes.gender !== undefined && { gender: changes.gender }),
      ...(changes.state !== undefined && { state: changes.state }),
      ...(changes.avatarUrl !== undefined && { avatarUrl: changes.avatarUrl }),
    });
    await this.audit.record({
      action: 'USER_PROFILE_UPDATED',
      actorId: userId,
      entityType: 'User',
      entityId: userId,
      before: {
        fullName: before.fullName,
        dateOfBirth: before.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        gender: before.gender,
        state: before.state,
        hasAvatar: Boolean(before.avatarUrl),
      },
      after: {
        fullName: user.fullName,
        dateOfBirth: user.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        gender: user.gender,
        state: user.state,
        hasAvatar: Boolean(user.avatarUrl),
      },
      context: ctx,
    });
    return toPublicUser(user, await this.rbac.permissionsFor(roleNames(user)));
  }

  async changePassword(
    userId: string,
    changes: { currentPassword: string; newPassword: string },
    ctx: RequestContext,
  ): Promise<void> {
    const before = await this.users.findById(userId);
    if (!before) throw new AuthenticationError('Please sign in to continue');
    const valid = await this.passwords.verify(before.passwordHash, changes.currentPassword);
    if (!valid) throw new InvalidCredentialsError('Current password is incorrect');
    const passwordHash = await this.passwords.hash(changes.newPassword);
    await this.users.setPasswordHash(userId, passwordHash);
    await this.refreshTokens.revokeAllForUser(userId);
    await this.audit.record({
      action: 'AUTH_PASSWORD_CHANGED',
      actorId: userId,
      entityType: 'User',
      entityId: userId,
      after: { changed: true },
      context: ctx,
    });
  }

  async listForAdmin(query: UserListQuery): Promise<Paginated<AdminUserRow>> {
    const { items, total } = await this.users.list(query);
    return { items: items.map(toAdminUserRow), page: query.page, limit: query.limit, total };
  }
}
