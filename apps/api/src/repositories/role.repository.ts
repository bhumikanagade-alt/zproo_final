import type { RoleName } from '@prisma/client';
import type { Db } from './db';

export class RoleRepository {
  constructor(private readonly db: Db) {}

  findByName(name: RoleName) {
    return this.db.role.findUnique({ where: { name } });
  }

  /** Role → permission keys, as stored in the database (synced from code by the seed). */
  async permissionMap(): Promise<Map<RoleName, string[]>> {
    const roles = await this.db.role.findMany({
      select: { name: true, permissions: { select: { permission: { select: { key: true } } } } },
    });
    return new Map(roles.map((r) => [r.name, r.permissions.map((p) => p.permission.key)]));
  }
}
