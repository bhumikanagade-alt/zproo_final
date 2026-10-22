import type { PublicSettings, ServiceType } from '@zproo/types';
import { adminDb } from './db';

/**
 * The small part of the admin state the public website reads in static mode (settings banner,
 * maintenance mode, switched-off services, hidden catalogue items). Kept apart from the admin
 * router so the website never downloads the admin code to read it.
 */

export function publicSettings(): PublicSettings {
  const s = adminDb().settings;
  return {
    siteName: s.siteName,
    supportEmail: s.supportEmail,
    supportPhone: s.supportPhone,
    announcement: s.announcement,
    maintenanceMode: s.maintenanceMode,
    disabledServices: s.disabledServices,
    walletEnabled: s.walletEnabled,
  };
}

/** Catalogue items an admin has hidden from the website. */
export function unlistedIds(service: ServiceType): ReadonlySet<string> {
  return new Set(adminDb().unlisted[service] ?? []);
}
