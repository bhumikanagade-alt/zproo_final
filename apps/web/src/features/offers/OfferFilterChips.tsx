import type { CSSProperties } from 'react';
import { OFFER_FILTERS, OFFER_THEMES, offerCount, type OfferCategory } from './offersData';

export function OfferFilterChips({
  value,
  onChange,
  label = 'Filter offers by service',
}: {
  value: OfferCategory;
  onChange: (next: OfferCategory) => void;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {OFFER_FILTERS.map((id) => {
        const theme = OFFER_THEMES[id];
        const Icon = theme.icon;
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className="offer-chip"
            data-active={active}
            style={
              {
                '--chip-accent': theme.accent,
                '--chip-gradient': theme.gradient,
                '--chip-tint': theme.tint,
              } as CSSProperties
            }
          >
            <Icon aria-hidden className="size-4" />
            <span>{theme.label}</span>
            <span className="offer-chip-count">{offerCount(id)}</span>
          </button>
        );
      })}
    </div>
  );
}
