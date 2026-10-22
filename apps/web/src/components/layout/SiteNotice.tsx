import type { ServiceType } from '@zproo/types';
import { cn } from '@zproo/ui';
import { ArrowRight, Info, Megaphone, TriangleAlert, Wrench } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { usePublicSettings } from '@/features/settings/publicSettings';

const SERVICE_PATHS: [string, ServiceType, string][] = [
  ['/flights', 'FLIGHT', 'Flight'],
  ['/buses', 'BUS', 'Bus'],
  ['/trains', 'TRAIN', 'Train'],
  ['/hotels', 'HOTEL', 'Hotel'],
  ['/cabs', 'CAB', 'Cab'],
  ['/rides', 'CAB', 'Cab'],
  ['/bikes', 'BIKE', 'Bike rental'],
  ['/holidays', 'HOLIDAY', 'Holiday'],
  ['/parcel', 'PARCEL', 'Parcel'],
];

/**
 * Site-wide notices controlled from the admin panel (Settings): maintenance mode, the
 * announcement bar, and a notice on pages of a service whose bookings are paused.
 */
export function SiteNotice() {
  const { data } = usePublicSettings();
  const { pathname } = useLocation();
  if (!data) return null;
  const paused = SERVICE_PATHS.find(([p, svc]) => (pathname === p || pathname.startsWith(`${p}/`)) && data.disabledServices.includes(svc));

  return (
    <>
      {data.maintenanceMode && (
        <Bar tone="warning" icon={Wrench}>
          We are doing some maintenance. You can browse, but new bookings are paused for a short while.
        </Bar>
      )}
      {!data.maintenanceMode && paused && (
        <Bar tone="warning" icon={TriangleAlert}>
          {paused[2]} bookings are paused right now. Please check back soon.
        </Bar>
      )}
      {data.announcement.enabled && data.announcement.text && (
        <Bar tone={data.announcement.tone} icon={data.announcement.tone === 'success' ? Megaphone : Info}>
          {data.announcement.text}
          {data.announcement.linkPath && (
            <Link to={data.announcement.linkPath} className="ml-2 inline-flex items-center gap-1 font-bold underline-offset-2 hover:underline">
              Learn more <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          )}
        </Bar>
      )}
    </>
  );
}

function Bar({ tone, icon: Icon, children }: { tone: 'info' | 'success' | 'warning'; icon: typeof Info; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'px-4 py-2 text-center text-sm font-semibold',
        tone === 'warning' && 'bg-amber-100 text-amber-950',
        tone === 'success' && 'bg-primary text-white',
        tone === 'info' && 'bg-foreground text-white',
      )}
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-x-2">
        <Icon aria-hidden className="size-4 shrink-0" />
        {children}
      </span>
    </div>
  );
}
