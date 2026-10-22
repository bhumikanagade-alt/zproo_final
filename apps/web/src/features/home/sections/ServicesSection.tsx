import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { TravelImage } from '@/components/media/TravelImage';
import type { ImageId } from '@/config/images';
import { SERVICES } from '@/config/services';
import { railItem } from './rail';
import { Rail, Section, SectionHeader } from './SectionHeader';

const IMAGE: Record<string, ImageId> = {
  FLIGHT: 'services/flights',
  BUS: 'services/buses',
  TRAIN: 'services/trains',
  HOTEL: 'services/hotels',
  CAB: 'services/cabs',
  BIKE: 'services/bikes',
  HOLIDAY: 'services/holidays',
  PARCEL: 'services/parcel',
};

export function ServicesSection() {
  return (
    <Section id="services-title">
      <SectionHeader
        id="services-title"
        title="Our Travel Services"
        subtitle="Everything you need for the journey — and for the everyday commute."
      />
      <Rail label="Travel services" cols="md:grid-cols-3">
        {SERVICES.map(({ type, label, path, tagline, icon: Icon }) => (
          <li key={type} className={railItem}>
            <Link
              to={path}
              className="group flex h-full overflow-hidden rounded-card border border-border bg-card transition-shadow hover:shadow-raised md:items-stretch"
            >
              <div className="relative aspect-[4/3] w-2/5 shrink-0 overflow-hidden md:aspect-auto">
                <TravelImage
                  id={IMAGE[type] as ImageId}
                  sizes="(min-width: 768px) 14vw, 30vw"
                  alt=""
                  className="transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-4">
                <span className="flex items-center gap-2 font-bold">
                  <Icon aria-hidden className="size-4 text-primary" /> {label}
                </span>
                <span className="text-sm text-muted">{tagline}</span>
                <span className="mt-1 flex items-center gap-1 text-xs font-bold text-primary">
                  Explore{' '}
                  <ArrowUpRight
                    aria-hidden
                    className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </Rail>
    </Section>
  );
}
