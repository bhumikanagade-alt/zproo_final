import { cn } from '@zproo/ui';
import { Link } from 'react-router';
import { Rail } from '@/features/home/sections/SectionHeader';
import { railItem } from '@/features/home/sections/rail';
import { bikeLinks } from '../links';
import { CATEGORIES, CATEGORY_META } from '../rules';
import type { Bike } from '../types';
import { BikeImage } from './BikeImage';
import { focusRing } from './ui';

/** "Browse by category" tiles. Each tile uses a bike from that category as its picture. */
export function CategoryTiles({ bikes }: { bikes: readonly Bike[] }) {
  return (
    <Rail label="Bike categories" cols="md:grid-cols-3 lg:grid-cols-6">
      {CATEGORIES.map((c) => {
        const sample = bikes.find((b) => b.category === c);
        const count = bikes.filter((b) => b.category === c).length;
        return (
          <li key={c} className={railItem}>
            <Link
              to={bikeLinks.results(`cat=${c}`)}
              className={cn('group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0', focusRing)}
            >
              <div className="aspect-[3/2] overflow-hidden bg-neutral-100">
                <BikeImage image={sample?.images[0]} className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
              </div>
              <div className="p-3">
                <p className="font-bold">{CATEGORY_META[c].label}</p>
                <p className="text-xs text-muted">{CATEGORY_META[c].blurb}</p>
                <p className="mt-1 text-xs font-semibold text-primary">{count} {count === 1 ? 'bike' : 'bikes'}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </Rail>
  );
}
