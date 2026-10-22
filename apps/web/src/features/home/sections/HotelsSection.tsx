import { formatMoney } from '@zproo/utils';
import { Link } from 'react-router';
import { TravelImage } from '@/components/media/TravelImage';
import { hotelCityUrl } from '@/features/search/url';
import { HOTEL_DESTINATIONS } from '../content';
import { railItem } from './rail';
import { Rail, Section, SectionHeader } from './SectionHeader';

export function HotelsSection({
  action = { to: '/hotels', label: 'All hotels' },
}: {
  action?: { to: string; label: string };
}) {
  return (
    <Section id="hotels-title">
      <SectionHeader
        id="hotels-title"
        title="Hotels in Top Destinations"
        subtitle="Handpicked stays with free cancellation on most rooms."
        action={action}
      />
      <Rail label="Hotel destinations" cols="md:grid-cols-3 lg:grid-cols-6">
        {HOTEL_DESTINATIONS.map((h) => (
          <li key={h.code} className={railItem}>
            <Link
              to={hotelCityUrl(h.code)}
              className="group block overflow-hidden rounded-card border border-border bg-card transition-shadow hover:shadow-raised"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <TravelImage
                  id={h.image}
                  sizes="(min-width: 1024px) 16vw, (min-width: 768px) 30vw, 70vw"
                  className="transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3.5">
                <p className="font-bold">{h.city}</p>
                <p className="truncate text-xs text-muted">{h.tagline}</p>
                <p className="mt-2 text-xs text-muted">
                  from{' '}
                  <span className="text-sm font-extrabold text-foreground">
                    {formatMoney(h.fromPaise)}
                  </span>
                  /night
                </p>
              </div>
            </Link>
          </li>
        ))}
      </Rail>
    </Section>
  );
}
