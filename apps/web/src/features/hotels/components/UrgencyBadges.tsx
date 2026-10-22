import { urgencyLabels } from '../extras';
import type { Hotel, HotelRoom } from '../data';

const TONE = {
  danger: 'bg-danger/10 text-danger',
  warn: 'bg-amber-100 text-amber-800',
  good: 'bg-success/10 text-green-800',
} as const;

/** “Only 2 rooms left”, “Booked 40 times this week”, “Price drop”. */
export function UrgencyBadges({ hotel, room, className = '' }: { hotel: Hotel; room: HotelRoom; className?: string }) {
  const labels = urgencyLabels(hotel, room);
  if (labels.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-1.5 md:justify-end ${className}`} aria-label="Availability and demand">
      {labels.map((l) => (
        <li key={l.key} className={`rounded-full px-2.5 py-1 text-xs font-bold ${TONE[l.tone]}`}>
          {l.text}
        </li>
      ))}
    </ul>
  );
}
