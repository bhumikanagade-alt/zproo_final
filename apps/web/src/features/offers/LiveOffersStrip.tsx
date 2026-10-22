import type { AdminOffer } from '@zproo/types';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Copy, Star } from 'lucide-react';
import { Link } from 'react-router';
import { apiGet } from '@/services/http';

/** Offers published from the admin panel (Marketing → Offers), newest campaigns first. */
export function LiveOffersStrip({ onCopied }: { onCopied: (code: string) => void }) {
  const { data } = useQuery({
    queryKey: ['public-offers'],
    queryFn: () => apiGet<AdminOffer[]>('/offers/public'),
    staleTime: 5 * 60_000,
    retry: false,
  });
  if (!data?.length) return null;
  return (
    <section aria-labelledby="live-offers" className="mt-6">
      <h2 id="live-offers" className="mb-3 text-lg font-extrabold tracking-tight text-[#071a33]">
        Running now
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((o) => (
          <li key={o.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div>
              <p className="flex items-center gap-1.5 font-bold">
                {o.featured && <Star aria-label="Featured" className="size-3.5 fill-amber-400 text-amber-400" />}
                {o.title}
              </p>
              {o.subtitle && <p className="mt-1 text-sm text-muted">{o.subtitle}</p>}
            </div>
            <div className="flex items-center justify-between gap-2">
              {o.couponCode ? (
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(o.couponCode ?? '').catch(() => undefined);
                    onCopied(o.couponCode ?? '');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 bg-primary-light px-2.5 py-1 font-mono text-xs font-bold text-primary"
                  aria-label={`Copy code ${o.couponCode}`}
                >
                  {o.couponCode} <Copy aria-hidden className="size-3" />
                </button>
              ) : (
                <span />
              )}
              <Link to={o.ctaPath} className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                {o.ctaLabel} <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
