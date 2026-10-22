import type { BusPoint } from '@zproo/types';
import { cn } from '@zproo/ui';

import { istTime } from '../format';

interface PointPickerProps {
  label: string;
  points: BusPoint[];
  value: string;
  onChange: (id: string) => void;
}

/** Boarding or dropping point choice (radio group). */
export function PointPicker({
  label,
  points,
  value,
  onChange,
}: PointPickerProps) {
  return (
    <fieldset className="min-w-0 w-full">
      <legend className="mb-3 text-sm font-bold">
        {label}
      </legend>

      <div className="space-y-3">
        {points.map((p) => {
          const selected = value === p.id;

          return (
            <label
              key={p.id}
              className={cn(
                `
                  flex
                  min-h-[108px]
                  w-full
                  min-w-0
                  cursor-pointer
                  items-start
                  gap-2.5
                  rounded-xl
                  border
                  px-3
                  py-3
                  transition-colors
                `,
                selected
                  ? `
                    border-primary
                    bg-primary-light
                  `
                  : `
                    border-border
                    bg-card
                    hover:border-foreground/30
                  `,
              )}
            >
              {/* Radio */}
              <input
                type="radio"
                name={label}
                value={p.id}
                checked={selected}
                onChange={() =>
                  onChange(p.id)
                }
                className="
                  mt-1
                  size-4
                  shrink-0
                  accent-primary
                "
              />

              {/* Point information */}
              <span className="min-w-0 flex-1">
                {/* Time + point name */}
                <span
                  className="
                    flex
                    min-w-0
                    items-start
                    gap-2
                  "
                >
                  <span
                    className="
                      shrink-0
                      whitespace-nowrap
                      text-sm
                      font-bold
                      leading-5
                      tabular-nums
                    "
                  >
                    {istTime(p.time)}
                  </span>

                  <span
                    className="
                      min-w-0
                      flex-1
                      break-words
                      text-sm
                      font-semibold
                      leading-5
                    "
                    title={p.name}
                  >
                    {p.name}
                  </span>
                </span>

                {/* Address */}
                <span
                  className="
                    mt-1
                    block
                    break-words
                    text-xs
                    leading-4
                    text-muted
                  "
                  title={p.address}
                >
                  {p.address}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}