import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { OFFER_ITEMS, OFFER_THEMES, type OfferItem } from './offersData';

const FEATURED: OfferItem[] = ['ZPROO20', 'FIRSTFLIGHT', 'LUXE25', 'WELCOME500']
  .map((c) => OFFER_ITEMS.find((o) => o.code === c))
  .filter((o): o is OfferItem => Boolean(o));

/** Auto-rotating banner of the biggest deals (pauses on hover/focus). */
export function OfferHeroSlider({ onCopied }: { onCopied: (code: string) => void }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % FEATURED.length), 4500);
    return () => window.clearInterval(t);
  }, [paused]);

  const go = (d: number) => setI((n) => (n + d + FEATURED.length) % FEATURED.length);

  return (
    <div
      className="ohs"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Top deals"
    >
      <div className="ohs-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {FEATURED.map((o, n) => {
          const th = OFFER_THEMES[o.service];
          const Icon = th.icon;
          return (
            <div
              key={o.code}
              className="ohs-slide"
              aria-hidden={n !== i}
              style={{ '--o-gradient': th.gradient } as CSSProperties}
            >
              <span className="ohs-blob ohs-b1" aria-hidden />
              <span className="ohs-blob ohs-b2" aria-hidden />
              <Icon aria-hidden className="ohs-icon" />
              <div className="relative max-w-xl">
                <span className="ohs-pill">
                  {o.service === 'all' ? 'All services' : th.label} · Top deal
                </span>
                <p className="ohs-big">{o.value}</p>
                <p className="mt-1 text-lg font-bold sm:text-xl">{o.title}</p>
                <p className="mt-1 text-sm text-white/85">{o.detail}</p>
                <button
                  type="button"
                  tabIndex={n === i ? 0 : -1}
                  className="ohs-code"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(o.code)
                      .then(() => onCopied(o.code))
                      .catch(() => undefined);
                  }}
                >
                  Tap to copy · <span className="font-mono tracking-widest">{o.code}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="ohs-nav ohs-prev" onClick={() => go(-1)} aria-label="Previous deal">
        <ChevronLeft aria-hidden className="size-5" />
      </button>
      <button type="button" className="ohs-nav ohs-next" onClick={() => go(1)} aria-label="Next deal">
        <ChevronRight aria-hidden className="size-5" />
      </button>

      <div className="ohs-dots">
        {FEATURED.map((o, n) => (
          <button
            key={o.code}
            type="button"
            aria-label={`Show deal ${n + 1}`}
            aria-current={n === i}
            data-on={n === i}
            onClick={() => setI(n)}
          />
        ))}
      </div>
    </div>
  );
}
