import type { Prisma } from '@prisma/client';
import type { Logger } from 'pino';
import type { AuditRepository } from '../repositories/audit.repository';

export interface RequestContext {
  ip?: string | undefined;
  userAgent?: string | undefined;
  requestId?: string | undefined;
}

export interface AuditEntry {
  action: string;
  actorId?: string | null | undefined;
  entityType: string;
  entityId?: string | null | undefined;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  context?: RequestContext | undefined;
}

/** Append-only audit trail. A failed audit write is logged but never fails the user's request. */
export class AuditService {
  constructor(
    private readonly repo: AuditRepository,
    private readonly logger: Logger,
  ) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.repo.create({
        action: entry.action,
        actorId: entry.actorId ?? null,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        before: entry.before,
        after: entry.after,
        ipAddress: entry.context?.ip,
        userAgent: entry.context?.userAgent?.slice(0, 512),
        requestId: entry.context?.requestId,
      });
    } catch (err) {
      this.logger.error({ err, action: entry.action }, 'Failed to write audit log');
    }
  }
}
