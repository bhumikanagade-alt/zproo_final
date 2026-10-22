import type { Permission, RoleName } from '@zproo/types';
import type { RoleRepository } from '../repositories/role.repository';

/** Resolves permissions for roles from the database, cached briefly (role grants change rarely). */
export class RbacService {
  private cache: { map: Map<RoleName, string[]>; expiresAt: number } | undefined;

  constructor(
    private readonly roles: RoleRepository,
    private readonly ttlMs = 60_000,
  ) {}

  async permissionsFor(roles: readonly RoleName[]): Promise<Permission[]> {
    const map = await this.load();
    const set = new Set<string>();
    for (const role of roles) for (const permission of map.get(role) ?? []) set.add(permission);
    return [...set].sort() as Permission[];
  }

  async hasAll(roles: readonly RoleName[], required: readonly Permission[]): Promise<boolean> {
    const granted = new Set(await this.permissionsFor(roles));
    return required.every((p) => granted.has(p));
  }

  invalidate(): void {
    this.cache = undefined;
  }

  private async load(): Promise<Map<RoleName, string[]>> {
    if (!this.cache || this.cache.expiresAt < Date.now()) {
      this.cache = { map: await this.roles.permissionMap(), expiresAt: Date.now() + this.ttlMs };
    }
    return this.cache.map;
  }
}
