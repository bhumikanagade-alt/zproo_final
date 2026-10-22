import type { AdminCollectionName, AdminCollections, NotificationAudience, SupportTicket } from '@zproo/types';

/**
 * Builds stored admin documents (coupons, offers, tickets, notifications, partners, drivers) from
 * validated input. Shared by the API and the in-browser demo engine so both store the same shape.
 */

export interface DocContext {
  now: string;
  newId: (prefix: string) => string;
  /** Tickets already stored (for the next ticket number; used by the demo engine). */
  ticketCount: number;
  /** The next ticket number from the database sequence (the API); wins over `ticketCount`. */
  ticketNumber?: number;
  /** People a notification audience reaches right now. */
  audienceSize: (audience: NotificationAudience) => number;
}

export function buildAdminDoc<K extends AdminCollectionName>(
  name: K,
  input: Record<string, unknown>,
  existing: AdminCollections[K] | undefined,
  ctx: DocContext,
): AdminCollections[K] {
  const base = { id: existing?.id ?? ctx.newId(name.slice(0, 3)), createdAt: existing?.createdAt ?? ctx.now, updatedAt: ctx.now };
  switch (name) {
    case 'coupons':
      return { usedCount: 0, ...existing, ...input, ...base } as AdminCollections[K];
    case 'tickets': {
      if (existing) {
        const { message: _m, ...rest } = input;
        return { ...existing, ...rest, ...base } as AdminCollections[K];
      }
      const { message, ...rest } = input as { message: string } & Record<string, unknown>;
      const ticket: SupportTicket = {
        ...(rest as Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'number' | 'status' | 'assignee' | 'messages'>),
        ...base,
        number: `ZT-${ctx.ticketNumber ?? 1041 + ctx.ticketCount}`,
        status: 'OPEN',
        assignee: null,
        messages: [{ id: ctx.newId('msg'), author: 'CUSTOMER', name: String(rest.customerName), body: message, internal: false, at: ctx.now }],
      };
      return ticket as AdminCollections[K];
    }
    case 'notifications': {
      const { sendNow, ...rest } = input as unknown as { sendNow?: boolean } & AdminCollections['notifications'];
      const prior = existing as AdminCollections['notifications'] | undefined;
      const status = prior?.status === 'SENT' ? 'SENT' : sendNow ? 'SENT' : rest.scheduledFor ? 'SCHEDULED' : 'DRAFT';
      return {
        ...prior,
        ...rest,
        ...base,
        status,
        sentAt: status === 'SENT' ? (prior?.sentAt ?? ctx.now) : null,
        recipients: status === 'SENT' ? (prior?.status === 'SENT' ? prior.recipients : ctx.audienceSize(rest.audience)) : 0,
      } as AdminCollections[K];
    }
    case 'drivers':
      return { rating: 5, trips: 0, ...existing, ...input, ...base } as AdminCollections[K];
    default:
      return { ...existing, ...input, ...base } as AdminCollections[K];
  }
}

/** The editable fields of a stored document, in the shape its input schema expects (for merges). */
export function adminDocForm(name: AdminCollectionName, doc: object): Record<string, unknown> {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = doc as Record<string, unknown>;
  if (name === 'tickets') {
    const { messages, number: _n, status: _s, assignee: _a, ...t } = rest as unknown as SupportTicket & Record<string, unknown>;
    return { ...t, message: messages[0]?.body ?? '' };
  }
  if (name === 'notifications') {
    const { status: _s, sentAt: _sa, recipients: _r, ...n } = rest;
    return { ...n, sendNow: false };
  }
  if (name === 'coupons') {
    const { usedCount: _u2, ...c } = rest;
    return c;
  }
  if (name === 'drivers') {
    const { rating: _r, trips: _t, ...d } = rest;
    return d;
  }
  return rest;
}

export const ADMIN_DOC_LABEL = (doc: object): string => {
  const d = doc as Record<string, unknown>;
  return String(d.code ?? d.title ?? d.subject ?? d.name ?? d.id);
};
