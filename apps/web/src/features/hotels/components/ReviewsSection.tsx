import { Star, ThumbsUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Hotel } from '../data';
import { guestScore, scoreLabel } from '../filters';
import {
  REVIEW_SORTS,
  TRAVELLER_TYPES,
  reviewsFor,
  scoreBreakdown,
  sortReviews,
  type HotelReview,
  type ReviewSort,
  type TravellerType,
} from '../extras';
import { useOwnReviews } from '../ownReviews';

const BAR_LABEL: Record<keyof ReturnType<typeof scoreBreakdown>, string> = {
  cleanliness: 'Cleanliness',
  location: 'Location',
  service: 'Service',
  value: 'Value for money',
};

const formatStay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={`size-3.5 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
      ))}
    </span>
  );
}

/** Review summary (score breakdown), sorting, traveller-type filter and the review list. */
export function ReviewsSection({ hotel }: { hotel: Hotel }) {
  const [sort, setSort] = useState<ReviewSort>('helpful');
  const [type, setType] = useState<TravellerType | 'All'>('All');
  const [shown, setShown] = useState(4);
  const own = useOwnReviews((s) => s.reviews);
  const helpful = useOwnReviews((s) => s.helpful);
  const toggleHelpful = useOwnReviews((s) => s.toggleHelpful);

  const breakdown = useMemo(() => scoreBreakdown(hotel), [hotel]);
  const all: HotelReview[] = useMemo(
    () => [...own.filter((r) => r.hotelId === hotel.id), ...reviewsFor(hotel)],
    [own, hotel],
  );
  const filtered = useMemo(
    () => sortReviews(all.filter((r) => type === 'All' || r.travellerType === type), sort),
    [all, type, sort],
  );
  const score = guestScore(hotel);
  const countFor = (t: TravellerType) => all.filter((r) => r.travellerType === t).length;

  return (
    <section aria-labelledby="reviews-heading" className="mt-7">
      <h2 id="reviews-heading" className="text-lg font-extrabold">Guest reviews</h2>
      <div className="mt-3 grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-[10rem_1fr]">
        <div className="text-center sm:text-left">
          <p className="text-4xl font-extrabold text-primary">{score.toFixed(1)}</p>
          <p className="font-bold">{scoreLabel(score)}</p>
          <p className="text-xs text-muted">{hotel.reviewCount.toLocaleString('en-IN')} reviews</p>
        </div>
        <ul className="space-y-2" aria-label="Score breakdown">
          {(Object.keys(BAR_LABEL) as (keyof typeof BAR_LABEL)[]).map((k) => (
            <li key={k} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-sm">
              <span>{BAR_LABEL[k]}</span>
              <span className="h-2 overflow-hidden rounded-full bg-border" aria-hidden>
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(breakdown[k] / 5) * 100}%` }} />
              </span>
              <span className="text-right font-bold">{(breakdown[k] * 2).toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter reviews by traveller type">
          <button type="button" aria-pressed={type === 'All'} onClick={() => setType('All')} className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${type === 'All' ? 'bg-primary text-primary-foreground ring-primary' : 'bg-background ring-border'}`}>
            All ({all.length})
          </button>
          {TRAVELLER_TYPES.filter((t) => countFor(t) > 0).map((t) => (
            <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${type === t ? 'bg-primary text-primary-foreground ring-primary' : 'bg-background ring-border'}`}>
              {t} ({countFor(t)})
            </button>
          ))}
        </div>
        <select aria-label="Sort reviews" value={sort} onChange={(e) => setSort(e.target.value as ReviewSort)} className="rounded-xl border border-border bg-card p-2 text-sm font-semibold">
          {REVIEW_SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p role="status" className="mt-4 text-sm text-muted">No reviews from this kind of traveller yet.</p>
      ) : (
        <ul className="mt-4 space-y-3" aria-label="Guest reviews">
          {filtered.slice(0, shown).map((r) => {
            const voted = helpful.includes(r.id);
            return (
              <li key={r.id} className="rounded-2xl border border-border p-4" data-testid="review">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{r.author} <span className="ml-1 rounded-full bg-primary-light px-2 py-0.5 text-xs font-bold text-primary">{r.travellerType}</span></p>
                  <p className="text-xs text-muted">Stayed {formatStay(r.stayedOn)}{r.own ? ' · Your review' : ''}</p>
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm"><Stars value={r.rating} /> <strong>{r.title}</strong></p>
                <p className="mt-2 text-sm leading-6 text-muted">{r.text}</p>
                <button type="button" aria-pressed={voted} onClick={() => toggleHelpful(r.id)} className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${voted ? 'bg-primary-light text-primary ring-primary' : 'ring-border'}`}>
                  <ThumbsUp aria-hidden className="size-3.5" /> Helpful ({r.helpful + (voted ? 1 : 0)})
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {filtered.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + 4)} className="mt-3 text-sm font-semibold text-primary hover:underline">
          Show more reviews
        </button>
      )}
    </section>
  );
}
