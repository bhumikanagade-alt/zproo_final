import { cn } from '@zproo/ui';
import { useState, type ClipboardEvent } from 'react';

interface OtpInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Called once all digits are entered. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  /** Focus the field when it appears (the code is the only task on these screens). */
  focusOnMount?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/**
 * One real input drawn as separate digit boxes. A single field keeps paste, SMS autofill
 * (`autocomplete="one-time-code"`) and screen readers working, which split inputs often break.
 */
export function OtpInput({
  id,
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  focusOnMount,
  ...aria
}: OtpInputProps) {
  const [focused, setFocused] = useState(false);

  const update = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => update(e.target.value)}
        onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
          e.preventDefault();
          update(e.clipboardData.getData('text'));
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d*"
        maxLength={length}
        disabled={disabled}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the code field is the only task on this screen
        autoFocus={focusOnMount}
        className="absolute inset-0 z-10 w-full cursor-text bg-transparent text-transparent caret-transparent selection:bg-transparent focus:outline-none disabled:cursor-not-allowed"
        {...aria}
      />
      <div
        aria-hidden
        className="grid gap-2 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      >
        {Array.from({ length }, (_, i) => {
          const active =
            focused && (i === value.length || (i === length - 1 && value.length === length));
          return (
            <div
              key={i}
              className={cn(
                'grid h-14 place-items-center rounded-xl border bg-card text-2xl font-bold transition-colors sm:h-16',
                active ? 'border-primary ring-2 ring-ring/25' : 'border-border',
                aria['aria-invalid'] && 'border-danger',
                disabled && 'opacity-60',
              )}
            >
              {value[i] ?? (active ? <span className="h-6 w-0.5 animate-pulse bg-primary" /> : '')}
            </div>
          );
        })}
      </div>
    </div>
  );
}
