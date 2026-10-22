import { ArrowRight, CalendarClock, Check, ChevronDown, Copy, Flame } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { metaFor, SERVICE_PATH } from './offerMeta';
import { OFFER_THEMES, type OfferItem } from './offersData';

/**
 * Marketplace-style offer ticket: coloured value stub on the left, details + coupon + CTA on the right,
 * with validity, minimum spend and an expandable terms list.
 */
export function OfferTicket({
  offer,
  index = 0,
  onCopied,
}: {
  offer: OfferItem;
  index?: number;
  onCopied: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const theme = OFFER_THEMES[offer.service];
  const meta = metaFor(offer);
  const Icon = theme.icon;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
      onCopied(offer.code);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <article
      className="otk"
      style={
        {
          '--o-gradient': theme.gradient,
          '--o-accent': theme.accent,
          '--o-tint': theme.tint,
          animationDelay: `${Math.min(index, 10) * 55}ms`,
        } as CSSProperties
      }
    >
      <div className="otk-stub">
        <span className="otk-orb" aria-hidden />
        <Icon aria-hidden className="otk-bgicon" />
        <span className="otk-svc">
          <Icon aria-hidden className="size-3.5" />
          {offer.service === 'all' ? 'All services' : theme.label}
        </span>
        <p className="otk-value">{offer.value}</p>
        <p className="otk-min">Min. spend {meta.minSpend}</p>
      </div>

      <div className="otk-body">
        <div className="flex flex-wrap items-center gap-2">
          <span className="otk-type">{meta.type}</span>
          {meta.endsSoon && (
            <span className="otk-soon">
              <Flame aria-hidden className="size-3.5" /> Ends soon
            </span>
          )}
          {offer.tag && offer.tag !== meta.type && <span className="otk-tag">{offer.tag}</span>}
        </div>

        <h3 className="mt-2 text-lg font-extrabold leading-snug text-foreground">{offer.title}</h3>
        <p className="mt-1 text-sm text-muted">{offer.detail}</p>

        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
          <CalendarClock aria-hidden className="size-4" /> Valid till {meta.validTill}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void copy();
            }}
            aria-label={copied ? `${offer.code} copied` : `Copy code ${offer.code}`}
            className="offer-code-btn !mt-0 !w-auto"
            data-copied={copied}
          >
            <span className="font-mono tracking-widest">{offer.code}</span>
            {copied ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
          </button>

          <Link to={SERVICE_PATH[offer.service]} className="otk-cta">
            Book now <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>

        <details className="otk-terms">
          <summary>
            Terms &amp; conditions
            <ChevronDown aria-hidden className="otk-chev size-4" />
          </summary>
          <ul>
            {meta.terms.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      </div>
    </article>
  );
}
