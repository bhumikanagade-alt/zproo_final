import {
  Bus,
  CarTaxiFront,
  Hotel,
  LayoutGrid,
  Package,
  Plane,
  TrainFront,
  TreePalm,
  type LucideIcon,
} from 'lucide-react';

export type OfferCategory =
  | 'all'
  | 'flights'
  | 'buses'
  | 'hotels'
  | 'cabs'
  | 'trains'
  | 'holidays'
  | 'parcel';

export type OfferService = Exclude<OfferCategory, 'all'>;

export interface OfferTheme {
  /** Tailwind-free CSS gradient used for the card header. */
  gradient: string;
  /** Solid accent colour used for chips, code pill and glow. */
  accent: string;
  /** Soft tint used for backgrounds. */
  tint: string;
  label: string;
  icon: LucideIcon;
}

export const OFFER_THEMES: Record<OfferCategory, OfferTheme> = {
  all: {
    gradient: 'linear-gradient(135deg,#d9141e 0%,#ff6a3d 50%,#ffb703 100%)',
    accent: '#d9141e',
    tint: '#fff1ee',
    label: 'All offers',
    icon: LayoutGrid,
  },
  flights: {
    gradient: 'linear-gradient(135deg,#2563eb 0%,#06b6d4 100%)',
    accent: '#2563eb',
    tint: '#eaf2ff',
    label: 'Flights',
    icon: Plane,
  },
  buses: {
    gradient: 'linear-gradient(135deg,#e50920 0%,#fb7185 100%)',
    accent: '#e11d48',
    tint: '#fff0f3',
    label: 'Buses',
    icon: Bus,
  },
  hotels: {
    gradient: 'linear-gradient(135deg,#7c3aed 0%,#ec4899 100%)',
    accent: '#9333ea',
    tint: '#f6efff',
    label: 'Hotels',
    icon: Hotel,
  },
  cabs: {
    gradient: 'linear-gradient(135deg,#f59e0b 0%,#facc15 100%)',
    accent: '#d97706',
    tint: '#fff8e1',
    label: 'Cabs',
    icon: CarTaxiFront,
  },
  trains: {
    gradient: 'linear-gradient(135deg,#059669 0%,#84cc16 100%)',
    accent: '#059669',
    tint: '#eafbf3',
    label: 'Trains',
    icon: TrainFront,
  },
  holidays: {
    gradient: 'linear-gradient(135deg,#0ea5e9 0%,#a855f7 55%,#f472b6 100%)',
    accent: '#0284c7',
    tint: '#ecf8ff',
    label: 'Holidays',
    icon: TreePalm,
  },
  parcel: {
    gradient: 'linear-gradient(135deg,#475569 0%,#0ea5e9 100%)',
    accent: '#0369a1',
    tint: '#eef4f8',
    label: 'Parcel',
    icon: Package,
  },
};

export const OFFER_FILTERS: readonly OfferCategory[] = [
  'all',
  'flights',
  'buses',
  'hotels',
  'cabs',
  'trains',
  'holidays',
  'parcel',
];

export interface OfferItem {
  code: string;
  /** Big headline value, e.g. "₹500 OFF". */
  value: string;
  title: string;
  detail: string;
  /** `all` offers appear under every filter. */
  service: OfferService | 'all';
  /** Optional ribbon text. */
  tag?: string;
}

export const OFFER_ITEMS: readonly OfferItem[] = [
  // Flights
  { code: 'FIRSTFLIGHT', value: '₹750 OFF', title: 'Flat ₹750 off your first flight', detail: 'Domestic flights, minimum fare ₹4,000.', service: 'flights', tag: 'New user' },
  { code: 'FLYMORE12', value: '12% OFF', title: '12% off on domestic fares', detail: 'Up to ₹1,200 off on eligible airlines.', service: 'flights' },
  { code: 'SKY1000', value: '₹1,000 OFF', title: 'International flight saver', detail: 'Minimum fare ₹25,000 on selected routes.', service: 'flights', tag: 'Hot' },
  // Buses
  { code: 'BUS100', value: '₹100 OFF', title: '₹100 off bus tickets', detail: 'Minimum booking ₹500, twice per user.', service: 'buses' },
  { code: 'ZPROO10', value: '10% OFF', title: '10% off on app bookings', detail: 'App promotion on eligible bus bookings.', service: 'buses', tag: 'App only' },
  { code: 'ZPROO20', value: '20% OFF', title: '20% off ZPROO bus rides', detail: 'Get 20% off on eligible ZPROO bus bookings.', service: 'buses', tag: 'Top pick' },
  { code: 'BUS250', value: '₹250 OFF', title: 'Limited-time bus discount', detail: 'Limited-time discount on eligible routes.', service: 'buses' },
  // Hotels
  { code: 'HOTEL10', value: '10% OFF', title: '10% off hotels', detail: 'Up to ₹1,500 off, stays of 2+ nights.', service: 'hotels' },
  { code: 'STAY400', value: '₹400 OFF', title: 'Weekend stay saver', detail: 'Valid on weekend check-ins above ₹3,000.', service: 'hotels' },
  { code: 'LUXE25', value: '25% OFF', title: 'Luxury stay special', detail: 'Selected 4 & 5-star hotels, up to ₹3,000 off.', service: 'hotels', tag: 'Hot' },
  // Cabs
  { code: 'CAB150', value: '₹150 OFF', title: '₹150 off outstation cabs', detail: 'Outstation rides above ₹1,500.', service: 'cabs' },
  { code: 'RIDE15', value: '15% OFF', title: '15% off airport transfers', detail: 'Up to ₹200 off on airport pickups & drops.', service: 'cabs', tag: 'New' },
  // Trains
  { code: 'RAIL50', value: '₹50 OFF', title: '₹50 off train bookings', detail: 'Convenience-fee saving on every train booking.', service: 'trains' },
  // Holidays
  { code: 'HOLIDAY2K', value: '₹2,000 OFF', title: 'Holiday package deal', detail: 'Packages above ₹20,000, selected destinations.', service: 'holidays', tag: 'Hot' },
  // Parcel
  { code: 'PARCEL10', value: '10% OFF', title: '10% off your parcel', detail: 'On the delivery charge of any parcel booking.', service: 'parcel' },
  { code: 'SHIP20', value: '20% OFF', title: '20% off first parcel', detail: 'Same-day intercity delivery, first order only.', service: 'parcel', tag: 'New user' },
  // Everything
  { code: 'WELCOME500', value: '₹500 OFF', title: '₹500 off your first booking', detail: 'On any service, minimum spend ₹2,000.', service: 'all', tag: 'All services' },
];

export function filterOffers(filter: OfferCategory): OfferItem[] {
  if (filter === 'all') return [...OFFER_ITEMS];
  return OFFER_ITEMS.filter((o) => o.service === filter || o.service === 'all');
}

export function offerCount(filter: OfferCategory): number {
  return filterOffers(filter).length;
}
