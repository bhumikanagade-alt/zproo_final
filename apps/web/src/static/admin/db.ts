import { DEFAULT_PLATFORM_SETTINGS as DEFAULT_SETTINGS } from '@zproo/types';
import type {
  AdminCollections,
  AdminCollectionName,
  BookingStatus,
  PlatformSettings,
  RefundStatus,
  RoleName,
  ServiceType,
  UserStatus,
} from '@zproo/types';

/**
 * Admin state for static (demo) mode, kept in this browser's localStorage under its own key so
 * the customer-side demo database stays small. Generated sample data is NOT stored: it is
 * rebuilt deterministically from `demoSeed` + `demoAnchor`; only changes made in the panel are.
 */

export interface AdminAuditRecord {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
}

export interface BookingOverride {
  status: BookingStatus;
  cancelledAt?: string;
  reason?: string;
}

export interface StoredRefund {
  id: string;
  bookingReference: string;
  serviceType: ServiceType;
  customerName: string;
  amountPaise: number;
  status: RefundStatus;
  reason: string;
  createdAt: string;
  completedAt: string | null;
}

export interface WalletAdjustment {
  id: string;
  userName: string;
  type: 'credit' | 'debit';
  amountPaise: number;
  label: string;
  createdAt: string;
}

export interface AdminDb {
  version: 1;
  settings: PlatformSettings;
  collections: { [K in AdminCollectionName]: AdminCollections[K][] };
  /** Whether each collection has received its starter documents. */
  seeded: Partial<Record<AdminCollectionName, boolean>>;
  audit: AdminAuditRecord[];
  bookingOverrides: Record<string, BookingOverride>;
  /** Refunds raised from the panel (and status changes of generated ones, by id). */
  refunds: StoredRefund[];
  refundStatus: Record<string, { status: RefundStatus; completedAt: string | null }>;
  /** Status/role changes for generated demo users. */
  userOverrides: Record<string, { status?: UserStatus; roles?: RoleName[] }>;
  /** Catalogue items hidden from the website, per service. */
  unlisted: Partial<Record<ServiceType, string[]>>;
  wallet: WalletAdjustment[];
  /** One row per coupon use (the per-customer limit is counted from these). */
  couponUses: { couponId: string; userId: string; bookingId: string }[];
  demoSeed: number;
  /** ISO date the sample data is anchored to (it moves forward on "Regenerate"). */
  demoAnchor: string;
}

export { DEFAULT_SETTINGS };

export const ADMIN_DB_KEY = 'zproo-go-admin-db';

const today = () => new Date().toISOString().slice(0, 10);

const empty = (): AdminDb => ({
  version: 1,
  settings: { ...DEFAULT_SETTINGS },
  collections: { coupons: [], offers: [], tickets: [], notifications: [], partners: [], drivers: [] },
  seeded: {},
  audit: [],
  bookingOverrides: {},
  refunds: [],
  refundStatus: {},
  userOverrides: {},
  unlisted: {},
  wallet: [],
  couponUses: [],
  demoSeed: 2026,
  demoAnchor: today(),
});

let memory: AdminDb | null = null;

export function adminDb(): AdminDb {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(ADMIN_DB_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<AdminDb>) : {};
    const base = empty();
    memory = {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...parsed.settings },
      collections: { ...base.collections, ...parsed.collections },
    };
  } catch {
    memory = empty();
  }
  return memory;
}

export function saveAdminDb(): void {
  try {
    window.localStorage.setItem(ADMIN_DB_KEY, JSON.stringify(adminDb()));
  } catch {
    /* storage blocked or full: changes last until the tab closes */
  }
}

/** Test helper / "factory reset" from the settings page. */
export function resetAdminDb(): void {
  memory = empty();
  saveAdminDb();
}

export const newId = (prefix: string) =>
  `${prefix}_${(crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-z0-9]/gi, '').slice(0, 16)}`;

export function audit(entry: Omit<AdminAuditRecord, 'id' | 'createdAt'>): void {
  const d = adminDb();
  d.audit.unshift({ ...entry, id: newId('aud'), createdAt: new Date().toISOString() });
  d.audit = d.audit.slice(0, 500);
  saveAdminDb();
}
