import type { BusSeatInfo } from '@zproo/types';
import { Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogTitle, Skeleton } from '@zproo/ui';
import { ArrowRight, Map as MapIcon, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { useBusTrip, useSeatMap } from '@/features/buses/api';
import { BusRouteMap } from '@/features/buses/components/BusRouteMap';
import { BusTripSummary } from '@/features/buses/components/BusTripSummary';
import { PointPicker } from '@/features/buses/components/PointPicker';
import { SeatMap } from '@/features/buses/components/SeatMap';
import { useBusDraft } from '@/features/buses/draft';
import { busTypeLabel } from '@/features/buses/format';
import { CheckoutShell } from '@/features/checkout/CheckoutShell';
import { DemoBanner } from '@/features/checkout/DemoBanner';
import { inr } from '@/features/flights/format';
import { BusInfoPanel } from '@/features/buses/components/BusInfoPanel';
import { useBookingSession } from '@/features/checkout/bookingSession';
import { useCountdown } from '@/hooks/useCountdown';
import { busesApi } from '@/features/buses/api';

export default function BusSeatsPage() {
  const { id } = useParams();
  const trip = useBusTrip(id);
  const map = useSeatMap(id);

  if (trip.isPending || map.isPending) {
    return (
      <CheckoutShell step={1} service="bus" title="Choose your seats">
        <Skeleton className="h-96 rounded-2xl" />
      </CheckoutShell>
    );
  }
  if (trip.error || map.error || !trip.data || !map.data) {
    return (
      <CheckoutShell step={1} service="bus" title="Choose your seats">
        <FormAlert>{errorMessage(trip.error ?? map.error)}</FormAlert>
        <Button asChild variant="outline">
          <Link to="/buses">Search buses</Link>
        </Button>
      </CheckoutShell>
    );
  }
  return <Seats key={trip.data.id} />;
}

function Seats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const back = (location.state as { from?: string } | null)?.from;
  const trip = useBusTrip(id).data;
  const map = useSeatMap(id).data;
  const draft = useBusDraft();
  const session = useBookingSession();
  // Opening a different bus starts its own fresh timer (otherwise an old, expired one would block it).
  const tripKey = trip?.id;
  useEffect(() => {
    if (tripKey) useBookingSession.getState().begin(`bus:${tripKey}`);
  }, [tripKey]);
  const secondsLeft = useCountdown(session.expiresAt ?? Date.now());
  useEffect(() => {
    if (secondsLeft !== 0 || !draft.contact || !session.started || !trip) return;
    const key = `zproo-abandonment:${trip.id}:${session.startedAt}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    void busesApi.abandonment({ tripId: trip.id, travelDate: trip.date, seats: draft.selection?.seats.map((s) => s.number), contactEmail: draft.contact.email });
  }, [secondsLeft, draft.contact, draft.selection, session.started, session.startedAt, trip]);
  // Coming back from the traveller step: start from the seats and points already chosen.
  const previous = draft.selection?.tripId === trip?.id ? draft.selection : null;
  const [selected, setSelected] = useState<string[]>(previous?.seats.map((s) => s.number) ?? []);
  const [boardingId, setBoardingId] = useState(
    previous?.boardingPointId ?? trip?.boardingPoints[0]?.id ?? '',
  );
  const [droppingId, setDroppingId] = useState(
    previous?.droppingPointId ?? trip?.droppingPoints.at(-1)?.id ?? '',
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [appOpen, setAppOpen] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);
  if (!trip || !map) return null;

  const seats = new Map(map.decks.flatMap((d) => d.seats).map((s) => [s.number, s]));
  // Seats someone else took since they were chosen drop out of the selection.
  const chosen = selected
    .map((n) => seats.get(n))
    .filter((s): s is BusSeatInfo => Boolean(s?.available));
  const lost = selected.length - chosen.length;
  const total = chosen.reduce((sum, s) => sum + s.pricePaise, 0);

  const toggle = (seat: BusSeatInfo) => {
    setNotice(null);
    if (selected.includes(seat.number)) {
      setSelected(selected.filter((n) => n !== seat.number));
    } else if (chosen.length >= map.maxSeats) {
      setNotice(`You can book up to ${map.maxSeats} seats at a time.`);
    } else {
      setSelected([...selected.filter((n) => seats.get(n)?.available), seat.number]);
    }
  };

  const proceed = () => {
    if (secondsLeft === 0) { setNotice('Your booking timer has expired. Start a new search to continue.'); return; }
    draft.start({
      tripId: trip.id,
      seats: chosen.map((s) => ({
        number: s.number,
        pricePaise: s.pricePaise,
        ladiesOnly: s.ladiesOnly,
      })),
      boardingPointId: boardingId,
      droppingPointId: droppingId,
      expectedTotalPaise: total,
      seatsUrl: location.pathname,
    });
    void navigate('/buses/booking');
  };

  const summary = (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">
          {chosen.length === 0
            ? 'No seats selected'
            : `Seat${chosen.length === 1 ? '' : 's'} ${chosen.map((s) => s.number).join(', ')}`}
        </p>
        <p className="text-xl font-extrabold tabular-nums">{inr(total)}</p>
      </div>
      <Button
        size="lg"
        disabled={chosen.length === 0 || !boardingId || !droppingId || secondsLeft === 0}
        onClick={proceed}
      >
        Continue <ArrowRight aria-hidden />
      </Button>
    </div>
  );

  return (
    <div className="w-full min-w-0 overflow-x-hidden pb-28 lg:pb-0">
      <CheckoutShell
        step={1}
        service="bus"
        title="Choose your seats"
        back={{ to: back ?? '/buses', label: back ? 'Back to buses' : 'Search buses' }}
        aside={
          <div className="w-full min-w-0 space-y-5 lg:w-[430px]">
            {/* Journey Details */}
            <Card className="w-full min-w-0">
              <CardContent className="p-5">
                <div className="mb-5">
                  <h2 className="text-lg font-extrabold">Journey details</h2>

                  <p className="mt-1 text-sm text-muted">
                    Select your boarding and dropping points
                  </p>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-5 min-[600px]:grid-cols-2">
                  <PointPicker
                    label="Boarding point"
                    points={trip.boardingPoints}
                    value={boardingId}
                    onChange={setBoardingId}
                  />

                  <PointPicker
                    label="Dropping point"
                    points={trip.droppingPoints}
                    value={droppingId}
                    onChange={setDroppingId}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 w-full"
                  onClick={() => setMapOpen(true)}
                >
                  <MapIcon aria-hidden /> View more
                </Button>
              </CardContent>
            </Card>

            {/* Desktop price summary */}
            <Card className="hidden lg:block">
              <CardContent className="p-4">{summary}</CardContent>
            </Card>
          </div>
        }
      >
        <p className="-mt-3 text-sm text-muted">
          {trip.operator.name} · {busTypeLabel(trip.bus)} · {trip.seatsAvailable} seats left
        </p>
        {trip.provider === 'mock' && <DemoBanner service="bus" />}
        {lost > 0 && (
          <FormAlert>
            {lost === 1 ? 'A seat you chose was' : `${lost} seats you chose were`} just booked by
            someone else and removed from your selection.
          </FormAlert>
        )}
        {notice && <FormAlert>{notice}</FormAlert>}
        <SeatMap map={map} selected={chosen.map((s) => s.number)} onToggle={toggle} />
        <BusInfoPanel trip={trip} />
        <Dialog open={appOpen} onOpenChange={setAppOpen}><DialogContent className="max-w-sm"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-light text-primary"><Smartphone /></div><DialogTitle className="mt-3 text-center">Book faster on the app</DialogTitle><DialogDescription className="mt-2 text-center">Get eligible app offers and keep your ticket available on your phone.</DialogDescription><Button className="mt-5 w-full" onClick={() => setAppOpen(false)}>Continue on web</Button></DialogContent></Dialog>
        <Dialog open={mapOpen} onOpenChange={setMapOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogTitle>Route map</DialogTitle>
            <DialogDescription>
              {trip.from.name} → {trip.to.name} · exact boarding and dropping locations
            </DialogDescription>
            <div className="mt-3">
              <BusRouteMap
                trip={trip}
                boarding={trip.boardingPoints.find((p) => p.id === boardingId)}
                dropping={trip.droppingPoints.find((p) => p.id === droppingId)}
              />
            </div>
          </DialogContent>
        </Dialog>
        <BusTripSummary
          trip={trip}
          boarding={trip.boardingPoints.find((p) => p.id === boardingId)}
          dropping={trip.droppingPoints.find((p) => p.id === droppingId)}
        />
      </CheckoutShell>
      <div className="fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        {summary}
      </div>
    </div>
  );
}
