import { ArrowLeft, Search, Sparkles, TicketPercent } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { rememberCopiedCoupon, safeReturnPath } from '@/features/offers/offerReturn';
import { LiveOffersStrip } from '@/features/offers/LiveOffersStrip';
import { OfferHeroSlider } from '@/features/offers/OfferHeroSlider';
import { metaFor, OFFER_TYPES } from '@/features/offers/offerMeta';
import { OfferTicket } from '@/features/offers/OfferTicket';
import { OfferToast } from '@/features/offers/OfferToast';
import { OFFER_CSS, OFFER_PAGE_CSS } from '@/features/offers/offerStyles';
import {
  filterOffers,
  OFFER_FILTERS,
  OFFER_ITEMS,
  OFFER_THEMES,
  offerCount,
  type OfferCategory,
} from '@/features/offers/offersData';

type SortId = 'featured' | 'ending';
type TypeFilter = (typeof OFFER_TYPES)[number];

export default function OffersPage() {
  const [searchParams] = useSearchParams();
  const serviceParam = searchParams.get('service')?.toLowerCase() ?? '';
  const [filter, setFilter] = useState<OfferCategory>(
    (OFFER_FILTERS as readonly string[]).includes(serviceParam) ? (serviceParam as OfferCategory) : 'all',
  );
  const [type, setType] = useState<TypeFilter>('All types');
  const [sort, setSort] = useState<SortId>('featured');
  const [query, setQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  // Arrived from a checkout page ("Apply coupon")? Offer a clear way back once a code is copied.
  const returnTo = safeReturnPath(searchParams.get('returnTo'));
  const returnLabel = (searchParams.get('label') ?? 'checkout').replace(/[^a-z ]/gi, '').slice(0, 20) || 'checkout';
  const [lastCopied, setLastCopied] = useState('');
  const onCopied = (code: string) => {
    setCopiedCode(code);
    setLastCopied(code);
    rememberCopiedCoupon(code);
  };

  useEffect(() => {
    if (!copiedCode) return;
    const timer = window.setTimeout(() => setCopiedCode(''), 2500);
    return () => window.clearTimeout(timer);
  }, [copiedCode]);

  const offers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = filterOffers(filter).filter((o) => {
      if (type !== 'All types' && metaFor(o).type !== type) return false;
      if (!q) return true;
      return (
        o.code.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        o.detail.toLowerCase().includes(q)
      );
    });
    if (sort === 'ending') {
      list.sort((a, b) => metaFor(a).validKey - metaFor(b).validKey);
    }
    return list;
  }, [filter, type, sort, query]);

  const reset = () => {
    setFilter('all');
    setType('All types');
    setQuery('');
    setSort('featured');
  };

  return (
    <main className="min-h-screen bg-[#f7f9fc]">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#071a33] sm:text-4xl">
              Offers &amp; discounts
            </h1>
            <p className="mt-1 text-sm text-muted sm:text-base">
              Copy a coupon, tap Book now, and save on every journey.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#d9141e] to-[#ff6a3d] px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white">
            <Sparkles aria-hidden className="size-3.5" />
            {OFFER_ITEMS.length} live deals
          </span>
        </div>

        {returnTo && (
          <div
            role="status"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#fecaca] bg-[#fff1f1] px-4 py-3"
          >
            <p className="text-sm text-[#7f1d1d]">
              {lastCopied ? (
                <>
                  <strong className="font-mono tracking-wider">{lastCopied}</strong> copied. Go back to your {returnLabel} and apply it.
                </>
              ) : (
                <>Pick an offer, tap the code to copy it, then go back to your {returnLabel} to apply it.</>
              )}
            </p>
            <Link
              to={returnTo}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover"
            >
              <ArrowLeft aria-hidden className="size-4" />
              Back to {returnLabel}
            </Link>
          </div>
        )}

        <OfferHeroSlider onCopied={onCopied} />
        <LiveOffersStrip onCopied={onCopied} />

        {/* Service tabs */}
        <div className="mt-6">
          <div className="otabs" role="tablist" aria-label="Filter offers by service">
            {OFFER_FILTERS.map((id) => {
              const th = OFFER_THEMES[id];
              const Icon = th.icon;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={filter === id}
                  data-on={filter === id}
                  onClick={() => setFilter(id)}
                  className="otab"
                  style={
                    {
                      '--t-accent': th.accent,
                      '--t-gradient': th.gradient,
                      '--t-tint': th.tint,
                    } as CSSProperties
                  }
                >
                  <span className="ic">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  {th.label}
                  <em>{offerCount(id)}</em>
                </button>
              );
            })}
          </div>
        </div>

        {/* Type chips + search + sort */}
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Offer type">
            {OFFER_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-extrabold transition ${
                  type === t
                    ? 'border-transparent bg-[#071a33] text-white shadow-md'
                    : 'border-border bg-white text-[#475569] hover:border-[#071a33]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <label className="relative block w-full lg:w-64">
              <span className="sr-only">Search offers</span>
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search code or offer"
                className="w-full rounded-full border border-border bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="shrink-0">
              <span className="sr-only">Sort offers</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortId)}
                className="rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-primary"
              >
                <option value="featured">Featured</option>
                <option value="ending">Ending soon</option>
              </select>
            </label>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted" aria-live="polite">
          Showing <strong className="text-foreground">{offers.length}</strong>{' '}
          {OFFER_THEMES[filter].label.toLowerCase()}
          {type !== 'All types' ? ` · ${type.toLowerCase()}` : ''}
          {query ? ` matching “${query}”` : ''}
        </p>

        {offers.length > 0 ? (
          <ul key={`${filter}-${type}-${sort}`} className="mt-4 grid gap-5 lg:grid-cols-2">
            {offers.map((offer, i) => (
              <li key={offer.code}>
                <OfferTicket offer={offer} index={i} onCopied={onCopied} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
            <TicketPercent aria-hidden className="size-10 text-muted" />
            <p className="mt-3 font-bold">No offers found</p>
            <p className="text-sm text-muted">Try another category or clear your filters.</p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-hover"
            >
              Reset filters
            </button>
          </div>
        )}

        <section className="mt-10 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.06)] sm:p-6">
          <h2 className="text-lg font-bold text-[#071a33]">Terms</h2>
          <p className="mt-3 text-sm leading-6 text-[#64748b]">
            Offers are subject to eligibility, validity, route/operator restrictions and the final
            fare returned by the booking service.
          </p>
        </section>
      </section>

      {copiedCode && <OfferToast code={copiedCode} />}
      <style>{OFFER_CSS + OFFER_PAGE_CSS}</style>
    </main>
  );
}
