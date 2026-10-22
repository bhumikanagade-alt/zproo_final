import type {
  BookingDetails,
  ErrorCode,
  FieldIssue,
  Permission,
  PublicUser,
  RoleName,
} from '@zproo/types';
import { ROLE_PERMISSIONS } from '@zproo/types';
import type { z } from 'zod';

/**
 * Static mode: the website answers its own API calls in the browser, from built-in demo data and
 * this browser's storage. No server, database or network is involved.
 */

export class StaticError extends Error {
  constructor(
    readonly status: number,
    readonly errorCode: ErrorCode,
    message: string,
    readonly details?: FieldIssue[],
  ) {
    super(message);
  }
}

export const notFound = (message = 'Not found') => new StaticError(404, 'NOT_FOUND', message);
export const unauthenticated = () =>
  new StaticError(401, 'UNAUTHENTICATED', 'Please sign in to continue');

export interface StaticRequest {
  method: string;
  /** Path under /api, e.g. "/flights/search" */
  path: string;
  params: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
}

export interface StaticResult {
  status?: number;
  message?: string;
  data: unknown;
}

/** Parses input with a shared schema, turning failures into the API's validation error. */
export function parse<S extends z.ZodType>(schema: S, input: unknown, prefix: string): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new StaticError(
      400,
      'VALIDATION_ERROR',
      'Validation failed',
      result.error.issues.map((i) => ({
        path: [prefix, ...i.path.map(String)].join('.'),
        message: i.message,
      })),
    );
  }
  return result.data;
}

// ───────── storage ─────────

export interface StoredUser {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  /** SHA-256 of the password (demo storage in this browser only) */
  passwordHash: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  state: string | null;
  createdAt: string;
  /** Missing on accounts created before roles existed: treated as a customer. */
  roles?: RoleName[];
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLoginAt?: string | null;
}

export interface StoredBooking {
  userId: string;
  idempotencyKey: string;
  details: BookingDetails;
  /** Inventory held by the booking (flight seats per offer, or bus seats) */
  holds:
    | { kind: 'flight'; offerId: string; seats: number }[]
    | { kind: 'bus'; tripId: string; seats: string[] }[];
  /** Bus bookings the customer cancelled: kept so the admin panel can show the reason and the refund. */
  busCancellation?: { at: string; reason: string; paid: boolean; refundPaise: number; chargesPaise: number; refundPercent: number };
  /** Train bookings: what to send the (simulated) railway after payment. */
  train?: { confirmOnly: boolean; cancellationKeys: Record<string, string> };
}

export interface StoredPayment {
  id: string;
  reference: string;
  userId: string;
  orderId: string;
  amountPaise: number;
  status: 'CREATED' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
}

export interface Db {
  users: StoredUser[];
  sessionUserId: string | null;
  otps: Record<string, { code: string; expiresAt: number }>;
  signupTokens: Record<string, string>;
  bookings: StoredBooking[];
  payments: StoredPayment[];
  /** Train places sold in this browser, keyed "<train>|<runDate>|<class>|<quota>". */
  trainInventory: Record<string, number>;
}

const KEY = 'zproo-go-static-db';
const empty = (): Db => ({
  users: [],
  sessionUserId: null,
  otps: {},
  signupTokens: {},
  bookings: [],
  payments: [],
  trainInventory: {},
});

let memory: Db | null = null;

/** The demo database, kept in this browser's localStorage (in memory if storage is blocked). */
export function db(): Db {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    memory = raw ? { ...empty(), ...(JSON.parse(raw) as Partial<Db>) } : empty();
    // Accounts saved by older versions lack the profile fields.
    memory.users = memory.users.map((user) => ({ ...{ avatarUrl: null, dateOfBirth: null, gender: null, state: null }, ...user }));
  } catch {
    memory = empty();
  }
  ensureStaffAccounts(memory);
  return memory;
}

export function save(): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db()));
  } catch {
    /* storage blocked: data lasts until the tab closes */
  }
}

