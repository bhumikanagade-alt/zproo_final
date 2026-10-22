import { Check, Copy, Scissors } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { OFFER_THEMES, type OfferItem } from './offersData';

export function OfferCard({
  offer,
  onCopied,
  index = 0,
  decorative = false,
}: {
  offer: OfferItem;
  onCopied: (code: string) => void;
  index?: number;
  /** When true the card is a visual duplicate (carousel loop) hidden from assistive tech. */
  decorative?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const theme = OFFER_THEMES[offer.service];
  const Icon = theme.icon;

  const handleCopy = async () => {
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
      className="offer-card"
      style={
        {
          '--o-gradient': theme.gradient,
          '--o-accent': theme.accent,
          '--o-tint': theme.tint,
          animationDelay: `${Math.min(index, 12) * 60}ms`,
        } as CSSProperties
      }
    >
      {/* Colourful animated header */}
      <div className="offer-card-head">
        <span className="offer-orb offer-orb-a" aria-hidden />
        <span className="offer-orb offer-orb-b" aria-hidden />
        <Icon aria-hidden className="offer-card-bgicon" />
        <div className="relative flex items-center justify-between gap-2">
          <span className="offer-card-service">
            <Icon aria-hidden className="size-3.5" />
            {offer.service === 'all' ? 'All services' : theme.label}
          </span>
          {offer.tag && <span className="offer-card-tag">{offer.tag}</span>}
        </div>
        <p className="offer-card-value">{offer.value}</p>
      </div>

      {/* Ticket tear line */}
      <div className="offer-tear" aria-hidden>
        <span className="offer-notch offer-notch-l" />
        <span className="offer-dash" />
        <span className="offer-notch offer-notch-r" />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
        <h3 className="text-base font-extrabold leading-snug text-foreground">{offer.title}</h3>
        <p className="mt-1 flex-1 text-sm text-muted">{offer.detail}</p>

        <button
          type="button"
          tabIndex={decorative ? -1 : 0}
          onClick={() => {
            void handleCopy();
          }}
          aria-label={copied ? `${offer.code} copied` : `Copy code ${offer.code}`}
          className="offer-code-btn"
          data-copied={copied}
        >
          <Scissors aria-hidden className="size-4 opacity-70" />
          <span className="font-mono tracking-widest">{offer.code}</span>
          {copied ? (
            <Check aria-hidden className="ml-auto size-4" />
          ) : (
            <Copy aria-hidden className="ml-auto size-4" />
          )}
        </button>
      </div>
    </article>
  );
}
