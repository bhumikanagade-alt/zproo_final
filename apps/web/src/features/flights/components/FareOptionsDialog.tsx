import type { FlightOffer } from '@zproo/types';
import { Badge, Button, Dialog, DialogContent, DialogTitle } from '@zproo/ui';
import { Check, Luggage } from 'lucide-react';
import { cancellationLabel, type FareOption } from '../fares';
import { cabinBaggageLabel, checkedBaggageLabel } from '../baggage';
import { dayShift, duration, inr, localDay, localTime, stopsLabel } from '../format';
import { AirlineMark } from './AirlineMark';

interface FareOptionsDialogProps {
  offer: FlightOffer | null;
  fares: FareOption[];
  /** The fare already chosen for this flight, if any (offer id). */
  selectedOfferId: string | null;
  onSelect: (offer: FlightOffer, fare: FareOption) => void;
  onClose: () => void;
}

/** "View Prices": the flight's details and every fare the API offers for it. */
export function FareOptionsDialog({
  offer,
  fares,
  selectedOfferId,
  onSelect,
  onClose,
}: FareOptionsDialogProps) {
  return (
    <Dialog open={offer !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="top-[4vh] max-h-[92vh] max-w-3xl overflow-y-auto p-4 sm:top-[8vh] sm:max-h-[84vh] sm:p-6"
      >
        <DialogTitle>Fare options</DialogTitle>
        {offer && (
          <div className="mt-4 space-y-5">
            <FlightSummary offer={offer} />
            <ul className="grid gap-3 sm:grid-cols-2">
              {fares.map((fare) => {
                const chosen = selectedOfferId === fare.offerId;
                return (
                  <li
                    key={fare.offerId}
                    className={
                      chosen
                        ? 'flex flex-col rounded-2xl border border-primary p-4 ring-1 ring-primary'
                        : 'flex flex-col rounded-2xl border border-border p-4'
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-bold">{fare.name}</h3>
                      <div className="text-right">
                        <p className="text-xl font-extrabold tabular-nums">{inr(fare.pricePaise)}</p>
                        <p className="text-xs text-muted">{inr(fare.perAdultPaise)} per adult</p>
                      </div>
                    </div>
                    <dl className="cursor-pointer mt-3 flex-1 space-y-2 text-sm">
                      <Row label="Cabin baggage" value={cabinBaggageLabel(fare.cabinBaggageKg)} />
                      <Row label="Checked baggage" value={checkedBaggageLabel(fare.checkedBaggageKg)} />
                      <Row label="Cancellation" value={cancellationLabel(fare)} />
                      <Row label="Seats available" value={String(fare.seatsLeft)} />
                    </dl>
                    <ul className="cursor-pointer mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted">
                      {fare.benefits.map((b) => (
                        <li key={b} className="flex gap-2">
                          <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-4 w-full"
                      variant={chosen ? 'secondary' : 'default'}
                      aria-pressed={chosen || undefined}
                      onClick={() => onSelect(offer, fare)}
                    >
                      {chosen ? 'Selected' : 'Select Fare'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function FlightSummary({ offer }: { offer: FlightOffer }) {
  const shift = dayShift(offer.departureAt, offer.from.timezone, offer.arrivalAt, offer.to.timezone);
  return (
    <div className="cursor-pointer rounded-2xl bg-background p-4">
      <div className="flex flex-wrap items-center gap-3">
        <AirlineMark code={offer.airline.code} />
        <div className="min-w-0 flex-1">
          <p className="cursor-pointer truncate text-sm font-semibold">{offer.airline.name}</p>
          <p className="text-xs text-muted">
            {offer.flightNumber} · {localDay(offer.departureAt, offer.from.timezone)}
          </p>
        </div>
        <Badge variant="outline">{stopsLabel(offer.stops)}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <p className="text-lg font-extrabold tabular-nums">
            {localTime(offer.departureAt, offer.from.timezone)}
          </p>
          <p className="text-xs text-muted">
            {offer.from.code} · {offer.from.city}
          </p>
        </div>
        <p className="text-center text-xs text-muted">{duration(offer.durationMinutes)}</p>
        <div className="text-right">
          <p className="text-lg font-extrabold tabular-nums">
            {localTime(offer.arrivalAt, offer.to.timezone)}
            {shift > 0 && <sup className="ml-0.5 text-[10px] font-bold text-primary">+{shift}</sup>}
          </p>
          <p className="text-xs text-muted">
            {offer.to.code} · {offer.to.city}
          </p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted">
        <Luggage aria-hidden className="size-4" />
        {offer.cabin.replace('_', ' ').toLowerCase()} cabin · baggage allowances are per adult
      </p>
    </div>
  );
}
