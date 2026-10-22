import { Seo } from '@/components/seo/Seo';
import { HotelTile } from '@/features/hotels/components/HotelTile';
import { formatINR } from '@/features/hotels/data';
import { currentDeals } from '@/features/hotels/extras';

/** Every room that is currently on offer, deepest discount first. */
export default function DealsPage() {
  const deals = currentDeals();
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <Seo title="Hotel deals" noIndex />
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Today’s deals</p>
        <h1 className="mt-1 text-3xl font-extrabold">Hotel deals</h1>
        <p className="mt-2 text-muted">Rooms priced below their usual rate, biggest savings first. Use code ZPROO10 or STAY15 for more off.</p>
      </header>
      {deals.length === 0 ? (
        <p role="status" className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted">No deals right now. Check back soon.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((d) => (
            <div key={`${d.hotel.id}:${d.room.id}`}>
              <HotelTile hotel={d.hotel} badge={`${d.percent}% off`} fromPaise={d.room.pricePerNightPaise} />
              <p className="mt-1 px-1 text-xs text-muted">{d.room.name}: was <s>{formatINR(d.room.originalPricePerNightPaise ?? d.room.pricePerNightPaise)}</s> now {formatINR(d.room.pricePerNightPaise)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
