import type { AdminCollections, UserNotification } from '@zproo/types';
import { currentUser, rolesOf } from '../core';
import { adminDb, saveAdminDb } from './db';
import { allBookings } from './sources';

/**
 * What the customer's notification bell reads in static (demo) mode. Kept apart from the admin
 * router so the website never downloads the admin code just to show a message.
 */

const DAY = 86_400_000;

/** Scheduled campaigns whose time has passed become SENT (the API does the same on request). */
export function dispatchDueNotifications(): void {
  const items = adminDb().collections.notifications as AdminCollections['notifications'][];
  let changed = false;
  for (const n of items) {
    if (n.status === 'SCHEDULED' && n.scheduledFor && Date.parse(n.scheduledFor) <= Date.now()) {
      n.status = 'SENT';
      n.sentAt = n.scheduledFor;
      n.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) saveAdminDb();
}

export function myNotifications(): UserNotification[] {
  const user = currentUser();
  dispatchDueNotifications();
  const isStaff = rolesOf(user).some((r) => r !== 'USER');
  const createdAt = Date.parse(user.createdAt);
  const out: UserNotification[] = [];
  for (const n of adminDb().collections.notifications as AdminCollections['notifications'][]) {
    if (n.status !== 'SENT' || !n.sentAt) continue;
    if (!n.channels.includes('IN_APP') && !n.channels.includes('PUSH')) continue;
    const sentAt = Date.parse(n.sentAt);
    let reaches = false;
    if (n.audience === 'ALL_USERS') reaches = true;
    else if (n.audience === 'STAFF') reaches = isStaff;
    else if (n.audience === 'INACTIVE_USERS') reaches = createdAt <= sentAt;
    else if (n.audience === 'RECENT_CUSTOMERS') {
      reaches = allBookings({ includeDemo: false }).some((b) => {
        const at = Date.parse(b.row.createdAt);
        return b.row.userId === user.id && at >= sentAt - 60 * DAY && at <= sentAt;
      });
    }
    if (reaches) out.push({ id: n.id, title: n.title, body: n.body, linkPath: n.linkPath, sentAt: n.sentAt });
  }
  return out.sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, 30);
}
