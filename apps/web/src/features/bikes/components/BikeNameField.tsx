import { cn } from '@zproo/ui';
import { Search } from 'lucide-react';
import { BIKE_NAME_MAX } from '../rules';
import { sanitizeBikeName } from '../validation';
import { inputClass } from './ui';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Bike name / model search box. Input is capped at BIKE_NAME_MAX (20) characters: typing stops at
 * the limit, pasted text is cut to it, and the counter turns red when the limit is reached.
 */
export function BikeNameField({ id, label, value, onChange, placeholder = 'e.g. Activa, Classic 350, R15' }: Props) {
  const atLimit = value.length >= BIKE_NAME_MAX;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-muted">
          {label}
        </label>
        <span id={`${id}-count`} aria-live="polite" className={cn('text-xs tabular-nums', atLimit ? 'font-semibold text-danger' : 'text-muted')}>
          {atLimit ? `Maximum ${BIKE_NAME_MAX} characters · ` : ''}
          {value.length}/{BIKE_NAME_MAX}
        </span>
      </div>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
        <input
          id={id}
          type="search"
          value={value}
          maxLength={BIKE_NAME_MAX}
          onChange={(e) => onChange(sanitizeBikeName(e.target.value))}
          placeholder={placeholder}
          autoComplete="off"
          aria-describedby={`${id}-count`}
          className={cn(inputClass(), 'pl-9')}
        />
      </div>
    </div>
  );
}
