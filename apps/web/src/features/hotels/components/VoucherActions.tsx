import { Button } from '@zproo/ui';
import { Bus, CalendarPlus, Mail, Navigation, Plane, Printer, Headset } from 'lucide-react';
import { Link } from 'react-router';
import type { ConfirmedBooking } from '../booking';
import { buildCalendarFile, buildEmailLink, directionsLink, downloadTextFile, supportMailLink } from '../voucher';

/** Print / email / calendar / directions / support actions for a confirmed booking. */
export function VoucherActions({ booking, showPrint = true }: { booking: ConfirmedBooking; showPrint?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {showPrint && <Button type="button" onClick={() => window.print()}><Printer aria-hidden /> Download voucher (PDF)</Button>}
      <Button asChild variant="outline"><a href={buildEmailLink(booking)}><Mail aria-hidden /> Email me a copy</a></Button>
      <Button type="button" variant="outline" onClick={() => downloadTextFile(`${booking.reference}.ics`, buildCalendarFile(booking), 'text/calendar;charset=utf-8')}>
        <CalendarPlus aria-hidden /> Add to calendar
      </Button>
      <Button asChild variant="outline"><a href={directionsLink(booking)} target="_blank" rel="noreferrer"><Navigation aria-hidden /> Directions</a></Button>
      <Button asChild variant="outline"><a href={supportMailLink(booking)}><Headset aria-hidden /> Contact support</a></Button>
    </div>
  );
}

/** Cross-sell for the other ZPROO services after a hotel booking. */
export function BundleCard({ city }: { city: string }) {
  return (
    <section aria-label="Complete your trip" className="rounded-2xl border border-border bg-primary-light/40 p-4 print:hidden">
      <h2 className="font-extrabold">Complete your trip to {city}</h2>
      <p className="mt-1 text-sm text-muted">Add a bus or a flight so your whole journey is booked in one place.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link to="/buses"><Bus aria-hidden /> Add a bus</Link></Button>
        <Button asChild variant="outline"><Link to="/flights"><Plane aria-hidden /> Add a flight</Link></Button>
      </div>
    </section>
  );
}
