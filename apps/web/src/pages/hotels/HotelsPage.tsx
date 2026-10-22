import { HotelSearchForm } from '@/features/search/forms/HotelSearchForm';
import { Card, CardContent } from '@zproo/ui';
import {
  BedDouble,
  CheckCircle2,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { DestinationsSection } from '@/features/home/sections/DestinationsSection';
import { HotelsSection } from '@/features/home/sections/HotelsSection';
import { DiscoverySections } from '@/features/hotels/components/DiscoverySections';
import { hotelCityUrl } from '@/features/search/url';
import { TravelHero } from '@/components/media/TravelHero';

type HotelFeature = {
  icon: LucideIcon;
  title: string;
  text: string;
};

const hotelFeatures: HotelFeature[] = [
  {
    icon: ShieldCheck,
    title: 'Transparent pricing',
    text: 'Taxes and charges are shown before payment.',
  },
  {
    icon: BedDouble,
    title: 'Flexible room plans',
    text: 'Compare breakfast and cancellation terms.',
  },
  {
    icon: CheckCircle2,
    title: 'Secure booking',
    text: 'Your reservation and payment status stay linked.',
  },
];

export default function HotelsPage() {
  return (
    <div className="hotel-theme bg-background text-foreground">
      <Seo
        title="Book hotels"
        description="Search and book hotels with ZPROO GO."
      />

      <TravelHero
        image="hotel"
        eyebrow="ZPROO Hotels"
        title="Find a stay you will love"
        subtitle="Compare verified stays, room plans, cancellation policies and final prices before you pay."
        search={
          <div className="rounded-3xl border border-border bg-card p-5 shadow-raised sm:p-8">
            <HotelSearchForm />
          </div>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {hotelFeatures.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="flex gap-3 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
                  <Icon aria-hidden className="size-5" />
                </span>

                <div>
                  <p className="font-bold">{title}</p>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <HotelsSection
        action={{ to: '/hotels/results', label: 'View all hotels' }}
      />

      <DiscoverySections />

      <DestinationsSection
        linkFor={hotelCityUrl}
        action={{ to: '/hotels/results', label: 'Browse all stays' }}
        subtitle="Find a stay in the places India is travelling to this season."
      />
    </div>
  );
}
