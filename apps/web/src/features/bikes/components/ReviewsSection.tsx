import { Skeleton } from '@zproo/ui';
import { Star } from 'lucide-react';
import { useReviews } from '../hooks';
import type { Bike } from '../types';
import { Card, ErrorState, SectionTitle } from './ui';

const fmt = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden className={`size-4 ${i <= n ? 'fill-warning text-warning' : 'text-border'}`} />
      ))}
    </span>
  );
}

/** Rider reviews with a rating summary. Loading, empty and error states are all handled. */
export function ReviewsSection({ bike }: { bike: Bike }) {
  const q = useReviews(bike.id);
  const reviews = q.data ?? [];
  const counts = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));
  return (
    <section aria-labelledby="reviews-h">
      <SectionTitle id="reviews-h">Rider reviews</SectionTitle>
      {q.isPending ? (
        <div role="status" aria-label="Loading reviews" className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : q.isError ? (
        <ErrorState title="We couldn't load reviews" message={q.error instanceof Error ? q.error.message : 'Please try again.'} onRetry={() => void q.refetch()} />
      ) : reviews.length === 0 ? (
        <Card><p className="text-sm text-muted">No reviews for this bike yet.</p></Card>
      ) : (
        <div className="space-y-4">
          <Card className="grid gap-5 sm:grid-cols-[160px_1fr] sm:items-center">
            <div>
              <p className="text-4xl font-extrabold leading-none">{bike.rating.toFixed(1)}</p>
              <Stars n={Math.round(bike.rating)} />
              <p className="mt-1 text-xs text-muted">{bike.reviewCount.toLocaleString('en-IN')} ratings</p>
            </div>
            <ul className="space-y-1.5" aria-label="Rating breakdown (sample reviews shown)">
              {counts.map(({ s, n }) => (
                <li key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right font-semibold">{s}</span>
                  <Star aria-hidden className="size-3 fill-warning text-warning" />
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <span className="block h-full rounded-full bg-warning" style={{ width: `${(n / reviews.length) * 100}%` }} />
                  </span>
                  <span className="w-4 text-muted">{n}</span>
                </li>
              ))}
            </ul>
          </Card>
          <ul className="grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id}>
                <Card className="h-full">
                  <div className="flex items-center justify-between gap-3">
                    <Stars n={r.rating} />
                    <span className="text-xs text-muted">{fmt.format(new Date(r.date))}</span>
                  </div>
                  <h3 className="mt-2 font-bold">{r.title}</h3>
                  <p className="mt-1 text-sm text-muted">{r.body}</p>
                  <p className="mt-3 text-xs text-muted"><span className="font-semibold text-foreground">{r.author}</span> · {r.tripType}</p>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
