import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PHONE_COUNTRIES, flagSrc, phoneCountry } from '../validation';

export function Flag({ iso, className = '' }: { iso: string; className?: string }) {
  return (
    <img
      src={flagSrc(iso)}
      alt=""
      aria-hidden="true"
      width={24}
      height={18}
      loading="lazy"
      decoding="async"
      className={`h-[18px] w-6 shrink-0 object-contain ${className}`}
    />
  );
}

/** Flag + dial-code dropdown with search, used as the prefix of the mobile-number field. */
export function CountryCodeSelect({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (iso: string) => void;
  invalid?: boolean | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const current = phoneCountry(value);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '');
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter(
      (p) => p.name.toLowerCase().includes(q) || p.dial.startsWith(q) || p.iso.toLowerCase() === q,
    );
  }, [query]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Country code, ${current.name} +${current.dial}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        data-invalid={invalid ? true : undefined}
        onClick={() => {
          setQuery('');
          setOpen((o) => !o);
        }}
        className="flex h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold transition-colors hover:bg-background focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 data-[invalid=true]:border-danger"
      >
        <Flag iso={current.iso} />
        <span>+{current.dial}</span>
        <ChevronDown aria-hidden className="size-4 text-muted" />
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-30 w-72 rounded-xl border border-border bg-card p-2 shadow-raised">
          <div className="relative">
            <Search aria-hidden className="absolute left-2.5 top-2.5 size-4 text-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search country or code"
              placeholder="Search country or code"
              className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm focus-visible:border-primary focus-visible:outline-none"
            />
          </div>
          <ul id={listId} role="listbox" aria-label="Country codes" className="mt-2 max-h-60 overflow-y-auto">
            {options.map((p) => (
              <li key={p.iso} role="option" aria-selected={p.iso === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p.iso);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-background ${p.iso === value ? 'bg-primary-light font-bold' : ''}`}
                >
                  <Flag iso={p.iso} />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="text-muted">+{p.dial}</span>
                </button>
              </li>
            ))}
            {options.length === 0 && <li className="px-2 py-3 text-sm text-muted">No country found.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
