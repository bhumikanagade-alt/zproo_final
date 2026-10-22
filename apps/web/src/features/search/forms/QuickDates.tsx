import { addDays, todayIso } from '@zproo/validation';

/** "Today / Tomorrow" shortcuts common on Indian bus and train booking. */
export function QuickDates({
  onPick,
  selected,
}: {
  onPick: (date: string) => void;
  /** Currently chosen date (YYYY-MM-DD), used to highlight the matching shortcut. */
  selected?: string | undefined;
}) {
  // Computed on every render so the buttons stay correct if the page stays open past midnight.
  const today = todayIso();
  const options: [string, string][] = [
    ['Today', today],
    ['Tomorrow', addDays(today, 1)],
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">Quick pick:</span>
      {options.map(([label, date]) => {
        const active = selected === date;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(date)}
            className={
              'rounded-full px-3 py-1 font-semibold ring-1 transition-colors hover:text-primary hover:ring-primary/40 ' +
              (active ? 'bg-primary-light text-primary ring-primary/40' : 'bg-background ring-border')
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
