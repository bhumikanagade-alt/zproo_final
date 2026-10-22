import { formatMoney } from '@zproo/utils';
import { ArrowRight, Clock, Plane } from 'lucide-react';
import { Link } from 'react-router';
import { flightDealUrl } from '@/features/search/url';
import { FLIGHT_DEALS } from '../content';
import { railItem } from './rail';
import { Rail, Section, SectionHeader } from './SectionHeader';

export function FlightDeals() {
  return (
    <Section id="flight-deals-title">
      <SectionHeader
        id="flight-deals-title"
        title="Top Flight Deals"
        subtitle="Indicative lowest one-way fares. Prices change with dates and availability."
        action={{ to: '/flights', label: 'All flights' }}
      />
      <Rail label="Flight deals" cols="md:grid-cols-3">
        {FLIGHT_DEALS.map((deal) => {
          const url = flightDealUrl(deal.from, deal.to);
          return (
            <li key={`${deal.from}-${deal.to}`} className={railItem}>
              <Link
                to={url}
                className="group block h-full rounded-card border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-raised"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-2xl font-extrabold tracking-tight">{deal.from}</p>
                    <p className="text-xs text-muted">{deal.fromCity}</p>
                  </div>
                  <div className="flex flex-1 items-center gap-1 text-primary" aria-hidden>
                    <span className="h-px flex-1 border-t border-dashed border-primary/40" />
                    <Plane className="size-4" />
                    <span className="h-px flex-1 border-t border-dashed border-primary/40" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold tracking-tight">{deal.to}</p>
                    <p className="text-xs text-muted">{deal.toCity}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-end justify-between border-t border-dashed border-border pt-4">
                  <div>
                    <p className="text-xs text-muted">Starting from</p>
                    <p className="text-xl font-extrabold text-primary">
                      {formatMoney(deal.farePaise)}
                    </p>
                  </div>
                  <p className="flex items-center gap-1 text-xs font-semibold text-muted">
                    <Clock aria-hidden className="size-3.5" /> {deal.duration} non-stop
                  </p>
                </div>
                <span className="sr-only">
                  Search flights from {deal.fromCity} to {deal.toCity}
                </span>
                <ArrowRight
                  aria-hidden
                  className="mt-3 size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                />
              </Link>
            </li>
          );
        })}
      </Rail>
    </Section>
  );
}
