import type { ServiceType } from '@zproo/types';
import { cn } from '@zproo/ui';
import { lazy, Suspense, type ComponentType } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { FlightSearchForm } from '../forms/FlightSearchForm';

// Flights is the default form and loads with the page; the others load when first shown.
const named = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(async () => ({ default: (await load())[name] }));

const FORMS: Record<ServiceType, ComponentType> = {
  FLIGHT: FlightSearchForm,
  BUS: named(() => import('../forms/BusSearchForm'), 'BusSearchForm'),
  TRAIN: named(() => import('../forms/TrainSearchForm'), 'TrainSearchForm'),
  HOTEL: named(() => import('../forms/HotelSearchForm'), 'HotelSearchForm'),
  CAB: named(() => import('../forms/RideSearchForm'), 'CabSearchForm'),
  BIKE: named(() => import('../forms/RideSearchForm'), 'BikeSearchForm'),
  HOLIDAY: named(() => import('../forms/HolidaySearchForm'), 'HolidaySearchForm'),
  PARCEL: named(() => import('../forms/ParcelSearchForm'), 'ParcelSearchForm'),
};

/**
 * The booking widget. The service is chosen from the site navbar (there is no tab strip here),
 * so this renders only the search form for the given service.
 */
export function SearchWidget({
  service,
  initial = 'FLIGHT',
  className,
}: {
  /** Service whose search form is shown. */
  service?: ServiceType;
  /** Kept for existing callers; used when `service` is not given. */
  initial?: ServiceType;
  className?: string;
}) {
  const active = service ?? initial;
  const Form = FORMS[active];
  return (
    <div
      className={cn('rounded-[1.75rem] border border-border bg-card shadow-raised', className)}
    >
      <div className="p-4 sm:p-6">
        <Suspense fallback={<PageLoader />}>
          <Form key={active} />
        </Suspense>
      </div>
    </div>
  );
}
