import type { Prisma } from '@prisma/client';
import type { Db } from './db';

export class AuditRepository {
  constructor(private readonly db: Db) {}

  create(data: Prisma.AuditLogUncheckedCreateInput) {
    return this.db.auditLog.create({ data });
  }
}
