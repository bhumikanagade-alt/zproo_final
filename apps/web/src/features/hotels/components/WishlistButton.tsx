import { Heart } from 'lucide-react';
import { useWishlist } from '../wishlist';

interface Props {
  hotelId: string;
  hotelName: string;
  className?: string;
}

/** Heart toggle that saves a hotel to the signed-in user's wishlist. */
export function WishlistButton({ hotelId, hotelName, className = '' }: Props) {
  const { has, toggle } = useWishlist();
  const saved = has(hotelId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${hotelName} from saved hotels` : `Save ${hotelName}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(hotelId);
      }}
      className={`grid size-9 place-items-center rounded-full bg-white/90 shadow ring-1 ring-black/5 transition-colors hover:bg-white ${className}`}
    >
      <Heart aria-hidden className={`size-5 ${saved ? 'fill-red-500 text-red-500' : 'text-slate-600'}`} />
    </button>
  );
}
