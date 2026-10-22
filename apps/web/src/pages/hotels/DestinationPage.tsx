import { Button } from '@zproo/ui';
import { CalendarDays, MapPin } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { HotelTile } from '@/features/hotels/components/HotelTile';
import { formatINR } from '@/features/hotels/data';
import { destinationInfo } from '@/features/hotels/extras';
import { hotelCityUrl } from '@/features/search/url';

/** “Hotels in Goa”: top areas, best time to visit, and every stay in the city. */
export default function DestinationPage() {
  const { city = '' } = useParams();
  const info = destinationInfo(city.toLowerCase());
  if (!info) return <Navigate to="/hotels" replace />;
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <Seo title={`Hotels in ${info.city}`} description={`Book stays in ${info.city} from ${formatINR(info.fromPaise)} a night.`} />
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Destination guide</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Hotels in {info.city}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted">{info.about}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-light px-4 py-2 font-semibold text-primary"><CalendarDays aria-hidden className="size-4" /> Best time: {info.bestTime}</span>
          <span className="rounded-full bg-background px-4 py-2 font-semibold ring-1 ring-border">{info.hotels.length} stays from {formatINR(info.fromPaise)} a night</span>
        </div>
        <Button asChild className="mt-5"><Link to={hotelCityUrl(info.city)}>Search {info.city} with dates</Link></Button>
      </header>

      <section aria-labelledby="areas-heading">
        <h2 id="areas-heading" className="text-xl font-extrabold">Top areas to stay</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {info.areas.map((a) => (
            <li key={a} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold"><MapPin aria-hidden className="size-4 text-primary" /> {a}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="stays-heading">
        <h2 id="stays-heading" className="text-xl font-extrabold">Stays in {info.city}</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {info.hotels.map((h) => <HotelTile key={h.id} hotel={h} />)}
        </div>
      </section>
    </div>
  );
}
