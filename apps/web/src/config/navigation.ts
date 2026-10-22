import {
  BadgePercent,
  Bell,
  Bike,
  Bus,
  CalendarCheck,
  CarTaxiFront,
  ChartColumn,
  CircleUser,
  CreditCard,
  FileChartColumn,
  Handshake,
  Hotel,
  House,
  IdCard,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Plane,
  Settings,
  Ticket,
  TrainFront,
  TreePalm,
  Undo2,
  Users,
  ScrollText,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Permission, ServiceType } from '@zproo/types';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

/** Mobile bottom navigation (app-style). */
export const BOTTOM_NAV: readonly NavItem[] = [
  { label: 'Home', path: '/', icon: House },
  { label: 'Bookings', path: '/bookings', icon: CalendarCheck },
  { label: 'Wallet', path: '/wallet', icon: Wallet },
  { label: 'Offers', path: '/offers', icon: BadgePercent },
  { label: 'Profile', path: '/profile', icon: CircleUser },
];

export const FOOTER_LINKS = {
  company: [
    { label: 'About ZPROO GO', path: '/about' },
    { label: 'Offers', path: '/offers' },
    { label: 'ZPROO Wallet', path: '/wallet' },
  ],
  support: [
    { label: 'Help Center', path: '/help' },
    { label: 'Contact Us', path: '/contact' },
    { label: 'My Bookings', path: '/bookings' },
    { label: 'Track Parcel', path: '/parcel/track' },
  ],
  legal: [
    { label: 'Terms of Use', path: '/terms' },
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Refund Policy', path: '/refund-policy' },
  ],
} as const;

export interface AdminNavItem extends NavItem {
  /** URL segment under /admin; empty for the dashboard. */
  segment: string;
  group: AdminNavGroup;
  /** Hidden from staff without it (the API checks it on every request too). */
  permission: Permission;
  /** Catalogue sections: the service whose inventory the page manages. */
  service?: ServiceType;
}

export type AdminNavGroup = 'Overview' | 'Operations' | 'Inventory' | 'Finance' | 'Marketing' | 'People' | 'System';

const admin = (
  label: string,
  segment: string,
  icon: LucideIcon,
  group: AdminNavGroup,
  permission: Permission,
  service?: ServiceType,
): AdminNavItem => ({
  label,
  segment,
  icon,
  group,
  permission,
  ...(service && { service }),
  path: segment ? `/admin/${segment}` : '/admin',
});

/** Admin sidebar, grouped. Each section shows only for staff holding its permission. */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  admin('Dashboard', '', LayoutDashboard, 'Overview', 'booking:read:any'),
  admin('Analytics', 'analytics', ChartColumn, 'Overview', 'report:read'),
  admin('Bookings', 'bookings', CalendarCheck, 'Operations', 'booking:read:any'),
  admin('Support', 'support', LifeBuoy, 'Operations', 'support:ticket:manage'),
  admin('Drivers', 'drivers', IdCard, 'Operations', 'driver:manage'),
  admin('Flights', 'flights', Plane, 'Inventory', 'inventory:manage', 'FLIGHT'),
  admin('Buses', 'buses', Bus, 'Inventory', 'inventory:manage', 'BUS'),
  admin('Trains', 'trains', TrainFront, 'Inventory', 'inventory:manage', 'TRAIN'),
  admin('Hotels', 'hotels', Hotel, 'Inventory', 'inventory:manage', 'HOTEL'),
  admin('Cabs', 'cabs', CarTaxiFront, 'Inventory', 'inventory:manage', 'CAB'),
  admin('Bikes', 'bikes', Bike, 'Inventory', 'inventory:manage', 'BIKE'),
  admin('Holidays', 'holidays', TreePalm, 'Inventory', 'inventory:manage', 'HOLIDAY'),
  admin('Parcels', 'parcels', Package, 'Inventory', 'inventory:manage', 'PARCEL'),
  admin('Payments', 'payments', CreditCard, 'Finance', 'payment:read:any'),
  admin('Refunds', 'refunds', Undo2, 'Finance', 'payment:read:any'),
  admin('Wallet', 'wallet', Wallet, 'Finance', 'wallet:manage'),
  admin('Reports', 'reports', FileChartColumn, 'Finance', 'report:read'),
  admin('Offers', 'offers', BadgePercent, 'Marketing', 'offer:manage'),
  admin('Coupons', 'coupons', Ticket, 'Marketing', 'offer:manage'),
  admin('Notifications', 'notifications', Bell, 'Marketing', 'offer:manage'),
  admin('Users', 'users', Users, 'People', 'user:read:any'),
  admin('Partners', 'partners', Handshake, 'People', 'partner:manage'),
  admin('Audit log', 'audit', ScrollText, 'System', 'audit:read'),
  admin('Settings', 'settings', Settings, 'System', 'report:read'),
];

export const ADMIN_GROUPS: readonly AdminNavGroup[] = ['Overview', 'Operations', 'Inventory', 'Finance', 'Marketing', 'People', 'System'];
