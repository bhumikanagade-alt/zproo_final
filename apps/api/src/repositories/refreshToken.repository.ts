import type { Db } from './db';

export interface NewRefreshToken {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export class RefreshTokenRepository {
  constructor(private readonly db: Db) {}

  create(data: NewRefreshToken) {
    return this.db.refreshToken.create({ data });
  }

  findByHash(tokenHash: string) {
    return this.db.refreshToken.findUnique({ where: { tokenHash } });
  }

  /**
   * Marks a token as rotated. Conditional on it still being live, so two concurrent refreshes
   * cannot both succeed; returns false if another request rotated it first.
   */
  async markRotated(id: string, replacedById: string): Promise<boolean> {
    const { count } = await this.db.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById },
    });
    return count === 1;
  }

  revoke(id: string) {
    return this.db.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  revokeFamily(familyId: string) {
    return this.db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  revokeAllForUser(userId: string) {
    return this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
