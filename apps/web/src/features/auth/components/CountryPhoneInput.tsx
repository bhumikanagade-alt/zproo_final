import { cn, Popover, PopoverContent, PopoverTrigger } from '@zproo/ui';
import { COUNTRIES, getCountry, sanitizeDigits } from '@zproo/validation';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useMemo, useState, type ChangeEvent, type ComponentProps } from 'react';
import { CountryFlag } from '@/components/media/CountryFlag';

/**
 * Mobile number with a searchable country-code picker (flag image, name and +code, like the
 * Wikipedia list of calling codes). The digits field accepts digits only, never more than 10.
 */
export function CountryPhoneInput({
  className,
  onChange,
  countryCode,
  onCountryChange,
  ...props
}: Omit<ComponentProps<'input'>, 'value'> & {
  countryCode: string;
  onCountryChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const country = getCountry(countryCode) ?? COUNTRIES[0];
  const list = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '');
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.startsWith(q) || c.code.toLowerCase() === q,
    );
  }, [query]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.value = sanitizeDigits(event.currentTarget.value);
    onChange?.(event);
  };

  return (
    <div
      className={cn(
        'flex h-12 items-center rounded-xl border border-border bg-card transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30 has-[input[aria-invalid=true]]:border-danger',
        className,
      )}
    >
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery('');
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Country code, ${country?.name} +${country?.dial}`}
            className="flex h-full shrink-0 items-center gap-2 rounded-l-xl border-r border-border pl-3 pr-2 text-sm font-semibold hover:bg-primary-light/40 focus:outline-none"
          >
            <CountryFlag code={country?.code ?? 'IN'} />
            <span className="tabular-nums">+{country?.dial}</span>
            <ChevronDown aria-hidden className="size-4 text-muted" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search aria-hidden className="size-4 text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code"
              aria-label="Search country"
              className="h-11 w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
          <ul role="listbox" aria-label="Countries" className="max-h-72 overflow-y-auto p-1">
            {list.length === 0 && <li className="px-3 py-4 text-sm text-muted">No country found</li>}
            {list.map((c) => (
              <li key={c.code} role="option" aria-selected={c.code === countryCode}>
                <button
                  type="button"
                  onClick={() => {
                    onCountryChange(c.code);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-primary-light focus:bg-primary-light focus:outline-none"
                >
                  <CountryFlag code={c.code} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="tabular-nums text-muted">+{c.dial}</span>
                  {c.code === countryCode && <Check aria-hidden className="size-4 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={10}
        placeholder={`Enter ${country?.min ?? 10}-digit number`}
        className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-base font-medium tracking-wide placeholder:font-normal placeholder:tracking-normal placeholder:text-muted/80 focus:outline-none"
        {...props}
        onChange={handleChange}
      />
    </div>
  );
}
