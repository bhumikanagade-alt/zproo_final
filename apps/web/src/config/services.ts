import type { ServiceType } from '@zproo/types';
import {
  Bike,
  Bus,
  CarTaxiFront,
  Hotel,
  Package,
  Plane,
  TrainFront,
  TreePalm,
  type LucideIcon,
} from 'lucide-react';

export interface ServiceEntry {
  type: ServiceType;
  /** Short label used in navigation. */
  label: string;
  path: string;
  icon: LucideIcon;
  tagline: string;
}

/** The travel services offered, in display order. Drives the header, home grid, footer and search. */
export const SERVICES: readonly ServiceEntry[] = [
  {
    type: 'FLIGHT',
    label: 'Flights',
    path: '/flights',
    icon: Plane,
    tagline: 'Domestic & international fares',
  },
  {
    type: 'BUS',
    label: 'Buses',
    path: '/buses',
    icon: Bus,
    tagline: 'AC, sleeper & Volvo across India',
  },
  {
    type: 'TRAIN',
    label: 'Trains',
    path: '/trains',
    icon: TrainFront,
    tagline: 'All classes, live availability',
  },
  {
    type: 'HOTEL',
    label: 'Hotels',
    path: '/hotels',
    icon: Hotel,
    tagline: 'Stays from budget to luxury',
  },
  {
    type: 'CAB',
    label: 'Cabs',
    path: '/cabs',
    icon: CarTaxiFront,
    tagline: 'Mini, sedan, SUV & premium',
  },
  {
    type: 'BIKE',
    label: 'Bikes',
    path: '/bikes',
    icon: Bike,
    tagline: 'Rent scooters & bikes by the day',
  },
  {
    type: 'HOLIDAY',
    label: 'Holidays',
    path: '/holidays',
    icon: TreePalm,
    tagline: 'Curated holiday packages',
  },
  {
    type: 'PARCEL',
    label: 'Parcel',
    path: '/parcel',
    icon: Package,
    tagline: 'Same-day intercity delivery',
  },
];

/** URL-safe key for a service (`/flights` → `flights`), used by `/?service=` on the home page. */
export const serviceSlug = (entry: ServiceEntry) => entry.path.replace(/^\//, '');

/** Resolve the `?service=` value on the home page; unknown or missing → flights. */
export function serviceFromSlug(slug: string | null): ServiceType {
  return SERVICES.find((s) => serviceSlug(s) === slug)?.type ?? 'FLIGHT';
}