/** Test helper: forget everything. */
export function resetStaticDb(): void {
  memory = empty();
  ensureStaffAccounts(memory);
  save();
}

// ───────── helpers ─────────

export const randomId = () =>
  crypto.randomUUID
    ? crypto.randomUUID().replaceAll('-', '')
    : `${Date.now()}${Math.random()}`.replace('.', '');

export function randomDigits(n: number): string {
  const values = crypto.getRandomValues(new Uint32Array(n));
  return Array.from(values, (v) => String(v % 10)).join('');
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

const USER_ROLES: RoleName[] = ['USER'];

/**
 * Demo staff accounts, so the admin panel can be tried without a server. They mirror the API's
 * development seed (same mobile numbers). Password sign-in: admin@zproogo.com / Admin@1234.
 */
export const DEMO_STAFF: readonly { id: string; fullName: string; phone: string; email: string; roles: RoleName[] }[] = [
  { id: 'staff-super-admin', fullName: 'Super Admin', phone: '+919000000001', email: 'admin@zproogo.com', roles: ['SUPER_ADMIN'] },
  { id: 'staff-admin', fullName: 'Platform Admin', phone: '+919000000002', email: 'ops.admin@zproogo.com', roles: ['ADMIN'] },
  { id: 'staff-support', fullName: 'Support Agent', phone: '+919000000003', email: 'support@zproogo.com', roles: ['SUPPORT'] },
  { id: 'staff-operator', fullName: 'Operations Manager', phone: '+919000000004', email: 'operations@zproogo.com', roles: ['OPERATOR'] },
];
/** SHA-256 of the demo staff password "Admin@1234". */
const DEMO_STAFF_PASSWORD_HASH = 'bc78e58d55cde1346e68f8e5fe588dedf62fa457aa646a500a53347faff6ee24';

function ensureStaffAccounts(d: Db): void {
  for (const staff of DEMO_STAFF) {
    if (d.users.some((u) => u.id === staff.id || u.phone === staff.phone)) continue;
    d.users.push({
      ...staff,
      roles: [...staff.roles],
      passwordHash: DEMO_STAFF_PASSWORD_HASH,
      avatarUrl: null,
      dateOfBirth: null,
      gender: null,
      state: 'Maharashtra',
      status: 'ACTIVE',
      createdAt: '2026-01-01T09:00:00.000Z',
    });
  }
}

export const rolesOf = (u: StoredUser): RoleName[] => (u.roles?.length ? u.roles : USER_ROLES);

export function permissionsOf(u: StoredUser): Permission[] {
  return [...new Set(rolesOf(u).flatMap((r) => ROLE_PERMISSIONS[r]))];
}

/** 403 unless the signed-in user holds every permission listed. */
export function requirePermission(...required: Permission[]): StoredUser {
  const user = currentUser();
  const granted = new Set(permissionsOf(user));
  if (!required.every((p) => granted.has(p))) {
    throw new StaticError(403, 'FORBIDDEN', 'You do not have permission to perform this action');
  }
  return user;
}

export function publicUser(u: StoredUser): PublicUser {
  return {
    id: u.id,
    fullName: u.fullName,
    phone: u.phone,
    email: u.email,
    avatarUrl: u.avatarUrl,
    dateOfBirth: u.dateOfBirth,
    gender: u.gender,
    state: u.state,
    phoneVerified: Boolean(u.phone),
    emailVerified: false,
    hasPassword: Boolean(u.passwordHash),
    roles: rolesOf(u),
    permissions: permissionsOf(u),
    createdAt: u.createdAt,
  };
}

/** The signed-in user, or 401. */
export function currentUser(): StoredUser {
  const d = db();
  const user = d.users.find((u) => u.id === d.sessionUserId);
  if (!user) throw unauthenticated();
  if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
    d.sessionUserId = null;
    save();
    throw new StaticError(403, 'ACCOUNT_DISABLED', 'This account is disabled. Please contact support.');
  }
  return user;
}
