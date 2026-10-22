import { ArrowLeft } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { RoomCard } from '@/features/hotels/components/RoomCard';
import { findHotel, type HotelRoom } from '@/features/hotels/data';
import { formatDate } from '@/features/hotels/dates';
import { roomFitsOccupancy } from '@/features/hotels/filters';
import { hotelBookingUrl, hotelDetailsUrl } from '@/features/hotels/links';
import { guestsLabel } from '@/features/hotels/occupancy';
import { stayQuery } from '@/features/hotels/search';
import { useHotelBooking } from '@/features/hotels/store';
import { useStay } from '@/features/hotels/useStay';

export default function HotelRoomsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const stay = useStay();
  const hotel = id ? findHotel(id) : undefined;
  const setSearch = useHotelBooking((s) => s.setSearch);
  const selectRoom = useHotelBooking((s) => s.selectRoom);
  if (!hotel) return <Navigate to="/hotels/results" replace />;

  const available = hotel.rooms.filter((r) => roomFitsOccupancy(r, stay.occupancy)).length;
  const choose = (room: HotelRoom) => {
    if (!roomFitsOccupancy(room, stay.occupancy)) return;
    setSearch({ city: hotel.city, checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: stay.rooms, adults: stay.adults, children: stay.children, childAges: stay.childAges });
    selectRoom(hotel, room);
    void navigate(hotelBookingUrl);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Seo title={`Rooms at ${hotel.name}`} noIndex />
      <Link to={hotelDetailsUrl(hotel.id, stayQuery(stay))} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><ArrowLeft aria-hidden className="size-4" /> Hotel details</Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-bold text-primary">{hotel.name}</p><h1 className="text-3xl font-extrabold">Choose your room</h1></div>
      </div>
      <section aria-label="Your stay" className="mt-4 grid gap-3 rounded-2xl border border-border bg-card p-4 text-sm sm:grid-cols-4">
        <div><p className="text-xs text-muted">Selected rooms</p><p className="font-extrabold">{stay.rooms}</p></div>
        <div><p className="text-xs text-muted">Guests</p><p className="font-extrabold">{guestsLabel(stay.adults, stay.children)}</p></div>
        <div><p className="text-xs text-muted">Nights</p><p className="font-extrabold">{stay.nights}</p></div>
        <div><p className="text-xs text-muted">Dates</p><p className="font-extrabold">{formatDate(stay.checkIn)} → {formatDate(stay.checkOut)}</p></div>
      </section>
      {available === 0 && <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">None of these rooms can host your group as searched. Go back and change rooms or guests.</p>}
      <div className="mt-6 space-y-4">
        {hotel.rooms.map((room) => <RoomCard key={room.id} hotel={hotel} room={room} checkIn={stay.checkIn} nights={stay.nights} occupancy={stay.occupancy} onSelect={choose} />)}
      </div>
    </div>
  );
}
