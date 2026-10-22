import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import { hotelMapLinks, type Hotel } from '../data';

/** Embedded Google map pinned on the hotel's coordinates, with open / directions links. */
export function HotelMap({ hotel }: { hotel: Pick<Hotel, 'name' | 'area' | 'city' | 'address' | 'coordinates'> }) {
  const links = hotelMapLinks(hotel);
  const { lat, lng } = hotel.coordinates;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <iframe
        title={`Map showing the location of ${hotel.name}`}
        src={links.embed}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="h-72 w-full border-0 sm:h-80"
      />
      <div className="flex flex-col gap-3 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 font-bold text-slate-800"><MapPin className="size-4 text-primary" /> {hotel.name}</p>
          <p className="mt-1 text-sm text-slate-600">{hotel.address ?? `${hotel.area}, ${hotel.city}`}</p>
          <p className="mt-0.5 text-xs text-slate-500">GPS: {lat.toFixed(5)}, {lng.toFixed(5)}</p>
        </div>
        <div className="flex gap-2">
          <a href={links.open} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700">Open map <ExternalLink className="size-4" /></a>
          <a href={links.directions} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white"><Navigation className="size-4" /> Directions</a>
        </div>
      </div>
    </div>
  );
}
