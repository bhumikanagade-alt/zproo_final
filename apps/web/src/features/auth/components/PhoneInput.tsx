import { cn } from '@zproo/ui';
import type { ChangeEvent, ComponentProps } from 'react';

/** Indian mobile number input with a fixed +91 prefix. */
export function PhoneInput({ className, onChange, digitsOnly = false, ...props }: ComponentProps<'input'> & { digitsOnly?: boolean }) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (digitsOnly) {
      event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 10);
    }
    onChange?.(event);
  };
  return (
    <div
      className={cn(
        'flex h-12 items-center rounded-xl border border-border bg-card transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30 has-[input[aria-invalid=true]]:border-danger',
        className,
      )}
    >
      <span className="flex h-full items-center gap-1.5 border-r border-border pl-3.5 pr-3 text-sm font-semibold text-foreground">
        <span aria-hidden>🇮🇳</span> +91
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={digitsOnly ? 10 : 14}
        placeholder="Enter mobile number"
        className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-base font-medium tracking-wide placeholder:font-normal placeholder:tracking-normal placeholder:text-muted/80 focus:outline-none"
        {...props}
        onChange={handleChange}
      />
    </div>
  );
}
