import { Button } from '@zproo/ui';
import { ArrowLeft, Check, Minus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { useCompare } from '@/features/hotels/compare';
import { LOCATION_TAG_LABEL, findHotel, formatINR, type Hotel } from '@/features/hotels/data';
import { beachDistanceKm, hasFrontDesk24, isCoupleFriendly } from '@/features/hotels/extras';
import { guestScore, scoreLabel } from '@/features/hotels/filters';
import { hotelRoomsUrl } from '@/features/hotels/links';

const cheapest = (h: Hotel) => [...h.rooms].sort((a, b) => a.pricePerNightPaise - b.pricePerNightPaise)[0];

const Yes = () => <Check aria-label="Yes" className="mx-auto size-4 text-green-700" />;
const No = () => <Minus aria-label="No" className="mx-auto size-4 text-muted" />;

/** Side-by-side comparison of 2–3 hotels picked on the results page. */
export default function ComparePage() {
  const [params] = useSearchParams();
  const stored = useCompare((s) => s.ids);
  const fromUrl = (params.get('ids') ?? '').split(',').filter(Boolean);
  const ids = (fromUrl.length > 0 ? fromUrl : stored).slice(0, 3);
  const hotels = ids.map((id) => findHotel(id)).filter((h) => h !== undefined);
  const stay = new URLSearchParams(params);
  stay.delete('ids');
  const query = stay.toString();
  const back = query ? `/hotels/results?${query}` : '/hotels/results';

  if (hotels.length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <Seo title="Compare hotels" noIndex />
        <p role="status" className="text-lg font-extrabold">Pick at least two hotels to compare</p>
        <p className="mt-1 text-sm text-muted">Tick “Compare” on the hotel cards in your results.</p>
        <Button asChild className="mt-4"><Link to={back}>Back to results</Link></Button>
      </div>
    );
  }

  const rows: { label: string; cell: (h: Hotel) => React.ReactNode }[] = [
    { label: 'Price per night (from)', cell: (h) => <strong>{formatINR(cheapest(h)?.pricePerNightPaise ?? 0)}</strong> },
    { label: 'Guest rating', cell: (h) => `${guestScore(h).toFixed(1)} ${scoreLabel(guestScore(h))} (${h.reviewCount.toLocaleString('en-IN')})` },
    { label: 'Stars', cell: (h) => `${h.stars} star` },
    { label: 'Property type', cell: (h) => h.propertyType },
    { label: 'Area', cell: (h) => `${h.area}, ${h.city}` },
    { label: 'Distance', cell: (h) => h.distance },
    { label: 'Distance to beach', cell: (h) => { const d = beachDistanceKm(h); return d === null ? '—' : `${d} km`; } },
    { label: 'Location', cell: (h) => h.locationTags.map((t) => LOCATION_TAG_LABEL[t]).join(', ') || '—' },
    { label: 'Check-in / out', cell: (h) => `${h.checkInTime} / ${h.checkOutTime}` },
    { label: 'Free cancellation', cell: (h) => (h.rooms.some((r) => r.refundable) ? <Yes /> : <No />) },
    { label: 'Pay at property', cell: (h) => (h.rooms.some((r) => r.payAtProperty) ? <Yes /> : <No />) },
    { label: 'Breakfast option', cell: (h) => (h.rooms.some((r) => r.breakfast) ? <Yes /> : <No />) },
    { label: 'Couple friendly', cell: (h) => (isCoupleFriendly(h) ? <Yes /> : <No />) },
    { label: '24-hour front desk', cell: (h) => (hasFrontDesk24(h) ? <Yes /> : <No />) },
    { label: 'Wi-Fi', cell: (h) => (h.amenities.includes('Wi-Fi') ? <Yes /> : <No />) },
    { label: 'Pool', cell: (h) => (h.amenities.includes('Pool') ? <Yes /> : <No />) },
    { label: 'Parking', cell: (h) => (h.amenities.includes('Parking') ? <Yes /> : <No />) },
    { label: 'Gym', cell: (h) => (h.amenities.includes('Gym') ? <Yes /> : <No />) },
    { label: 'Spa', cell: (h) => (h.amenities.includes('Spa') ? <Yes /> : <No />) },
    { label: 'Pet friendly', cell: (h) => (h.amenities.includes('Pet friendly') ? <Yes /> : <No />) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Seo title="Compare hotels" noIndex />
      <Link to={back} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><ArrowLeft aria-hidden className="size-4" /> Back to results</Link>
      <h1 className="mt-3 text-center text-3xl font-extrabold">Compare hotels</h1>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[48rem] text-sm">
          <caption className="sr-only">Hotel comparison</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-44 p-3 text-left text-xs text-muted">Hotel</th>
              {hotels.map((h) => (
                <th key={h.id} scope="col" className="p-3 text-left align-top">
                  <span role="img" aria-label={h.name} className="mb-3 block h-44 w-full rounded-xl bg-cover bg-center sm:h-56" style={{ backgroundImage: `url("${h.image}")` }} />
                  <span className="block font-extrabold">{h.name}</span>
                  <Button asChild size="sm" className="mt-2"><Link to={hotelRoomsUrl(h.id, query)}>View rooms</Link></Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0">
                <th scope="row" className="p-3 text-left font-semibold">{r.label}</th>
                {hotels.map((h) => <td key={h.id} className="p-3 text-center sm:text-left">{r.cell(h)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
