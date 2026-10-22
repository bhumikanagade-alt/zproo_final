import { cn } from '@zproo/ui';
import { Link } from 'react-router';
import { TravelImage } from '@/components/media/TravelImage';
import { DESTINATIONS } from '../content';
import { Section, SectionHeader } from './SectionHeader';

/**
 * Mosaic on a 4-column grid: two large tiles, three wide tiles and six small ones fill five full
 * rows (2×4 + 3×2 + 6 = 20 cells). On phones (2 columns) the first tile spans the full width so
 * the 11 destinations fill six rows.
 */
const LARGE = new Set([0, 1]);
const WIDE = new Set([2, 5, 10]);

interface DestinationsSectionProps {
  /** Where each tile links. Defaults to the holiday packages for that destination. */
  linkFor?: (destination: string) => string;
  action?: { to: string; label: string };
  subtitle?: string;
}

const holidayLink = (name: string) => `/holidays?destination=${encodeURIComponent(name)}`;

export function DestinationsSection({
  linkFor = holidayLink,
  action = { to: '/holidays', label: 'Holiday packages' },
  subtitle = 'Where India is travelling this season.',
}: DestinationsSectionProps = {}) {
  return (
    <Section id="destinations-title">
      <SectionHeader
        id="destinations-title"
        title="Popular Destinations"
        subtitle={subtitle}
        action={action}
      />
      <ul className="grid auto-rows-[9.5rem] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[11rem] sm:gap-4 md:grid-cols-4 lg:auto-rows-[12rem]">
        {DESTINATIONS.map((d, i) => (
          <li
            key={d.name}
            className={cn(
              i === 0 && 'col-span-2',
              LARGE.has(i) && 'md:col-span-2 md:row-span-2',
              WIDE.has(i) && 'md:col-span-2',
            )}
          >
            <Link
              to={linkFor(d.name)}
              className="group relative block size-full overflow-hidden rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <TravelImage
                id={d.image}
                sizes={
                  LARGE.has(i) || WIDE.has(i)
                    ? '(min-width: 768px) 50vw, 100vw'
                    : '(min-width: 768px) 25vw, 50vw'
                }
                className="transition-transform duration-700 group-hover:scale-105"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 p-3.5 text-white sm:p-4">
                <p
                  className={cn(
                    'font-extrabold leading-tight',
                    LARGE.has(i) ? 'text-xl sm:text-3xl' : 'text-base sm:text-lg',
                  )}
                >
                  {d.name}
                </p>
                <p className="text-xs text-white/85 sm:text-sm">{d.tagline}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
