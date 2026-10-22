import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/** −/+ counter with a live value for screen readers. */
export function Stepper({ label, hint, value, min, max, onChange }: StepperProps) {
  const button =
    'grid size-9 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-35';
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={button}
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={`Fewer ${label.toLowerCase()}`}
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <output
          aria-live="polite"
          aria-label={label}
          className="w-5 text-center text-base font-bold tabular-nums"
        >
          {value}
        </output>
        <button
          type="button"
          className={button}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`More ${label.toLowerCase()}`}
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
