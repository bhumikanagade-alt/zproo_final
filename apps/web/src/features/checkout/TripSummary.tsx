import type { BookingDetails } from '@zproo/types';
import { BusTripSummary } from '@/features/buses/components/BusTripSummary';
import { ItinerarySummary } from '@/features/flights/components/ItinerarySummary';
import { TrainJourneySummary } from '@/features/trains/components/TrainJourneySummary';

/** What was booked: flight legs or the bus journey. */
export function TripSummary({
  booking,
  detailed = false,
}: {
  booking: BookingDetails;
  detailed?: boolean;
}) {
  if (booking.train) {
    return (
      <TrainJourneySummary
        train={booking.train.offer}
        travelClass={booking.train.travelClass}
        quota={booking.train.quota}
      />
    );
  }
  if (booking.bus) {
    return (
      <BusTripSummary
        trip={booking.bus.offer}
        boarding={booking.bus.boardingPoint}
        dropping={booking.bus.droppingPoint}
        seatNumbers={booking.bus.seatNumbers}
      />
    );
  }
  return <ItinerarySummary offers={booking.flights.map((f) => f.offer)} detailed={detailed} />;
}
