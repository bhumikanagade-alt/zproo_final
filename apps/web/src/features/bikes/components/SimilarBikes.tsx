import { useAllBikes } from '../hooks';
import type { Bike } from '../types';
import { BikeCard } from './BikeCard';
import { SectionTitle } from './ui';

/** Up to three other bikes: same category first, then the closest daily price. */
export function SimilarBikes({ bike }: { bike: Bike }) {
  const { data } = useAllBikes();
  const similar = (data ?? [])
    .filter((b) => b.id !== bike.id && b.availability.status !== 'unavailable')
    .sort((a, b) => Number(b.category === bike.category) - Number(a.category === bike.category) || Math.abs(a.pricing.daily - bike.pricing.daily) - Math.abs(b.pricing.daily - bike.pricing.daily))
    .slice(0, 3);
  if (similar.length === 0) return null;
  return (
    <section aria-labelledby="similar-h">
      <SectionTitle id="similar-h">Similar bikes you may like</SectionTitle>
      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {similar.map((b) => <li key={b.id} className="flex"><div className="flex w-full"><BikeCard bike={b} /></div></li>)}
      </ul>
    </section>
  );
}
