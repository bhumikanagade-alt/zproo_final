import type { AuthProvider, Prisma, RoleName, UserStatus } from '@prisma/client';
import type { Db } from './db';

export const userWithRoles = {
  roles: { include: { role: { select: { name: true } } } },
} satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userWithRoles }>;

export interface UserListQuery {
  search?: string | undefined;
  role?: RoleName | undefined;
  status?: UserStatus | undefined;
  page: number;
  limit: number;
}

/** All reads exclude soft-deleted users. */
export class UserRepository {
  constructor(private readonly db: Db) {}

  findById(id: string) {
    return this.db.user.findFirst({ where: { id, deletedAt: null }, include: userWithRoles });
  }

  findByPhone(phone: string) {
    return this.db.user.findFirst({ where: { phone, deletedAt: null }, include: userWithRoles });
  }

  findByEmail(email: string) {
    return this.db.user.findFirst({ where: { email, deletedAt: null }, include: userWithRoles });
  }

  /** Any user (including soft-deleted) holding this phone or email — unique constraints span them all. */
  existsWithContact(contact: { phone?: string; email?: string }) {
    const or: Prisma.UserWhereInput[] = [];
    if (contact.phone) or.push({ phone: contact.phone });
    if (contact.email) or.push({ email: contact.email });
    if (or.length === 0) return Promise.resolve(false);
    return this.db.user.count({ where: { OR: or } }).then((n) => n > 0);
  }

  create(data: Omit<Prisma.UserCreateInput, 'roles'>, roleId: string) {
    return this.db.user.create({
      data: { ...data, roles: { create: { roleId } } },
      include: userWithRoles,
    });
  }

  findByIdentity(provider: AuthProvider, providerUserId: string) {
    return this.db.user.findFirst({
      where: { deletedAt: null, identities: { some: { provider, providerUserId } } },
      include: userWithRoles,
    });
  }

  linkIdentity(
    userId: string,
    provider: AuthProvider,
    providerUserId: string,
    email: string | null,
  ) {
    return this.db.authIdentity.create({ data: { userId, provider, providerUserId, email } });
  }

  touchLastLogin(id: string) {
    return this.db.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  setPasswordHash(id: string, passwordHash: string) {
    return this.db.user.update({ where: { id }, data: { passwordHash } });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.db.user.update({ where: { id }, data, include: userWithRoles });
  }

  async list(query: UserListQuery) {
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.role && { roles: { some: { role: { name: query.role } } } }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search.toLowerCase() } },
          { phone: { contains: search.replace(/\s/g, '') } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      this.db.user.findMany({
        where,
        include: userWithRoles,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.user.count({ where }),
    ]);
    return { items, total };
  }
}
