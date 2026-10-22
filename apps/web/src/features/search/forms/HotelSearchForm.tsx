import { CalendarDays } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { DestinationField } from '@/features/hotels/components/DestinationField';
import { RoomsGuestsField } from '@/features/hotels/components/RoomsGuestsField';
import { addDays, diffNights, isIsoDate, todayIso } from '@/features/hotels/dates';
import { distributeGuests, type RoomOccupancy } from '@/features/hotels/occupancy';
import { rememberSearch } from '@/features/hotels/recent';
import {
  DEFAULT_LEAD_DAYS,
  DEFAULT_STAY_NIGHTS,
  buildResultsUrl,
  validateHotelSearch,
  type SearchIssue,
} from '@/features/hotels/search';
import { DateField } from '../components/DateField';
import { SearchButton } from '../components/SearchButton';

const STAY_SHORTCUTS = [
  { label: 'Tonight', offset: 0, nights: 1 },
  { label: 'Tomorrow', offset: 1, nights: 1 },
  { label: 'This weekend', offset: -1, nights: 2 },
] as const;

/** Next Saturday (or today if already Saturday), used for the "This weekend" shortcut. */
function nextSaturday(today: string): string {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  const day = new Date(y, m - 1, d).getDay();
  return addDays(today, (6 - day + 7) % 7);
}

export function HotelSearchForm() {
  const navigate = useNavigate();
  const today = todayIso();
  const [query, setQuery] = useState('Goa');
  const [checkIn, setCheckIn] = useState(addDays(today, DEFAULT_LEAD_DAYS));
  const [checkOut, setCheckOut] = useState(addDays(today, DEFAULT_LEAD_DAYS + DEFAULT_STAY_NIGHTS));
  const [occupancy, setOccupancy] = useState<RoomOccupancy[]>(() => distributeGuests(1, 2, []));
  const [submitted, setSubmitted] = useState(false);

  const issues = useMemo(
    () => validateHotelSearch({ query, checkIn, checkOut, occupancy }, today),
    [query, checkIn, checkOut, occupancy, today],
  );
  const messageFor = (field: SearchIssue['field']) =>
    submitted ? issues.find((i) => i.field === field)?.message : undefined;
  const nights = isIsoDate(checkIn) && isIsoDate(checkOut) ? diffNights(checkIn, checkOut) : 0;

  const pickCheckIn = (value: string) => {
    setCheckIn(value);
    // Keep the stay valid: check-out must stay after check-in.
    if (value && (!isIsoDate(checkOut) || checkOut <= value)) setCheckOut(addDays(value, 1));
  };

  const shortcut = (label: (typeof STAY_SHORTCUTS)[number]['label'], offset: number, stay: number) => {
    const start = label === 'This weekend' ? nextSaturday(today) : addDays(today, offset);
    setCheckIn(start);
    setCheckOut(addDays(start, stay));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (issues.length > 0) return;
    rememberSearch(query);
    void navigate(buildResultsUrl({ query, checkIn, checkOut, occupancy }));
  };

  const occupancyIssues = issues.filter((i) => i.field === 'occupancy');

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Search hotels" className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.8fr)] lg:items-start">
        <DestinationField value={query} onChange={setQuery} error={messageFor('query')} />
        <DateField
          label="Check-in"
          value={checkIn}
          onChange={pickCheckIn}
          min={today}
          max={addDays(today, 365)}
          icon={<CalendarDays aria-hidden />}
          error={messageFor('checkIn')}
        />
        <DateField
          label="Check-out"
          value={checkOut}
          onChange={setCheckOut}
          min={isIsoDate(checkIn) ? addDays(checkIn, 1) : today}
          max={addDays(today, 395)}
          icon={<CalendarDays aria-hidden />}
          error={messageFor('checkOut')}
        />
        <RoomsGuestsField
          value={occupancy}
          onChange={setOccupancy}
          error={submitted ? occupancyIssues[0]?.message : undefined}
        />
        <SearchButton label="Search Hotels" className="lg:h-[4.25rem]" />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Quick pick:</span>
        {STAY_SHORTCUTS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => shortcut(s.label, s.offset, s.nights)}
            className="rounded-full bg-background px-3 py-1 font-semibold ring-1 ring-border transition-colors hover:text-primary hover:ring-primary/40"
          >
            {s.label}
          </button>
        ))}
        {nights > 0 && (
          <span aria-live="polite" className="ml-auto font-semibold text-primary">
            {nights} night{nights === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </form>
  );
}
