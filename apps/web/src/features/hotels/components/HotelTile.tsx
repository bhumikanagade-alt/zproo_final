import { Star } from 'lucide-react';
import { Link } from 'react-router';
import { formatINR, type Hotel } from '../data';
import { guestScore, scoreLabel } from '../filters';
import { hotelDetailsUrl } from '../links';
import { WishlistButton } from './WishlistButton';

interface Props {
  hotel: Hotel;
  /** Optional corner badge, e.g. “25% off”. */
  badge?: string;
  /** Overrides the “from” price (paise per night), e.g. for a single discounted room. */
  fromPaise?: number;
  query?: string;
}

/** Compact hotel card used on saved, destination, collection and deals pages. */
export function HotelTile({ hotel, badge, fromPaise, query }: Props) {
  const from = fromPaise ?? Math.min(...hotel.rooms.map((r) => r.pricePerNightPaise));
  const score = guestScore(hotel);
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card" data-testid="hotel-tile">
      <div className="relative h-44">
        <div role="img" aria-label={hotel.name} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${hotel.image}")` }} />
        {badge && <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{badge}</span>}
        <WishlistButton hotelId={hotel.id} hotelName={hotel.name} className="absolute right-3 top-3" />
      </div>
      <div className="p-4">
        <h3 className="truncate text-lg font-extrabold"><Link to={hotelDetailsUrl(hotel.id, query)} className="hover:underline">{hotel.name}</Link></h3>
        <p className="truncate text-sm text-muted">{hotel.area}, {hotel.city} · {hotel.stars} star {hotel.propertyType}</p>
        <div className="mt-3 flex items-end justify-between">
          <p className="inline-flex items-center gap-1 text-sm font-bold"><Star aria-hidden className="size-4 fill-current" /> {score.toFixed(1)} <span className="font-normal text-muted">{scoreLabel(score)}</span></p>
          <p className="text-right"><strong className="text-lg">{formatINR(from)}</strong><span className="block text-xs text-muted">per night</span></p>
        </div>
      </div>
    </article>
  );
}
