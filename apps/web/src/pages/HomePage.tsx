import { BRAND } from '@zproo/config';
import { Seo } from '@/components/seo/Seo';
import { lazy, Suspense } from 'react';
import { useIdleReady } from '@/hooks/useIdleReady';

// The app-discount popup opens once per visit; load it after the page is interactive.
const AppDiscountPopup = lazy(() =>
  import('@/components/promotions/AppDiscountPopup').then((m) => ({ default: m.AppDiscountPopup })),
);
import { env } from '@/lib/env';
import { AppPromo } from '@/features/home/sections/AppPromo';
import { DestinationsSection } from '@/features/home/sections/DestinationsSection';
import { FlightDeals } from '@/features/home/sections/FlightDeals';
import { GroundTransport } from '@/features/home/sections/GroundTransport';
import { Hero } from '@/features/home/sections/Hero';
import { HotelsSection } from '@/features/home/sections/HotelsSection';
import { OffersSection } from '@/features/home/sections/OffersSection';
import { ServicesSection } from '@/features/home/sections/ServicesSection';
import { WalletPromo } from '@/features/home/sections/WalletPromo';
import { WhyUs } from '@/features/home/sections/WhyUs';

export default function HomePage() {
  const [popupReady] = useIdleReady(3000);
  const site = env.configuredSiteUrl;
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: BRAND.name,
      ...(site && { url: site, logo: `${site}${BRAND.assets.logo}` }),
      slogan: BRAND.tagline,
      description: BRAND.description,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: BRAND.name,
      ...(site && { url: site }),
    },
  ];
  return (
    <>
      <Seo description="Book flights, buses, trains, hotels, cabs, bike rentals, holiday packages and parcels in one place. Travel Smarter. Go Further." />
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      <Hero />
      <ServicesSection />
      <FlightDeals />
      <GroundTransport />
      <HotelsSection />
      <DestinationsSection />
      <WalletPromo />
      <OffersSection />
      <AppPromo />
      <WhyUs />
      {popupReady && (
        <Suspense fallback={null}>
          <AppDiscountPopup autoOpen />
        </Suspense>
      )}
    </>
  );
}
