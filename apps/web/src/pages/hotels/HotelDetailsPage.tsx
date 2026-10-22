import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@zproo/ui';
import { ArrowLeft, Car, Check, Clock, Coffee, Dumbbell, MapPin, PawPrint, Plane, Sparkles, Star, UtensilsCrossed, Waves, Wifi, Wind, BellRing, Baby } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { Gallery } from '@/features/hotels/components/Gallery';
import { FaqSection, PoliciesSection } from '@/features/hotels/components/InfoSections';
import { ReviewsSection } from '@/features/hotels/components/ReviewsSection';
import { SimilarHotels } from '@/features/hotels/components/SimilarHotels';
import { StickyPriceBar } from '@/features/hotels/components/StickyPriceBar';
import { WishlistButton } from '@/features/hotels/components/WishlistButton';
import { categorisePhotos } from '@/features/hotels/extras';
import { HotelMap } from '@/features/hotels/components/HotelMap';
import { findHotel, formatINR, type HotelAmenity } from '@/features/hotels/data';
import { guestScore, scoreLabel } from '@/features/hotels/filters';
import { hotelRoomsUrl } from '@/features/hotels/links';
import { stayQuery } from '@/features/hotels/search';
import { priceStay } from '@/features/hotels/pricing';
import { useStay } from '@/features/hotels/useStay';

const AMENITY_ICON: Record<HotelAmenity, ReactNode> = {
  'Wi-Fi': <Wifi aria-hidden className="size-4" />,
  Breakfast: <Coffee aria-hidden className="size-4" />,
  Pool: <Waves aria-hidden className="size-4" />,
  Parking: <Car aria-hidden className="size-4" />,
  AC: <Wind aria-hidden className="size-4" />,
  Restaurant: <UtensilsCrossed aria-hidden className="size-4" />,
  Gym: <Dumbbell aria-hidden className="size-4" />,
  Spa: <Sparkles aria-hidden className="size-4" />,
  'Airport transfer': <Plane aria-hidden className="size-4" />,
  'Room service': <BellRing aria-hidden className="size-4" />,
  'Pet friendly': <PawPrint aria-hidden className="size-4" />,
  'Family friendly': <Baby aria-hidden className="size-4" />,
};

export default function HotelDetailsPage() {
  const { id } = useParams();
  const stay = useStay();
  const hotel = id ? findHotel(id) : undefined;
  if (!hotel) return <Navigate to="/hotels/results" replace />;
  const query = stayQuery(stay);
  const cheapest = [...hotel.rooms].sort((a, b) => a.pricePerNightPaise - b.pricePerNightPaise)[0];
  if (!cheapest) return <Navigate to="/hotels/results" replace />;
  const price = priceStay(cheapest, stay.nights, stay.rooms);
  const score = guestScore(hotel);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6">
      <Seo title={hotel.name} noIndex />
      <Link to={`/hotels/results?${query}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><ArrowLeft aria-hidden className="size-4" /> Back to hotels</Link>
      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="relative">
          <Gallery images={hotel.gallery} name={hotel.name} categories={categorisePhotos(hotel)} />
          <WishlistButton hotelId={hotel.id} hotelName={hotel.name} className="absolute right-4 top-14 z-10" />
        </div>
        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_22rem]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="soft">{hotel.stars} star</Badge>
              <Badge variant="outline">{hotel.propertyType}</Badge>
              <span className="flex items-center gap-1 text-sm font-bold"><Star aria-hidden className="size-4 fill-current" /> {score.toFixed(1)} {scoreLabel(score)} <span className="font-normal text-muted">· {hotel.reviewCount.toLocaleString('en-IN')} reviews</span></span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold">{hotel.name}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><MapPin aria-hidden className="size-4" /> {hotel.address}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><Clock aria-hidden className="size-4" /> Check-in from {hotel.checkInTime} · Check-out until {hotel.checkOutTime}</p>

            <h2 className="mt-7 text-lg font-extrabold">About this hotel</h2>
            <p className="mt-2 leading-7 text-muted">{hotel.description}</p>
            <ul className="mt-3 space-y-1 text-sm" aria-label="Highlights">
              {hotel.highlights.map((h) => <li key={h} className="flex items-center gap-2"><Check aria-hidden className="size-4 text-primary" /> {h}</li>)}
            </ul>

            <h2 className="mt-7 text-lg font-extrabold">Amenities</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Amenities">
              {hotel.amenities.map((a) => <li key={a} className="flex items-center gap-2 text-sm"><span className="text-primary">{AMENITY_ICON[a]}</span> {a === 'AC' ? 'Air conditioning' : a}</li>)}
            </ul>

            <h2 className="mt-7 text-lg font-extrabold">Location</h2>
            <p className="mt-2 text-sm text-muted">{hotel.address}</p>
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border text-sm" aria-label="Nearby landmarks">
              {hotel.landmarks.map((l) => (
                <li key={l.name} className="flex justify-between px-4 py-2"><span>{l.name}</span><span className="text-muted">{l.distanceKm < 1 ? `${Math.round(l.distanceKm * 1000)} m` : `${l.distanceKm} km`}</span></li>
              ))}
            </ul>
            <div className="mt-4"><HotelMap hotel={hotel} /></div>

            <PoliciesSection hotel={hotel} />
            <ReviewsSection hotel={hotel} />
            <FaqSection hotel={hotel} />
          </div>
          <Card className="h-fit lg:sticky lg:top-24">
            <CardHeader><CardTitle>From {formatINR(price.perNightPaise)} <span className="text-sm font-normal text-muted">per night</span></CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted">{stay.nights} night{stay.nights === 1 ? '' : 's'} · {stay.rooms} room{stay.rooms === 1 ? '' : 's'} · {formatINR(price.totalPaise)} total incl. {formatINR(price.taxesPaise)} taxes &amp; fees</p>
              <Button asChild size="lg" className="mt-5 w-full"><Link to={hotelRoomsUrl(hotel.id, query)}>View rooms</Link></Button>
            </CardContent>
          </Card>
        </div>
        <SimilarHotels hotel={hotel} query={query} />
      </div>
      <StickyPriceBar name={hotel.name} priceLabel={`From ${formatINR(price.perNightPaise)}`} detail={`per night · ${formatINR(price.totalPaise)} total`} to={hotelRoomsUrl(hotel.id, query)} />
    </div>
  );
}
