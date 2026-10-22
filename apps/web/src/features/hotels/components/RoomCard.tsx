import { Badge, Button, Card, CardContent } from '@zproo/ui';
import { Bed, Check, Coffee, Eye, Maximize2, Users } from 'lucide-react';
import { MEAL_PLAN_LABEL, formatINR, type Hotel, type HotelRoom } from '../data';
import { describeCancellation } from '../cancellation';
import { roomBlockReason } from '../filters';
import type { RoomOccupancy } from '../occupancy';
import { offerPercent, priceStay } from '../pricing';

interface Props {
  hotel: Hotel;
  room: HotelRoom;
  checkIn: string;
  nights: number;
  occupancy: readonly RoomOccupancy[];
  onSelect: (room: HotelRoom) => void;
}

export function RoomCard({ hotel, room, checkIn, nights, occupancy, onSelect }: Props) {
  const rooms = occupancy.length || 1;
  const price = priceStay(room, nights, rooms);
  const blocked = roomBlockReason(room, occupancy);
  const cancellation = describeCancellation(room.cancellation, checkIn, hotel.checkInTime);
  const save = offerPercent(room);
  return (
    <Card className={blocked ? 'opacity-75' : ''} data-testid="room-card">
      <CardContent className="grid gap-5 p-0 md:grid-cols-[14rem_1fr_15rem]">
        <img src={room.image} alt={`${room.name} at ${hotel.name}`} loading="lazy" className="h-48 w-full object-cover md:h-full" />
        <div className="p-5 md:pl-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-extrabold">{room.name}</h3>
            {save && <Badge>{save}% off</Badge>}
            {room.roomsLeft <= 3 && <Badge variant="danger">Only {room.roomsLeft} left</Badge>}
          </div>
          <dl className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <div className="flex items-center gap-2"><Bed aria-hidden className="size-4" /> <dt className="sr-only">Beds</dt><dd>{room.beds}</dd></div>
            <div className="flex items-center gap-2"><Users aria-hidden className="size-4" /> <dt className="sr-only">Occupancy</dt><dd>Up to {room.maxAdults} adult{room.maxAdults === 1 ? '' : 's'}{room.maxChildren ? `, ${room.maxChildren} child${room.maxChildren === 1 ? '' : 'ren'}` : ''}</dd></div>
            <div className="flex items-center gap-2"><Maximize2 aria-hidden className="size-4" /> <dt className="sr-only">Room size</dt><dd>{room.size}</dd></div>
            <div className="flex items-center gap-2"><Eye aria-hidden className="size-4" /> <dt className="sr-only">View</dt><dd>{room.view}</dd></div>
            <div className="flex items-center gap-2 sm:col-span-2"><Coffee aria-hidden className="size-4" /> <dt className="sr-only">Meal plan</dt><dd>{MEAL_PLAN_LABEL[room.mealPlan]}</dd></div>
          </dl>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Room amenities">
            {room.amenities.map((a) => <li key={a} className="flex items-center gap-1"><Check aria-hidden className="size-3.5 text-primary" /> {a}</li>)}
          </ul>
          <div className="mt-3 space-y-1 text-sm">
            <p className={cancellation.kind === 'FREE' ? 'font-semibold text-green-800' : cancellation.kind === 'PARTIAL' ? 'font-semibold text-amber-800' : 'font-semibold text-danger'}>{cancellation.headline}</p>
            <p className="text-muted">{room.payAtProperty ? 'Pay at property: no prepayment needed.' : 'Pay now to confirm this booking.'}</p>
          </div>
          {cancellation.rules.length > 1 && (
            <details className="mt-2 text-xs text-muted">
              <summary className="cursor-pointer font-semibold text-primary">Cancellation rules</summary>
              <ul className="mt-1 list-disc space-y-1 pl-5">{cancellation.rules.map((r) => <li key={r}>{r}</li>)}</ul>
            </details>
          )}
        </div>
        <div className="flex flex-col justify-between border-t border-border p-5 md:border-l md:border-t-0 md:text-right">
          <div>
            {price.originalPerNightPaise !== null && <p className="text-sm text-muted line-through">{formatINR(price.originalPerNightPaise)}</p>}
            <p className="text-2xl font-extrabold">{formatINR(price.perNightPaise)}<span className="text-xs font-normal text-muted">/night</span></p>
            <p className="mt-1 text-sm">{formatINR(price.roomSubtotalPaise)} <span className="text-xs text-muted">{nights} night{nights === 1 ? '' : 's'}, {rooms} room{rooms === 1 ? '' : 's'}</span></p>
            <p className="text-xs text-muted">+ {formatINR(price.taxesPaise)} taxes &amp; fees</p>
            <p className="mt-1 text-lg font-extrabold">Total {formatINR(price.totalPaise)}</p>
          </div>
          <div className="mt-4">
            <Button className="w-full" disabled={blocked !== null} onClick={() => onSelect(room)}>{blocked ? 'Not available' : 'Select Room'}</Button>
            {blocked && <p role="note" className="mt-2 text-xs text-danger">{blocked}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
