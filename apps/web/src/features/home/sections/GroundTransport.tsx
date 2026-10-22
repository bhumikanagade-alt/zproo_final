import { TRAIN_CLASS_LABELS } from '@zproo/types';
import { formatMoney } from '@zproo/utils';
import { Badge } from '@zproo/ui';
import { ArrowRight, Bus, Clock, TrainFront } from 'lucide-react';
import { Link } from 'react-router';
import { busRouteUrl, trainRouteUrl } from '@/features/search/url';
import { BUS_ROUTES, TRAIN_ROUTES } from '../content';
import { Section, SectionHeader } from './SectionHeader';

/** Popular bus routes and train bookings side by side on desktop, stacked on phones. */
export function GroundTransport() {
  return (
    <div className="bg-card">
      <Section id="bus-routes-title" className="grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-10">
        <div>
          <SectionHeader
            id="bus-routes-title"
            title="Popular Bus Routes"
            subtitle="AC sleeper, Volvo and electric buses with live seat maps."
            action={{ to: '/buses', label: 'All buses' }}
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {BUS_ROUTES.map((route) => (
              <li key={route.label}>
                <Link
                  to={busRouteUrl(route.from, route.to)}
                  className="group flex items-center gap-3 rounded-2xl border border-border p-3.5 transition-colors hover:border-primary/30 hover:bg-primary-light/40"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
                    <Bus aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{route.label}</span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Clock aria-hidden className="size-3" /> {route.duration}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[10px] font-semibold uppercase text-muted">
                      from
                    </span>
                    <span className="text-sm font-extrabold">{formatMoney(route.farePaise)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionHeader
            id="train-routes-title"
            title="Train Bookings"
            subtitle="All classes, from sleeper to first AC."
            action={{ to: '/trains', label: 'All trains' }}
          />
          <ul className="space-y-3">
            {TRAIN_ROUTES.map((route) => (
              <li key={route.label}>
                <Link
                  to={trainRouteUrl(route.from, route.to)}
                  className="group flex items-center gap-3 rounded-2xl border border-border p-3.5 transition-colors hover:border-primary/30 hover:bg-primary-light/40"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
                    <TrainFront aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{route.label}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {route.classes.map((c) => (
                        <Badge
                          key={c}
                          variant="outline"
                          title={TRAIN_CLASS_LABELS[c]}
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {c}
                        </Badge>
                      ))}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </div>
  );
}
