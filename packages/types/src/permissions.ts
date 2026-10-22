import type { RoleName } from './enums';

/**
 * Permission keys follow `resource:action[:scope]`. `:own` means the caller's own records,
 * `:any` means all records. The API enforces these; the web app only uses them to hide UI.
 * New modules add their keys here and the seed syncs them into the database.
 */
export const Permission = {
  PROFILE_READ_OWN: 'profile:read:own',
  PROFILE_UPDATE_OWN: 'profile:update:own',
  BOOKING_CREATE: 'booking:create',
  BOOKING_READ_OWN: 'booking:read:own',
  BOOKING_READ_ANY: 'booking:read:any',
  BOOKING_CANCEL_OWN: 'booking:cancel:own',
  BOOKING_MANAGE: 'booking:manage',
  WALLET_READ_OWN: 'wallet:read:own',
  WALLET_MANAGE: 'wallet:manage',
  PAYMENT_READ_ANY: 'payment:read:any',
  REFUND_APPROVE: 'refund:approve',
  USER_READ_ANY: 'user:read:any',
  USER_MANAGE: 'user:manage',
  ROLE_MANAGE: 'role:manage',
  INVENTORY_MANAGE: 'inventory:manage',
  INVENTORY_MANAGE_OWN: 'inventory:manage:own',
  DRIVER_MANAGE: 'driver:manage',
  RIDE_OPERATE: 'ride:operate',
  PARTNER_MANAGE: 'partner:manage',
  OFFER_MANAGE: 'offer:manage',
  SUPPORT_TICKET_CREATE: 'support:ticket:create',
  SUPPORT_TICKET_MANAGE: 'support:ticket:manage',
  CORPORATE_MANAGE_OWN: 'corporate:manage:own',
  CORPORATE_APPROVE: 'corporate:approve',
  REPORT_READ: 'report:read',
  AUDIT_READ: 'audit:read',
  SETTINGS_MANAGE: 'settings:manage',
  ADMIN_ACCESS: 'admin:access',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'profile:read:own': 'View own profile',
  'profile:update:own': 'Update own profile',
  'booking:create': 'Create bookings',
  'booking:read:own': 'View own bookings',
  'booking:read:any': 'View all bookings',
  'booking:cancel:own': 'Cancel own bookings',
  'booking:manage': 'Modify or cancel any booking',
  'wallet:read:own': 'View own wallet',
  'wallet:manage': 'Adjust any wallet',
  'payment:read:any': 'View all payments',
  'refund:approve': 'Approve and process refunds',
  'user:read:any': 'View all users',
  'user:manage': 'Create, edit and deactivate users',
  'role:manage': 'Assign roles and permissions',
  'inventory:manage': 'Manage flights, buses, trains, hotels and packages',
  'inventory:manage:own': 'Manage inventory owned by the partner account',
  'driver:manage': 'Manage drivers and vehicles',
  'ride:operate': 'Accept and operate rides as a driver',
  'partner:manage': 'Manage partners, commissions and settlements',
  'offer:manage': 'Manage offers and coupons',
  'support:ticket:create': 'Raise support tickets',
  'support:ticket:manage': 'Handle support tickets',
  'corporate:manage:own': 'Manage own corporate account',
  'corporate:approve': 'Approve corporate travel requests',
  'report:read': 'View reports and analytics',
  'audit:read': 'View audit logs',
  'settings:manage': 'Change system settings',
  'admin:access': 'Access the admin panel',
};

const CUSTOMER: Permission[] = [
  Permission.PROFILE_READ_OWN,
  Permission.PROFILE_UPDATE_OWN,
  Permission.BOOKING_CREATE,
  Permission.BOOKING_READ_OWN,
  Permission.BOOKING_CANCEL_OWN,
  Permission.WALLET_READ_OWN,
  Permission.SUPPORT_TICKET_CREATE,
];

const ALL = Object.values(Permission);

/** Default permission set of every system role. */
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  USER: CUSTOMER,
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== Permission.ROLE_MANAGE && p !== Permission.SETTINGS_MANAGE),
  SUPPORT: [
    ...CUSTOMER,
    Permission.ADMIN_ACCESS,
    Permission.USER_READ_ANY,
    Permission.BOOKING_READ_ANY,
    Permission.PAYMENT_READ_ANY,
    Permission.SUPPORT_TICKET_MANAGE,
  ],
  OPERATOR: [
    ...CUSTOMER,
    Permission.ADMIN_ACCESS,
    Permission.BOOKING_READ_ANY,
    Permission.BOOKING_MANAGE,
    Permission.INVENTORY_MANAGE,
    Permission.DRIVER_MANAGE,
  ],
  DRIVER: [Permission.PROFILE_READ_OWN, Permission.PROFILE_UPDATE_OWN, Permission.RIDE_OPERATE],
  HOTEL_PARTNER: [
    Permission.PROFILE_READ_OWN,
    Permission.PROFILE_UPDATE_OWN,
    Permission.INVENTORY_MANAGE_OWN,
  ],
  TRAVEL_PARTNER: [
    Permission.PROFILE_READ_OWN,
    Permission.PROFILE_UPDATE_OWN,
    Permission.INVENTORY_MANAGE_OWN,
  ],
  CORPORATE_ADMIN: [...CUSTOMER, Permission.CORPORATE_MANAGE_OWN, Permission.CORPORATE_APPROVE],
};
