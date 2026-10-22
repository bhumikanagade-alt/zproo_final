import { useEffect, useMemo, useState } from 'react';
import { OfferCard } from '@/features/offers/OfferCard';
import { OfferFilterChips } from '@/features/offers/OfferFilterChips';
import { OfferToast } from '@/features/offers/OfferToast';
import { OFFER_CSS } from '@/features/offers/offerStyles';
import { filterOffers, type OfferCategory } from '@/features/offers/offersData';
import { Section, SectionHeader } from './SectionHeader';

export function OffersSection() {
  const [filter, setFilter] = useState<OfferCategory>('all');
  const [copiedCode, setCopiedCode] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!copiedCode) return;
    const timer = window.setTimeout(() => setCopiedCode(''), 2500);
    return () => window.clearTimeout(timer);
  }, [copiedCode]);

  const offers = useMemo(() => filterOffers(filter), [filter]);
  /* Few results: show a static grid. Many: continuous carousel (duplicated, second copy hidden from AT). */
  const useCarousel = offers.length > 3;

  return (
    <>
      {copiedCode && <OfferToast code={copiedCode} />}

      <Section id="offers-title">
        <SectionHeader
          id="offers-title"
          title="Offers for you"
          subtitle="Apply the code at checkout. T&Cs apply."
          action={{ to: '/offers', label: 'All offers' }}
        />

        <OfferFilterChips value={filter} onChange={setFilter} />

        {useCarousel ? (
          <div
            className="relative mt-4 overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-8 bg-gradient-to-r from-background to-transparent sm:w-14" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-background to-transparent sm:w-14" />
            <ul
              key={filter}
              className="offers-carousel-track"
              style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
            >
              {[...offers, ...offers].map((offer, i) => {
                const dup = i >= offers.length;
                return (
                  <li
                    key={`${offer.code}-${i}`}
                    className="offers-carousel-card"
                    aria-hidden={dup || undefined}
                  >
                    <OfferCard
                      offer={offer}
                      index={i}
                      decorative={dup}
                      onCopied={setCopiedCode}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <ul
            key={filter}
            className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {offers.map((offer, i) => (
              <li key={offer.code}>
                <OfferCard offer={offer} index={i} onCopied={setCopiedCode} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <style>{OFFER_CSS}</style>
    </>
  );
}
