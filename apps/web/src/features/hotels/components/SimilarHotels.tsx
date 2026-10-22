import { Star } from 'lucide-react';
import { Link } from 'react-router';
import type { Hotel } from '../data';
import { formatINR } from '../data';
import { similarHotels } from '../extras';
import { guestScore } from '../filters';
import { hotelDetailsUrl } from '../links';

/** Horizontal strip of comparable hotels at the bottom of the details page. */
export function SimilarHotels({ hotel, query }: { hotel: Hotel; query: string }) {
  const list = similarHotels(hotel, 4);
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="similar-heading" className="border-t border-border p-5 sm:p-8">
      <h2 id="similar-heading" className="text-lg font-extrabold">Similar hotels you may like</h2>
      <ul className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {list.map((h) => {
          const from = Math.min(...h.rooms.map((r) => r.pricePerNightPaise));
          return (
            <li key={h.id} className="w-64 shrink-0">
              <Link to={hotelDetailsUrl(h.id, query)} className="block overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-raised">
                <span role="img" aria-label={h.name} className="block h-36 bg-cover bg-center" style={{ backgroundImage: `url("${h.image}")` }} />
                <span className="block p-3">
                  <span className="block truncate font-extrabold">{h.name}</span>
                  <span className="block truncate text-xs text-muted">{h.area}, {h.city}</span>
                  <span className="mt-2 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1 font-bold"><Star aria-hidden className="size-3.5 fill-current" /> {guestScore(h).toFixed(1)}</span>
                    <span><strong>{formatINR(from)}</strong> <span className="text-xs text-muted">/ night</span></span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
