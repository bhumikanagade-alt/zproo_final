import type { AdminUserRow, Permission, PublicUser } from '@zproo/types';
import type { UserWithRoles } from '../repositories/user.repository';

export function roleNames(user: UserWithRoles) {
  return user.roles.map((r) => r.role.name);
}

/** The only shape in which a user record leaves the API for its owner. */
export function toPublicUser(user: UserWithRoles, permissions: Permission[]): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    avatarUrl: user.avatarUrl,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
    gender: user.gender,
    state: user.state,
    phoneVerified: user.phoneVerifiedAt !== null,
    emailVerified: user.emailVerifiedAt !== null,
    hasPassword: user.passwordHash !== null,
    roles: roleNames(user),
    permissions,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toAdminUserRow(user: UserWithRoles): AdminUserRow {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    status: user.status,
    roles: roleNames(user),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
