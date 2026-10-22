import { Badge, Button, Card, CardContent } from '@zproo/ui';
import { Check, MapPin, Star } from 'lucide-react';
import { Link } from 'react-router';
import { MAX_COMPARE, useCompare } from '../compare';
import { UrgencyBadges } from './UrgencyBadges';
import { WishlistButton } from './WishlistButton';
import { MEAL_PLAN_SHORT, formatINR } from '../data';
import { describeCancellation } from '../cancellation';
import { guestScore, scoreLabel, type HotelResult } from '../filters';
import { hotelDetailsUrl, hotelRoomsUrl } from '../links';
import { offerPercent } from '../pricing';

interface Props {
  result: HotelResult;
  nights: number;
  rooms: number;
  /** Stay query string appended to links so dates and guests carry over. */
  query: string;
  onSelect: () => void;
}

export function HotelCard({ result, nights, rooms, query, onSelect }: Props) {
  const { hotel, bestRoom: room, price } = result;
  const score = guestScore(hotel);
  const cancellation = describeCancellation(room.cancellation, '2999-01-01', hotel.checkInTime);
  const save = offerPercent(room);
  const amenities = hotel.amenities.slice(0, 5);
  const comparing = useCompare((c) => c.ids.includes(hotel.id));
  const compareFull = useCompare((c) => c.ids.length >= MAX_COMPARE);
  const toggleCompare = useCompare((c) => c.toggle);
  return (
    <Card className="overflow-hidden" data-testid="hotel-card">
      <CardContent className="grid gap-4 p-0 md:grid-cols-[15rem_1fr_15rem]">
        <div className="relative min-h-44">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${hotel.image}")` }} role="img" aria-label={hotel.name} />
          {save && <Badge className="absolute left-3 top-3">{save}% off</Badge>}
          <WishlistButton hotelId={hotel.id} hotelName={hotel.name} className="absolute right-3 top-3" />
          <label className="absolute bottom-3 left-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-800 shadow">
            <input
              type="checkbox"
              checked={comparing}
              disabled={!comparing && compareFull}
              onChange={() => toggleCompare(hotel.id)}
              aria-label={`Compare ${hotel.name}`}
              className="size-3.5 accent-[var(--primary)]"
            />
            Compare
          </label>
        </div>
        <div className="p-4 md:py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="soft">{hotel.stars} star</Badge>
            <Badge variant="outline">{hotel.propertyType}</Badge>
          </div>
          <h2 className="mt-2 text-xl font-extrabold">{hotel.name}</h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <MapPin aria-hidden className="size-4" /> {hotel.area}, {hotel.city} · {hotel.distance}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-0.5 font-bold text-primary-foreground">
              <Star aria-hidden className="size-3.5 fill-current" /> {score.toFixed(1)}
            </span>
            <strong>{scoreLabel(score)}</strong>
            <span className="text-muted">{hotel.reviewCount.toLocaleString('en-IN')} reviews</span>
          </p>
          <p className="mt-3 text-sm text-muted">
            <strong className="text-foreground">{room.name}</strong> · {room.beds} · {MEAL_PLAN_SHORT[room.mealPlan]}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Amenities">
            {amenities.map((a) => (
              <li key={a} className="flex items-center gap-1"><Check aria-hidden className="size-3.5 text-primary" /> {a === 'AC' ? 'Air conditioning' : a}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className={`rounded-full px-2.5 py-1 ${cancellation.kind === 'FREE' ? 'bg-success/10 text-green-800' : 'bg-background text-muted'}`}>
              {room.refundable ? 'Free cancellation' : 'Non-refundable'}
            </span>
            {room.breakfast && <span className="rounded-full bg-background px-2.5 py-1">Breakfast available</span>}
            {room.payAtProperty && <span className="rounded-full bg-background px-2.5 py-1">Pay at property</span>}
          </div>
        </div>
        <div className="flex flex-col justify-between border-t border-border p-4 md:border-l md:border-t-0 md:py-5">
          <div className="md:text-right">
            {price.originalPerNightPaise !== null && (
              <p className="text-sm text-muted line-through">{formatINR(price.originalPerNightPaise)}</p>
            )}
            <p className="text-2xl font-extrabold">{formatINR(price.perNightPaise)}</p>
            <p className="text-xs text-muted">per night{rooms > 1 ? ` · per room` : ''}</p>
            <p className="mt-2 text-sm">{formatINR(price.roomSubtotalPaise)} <span className="text-xs text-muted">{nights} night{nights === 1 ? '' : 's'}{rooms > 1 ? `, ${rooms} rooms` : ''}</span></p>
            <p className="text-xs text-muted">+ {formatINR(price.taxesPaise)} taxes &amp; fees</p>
            <p className="mt-1 text-lg font-extrabold">Total {formatINR(price.totalPaise)}</p>
            <UrgencyBadges hotel={hotel} room={room} className="mt-2" />
          </div>
          <div className="mt-4 grid gap-2">
            <Button asChild className="w-full" onClick={onSelect}>
              <Link to={hotelRoomsUrl(hotel.id, query)}>View rooms</Link>
            </Button>
            <Button asChild variant="outline" className="w-full" onClick={onSelect}>
              <Link to={hotelDetailsUrl(hotel.id, query)}>View details</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
