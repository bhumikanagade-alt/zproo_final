import type { BusSeatInfo, BusSeatMap } from '@zproo/types';
import { cn } from '@zproo/ui';
import { inr } from '@/features/flights/format';

interface SeatMapProps {
  map: BusSeatMap;
  selected: string[];
  onToggle: (seat: BusSeatInfo) => void;
}

const DECK_LABEL = { LOWER: 'Lower deck', UPPER: 'Upper deck' } as const;

function seatLabel(seat: BusSeatInfo, selected: boolean): string {
  const kind = seat.kind === 'SLEEPER' ? 'sleeper' : 'seat';
  const state = !seat.available ? 'booked' : selected ? 'selected' : 'available';

  return `${kind === 'sleeper' ? 'Sleeper' : 'Seat'} ${seat.number}, ${
    seat.deck
  .toLowerCase()} deck, ${inr(seat.pricePaise)}${
    seat.ladiesOnly ? ', reserved for women' : ''
  }, ${state}`;
}

/**
 * Steering wheel / driver's side indicator.
 *
 * Positioned ABOVE the inner coach border and aligned
 * approximately with the 4th seat on the right side.
 */
function SteeringWheel() {
  return (
    <div
      aria-hidden
      className="
        pointer-events-none
        absolute
        -top-10
        right-[2.65rem]
        z-10
        flex
        items-center
        justify-center
        rounded-full
        bg-card
      "
    >
      <svg
        viewBox="0 0 32 32"
        className="size-8 text-muted/70"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      >
        <circle cx="16" cy="16" r="12.5" />
        <circle
          cx="16"
          cy="16"
          r="3.2"
          fill="currentColor"
          stroke="none"
        />
        <path d="M3.8 14.2c4.2 1 8.4 1.4 9.2 1.8M28.2 14.2c-4.2 1-8.4 1.4-9.2 1.8M16 19.5V28" />
      </svg>
    </div>
  );
}

/** Small woman figure used on seats reserved for women. */
function WomanIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn('size-4', className)}
      fill="currentColor"
    >
      <circle cx="12" cy="4.6" r="2.8" />
      <path d="M12 8.6c-2.1 0-3.6 1.5-4.1 4l-1.6 6.2h3.2V22h5V18.8h3.2l-1.6-6.2c-.5-2.5-2-4-4.1-4z" />
    </svg>
  );
}

/** Armchair used for seater seats. */
function Armchair({
  className,
  selected,
}: {
  className?: string;
  selected?: boolean;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className={cn('size-8', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 11.6H4.3a3.5 3.5 0 0 0-3.5 3.5v12.6a3.5 3.5 0 0 0 3.5 3.5h23.4a3.5 3.5 0 0 0 3.5-3.5V15.1a3.5 3.5 0 0 0-3.5-3.5H26" />

      <path d="M2.6 12.5V4a3 3 0 0 1 3-3h20.8a3 3 0 0 1 3 3v8.5" />

      <path
        d="M6 11.6v10.8A2.6 2.6 0 0 0 8.6 25h14.8a2.6 2.6 0 0 0 2.6-2.6V11.6"
        className={selected ? 'stroke-primary-foreground' : undefined}
      />
    </svg>
  );
}

type SwatchTone = 'available' | 'selected' | 'women' | 'booked';

const SWATCH = {
  available: {
    box: 'border-success bg-card',
    chair: 'text-success',
  },
  selected: {
    box: 'border-primary bg-primary',
    chair: 'text-primary fill-primary',
  },
  women: {
    box: 'border-pink-400 bg-card',
    chair: 'text-pink-500',
  },
  booked: {
    box: 'border-stone-500 bg-border/40',
    chair: 'text-stone-300 fill-border/40',
  },
} as const;

/** Legend swatch drawn like the seats on this coach. */
function Swatch({
  tone,
  seater,
}: {
  tone: SwatchTone;
  seater: boolean;
}) {
  return seater ? (
    <Armchair
      className={cn('size-6', SWATCH[tone].chair)}
      selected={tone === 'selected'}
    />
  ) : (
    <span
      className={cn(
        'h-5 w-3.5 rounded-[3px] border-[1.5px]',
        SWATCH[tone].box,
      )}
    />
  );
}

/** Marker drawn in the aisle. */
function RoofExit() {
  return (
    <div
      aria-hidden
      className="flex flex-col items-center gap-0.5 text-[7px] leading-none text-stone-400"
    >
      <span>▲</span>

      <span
        className="
          rounded-[3px]
          border
          border-stone-400/70
          px-1
          py-0.5
          text-center
          text-[8px]
          font-medium
          leading-[1.05]
          text-stone-500
        "
      >
        Roof
        <br />
        Exit
      </span>

      <span>▼</span>
    </div>
  );
}

/**
 * Bus seat layout.
 */
export function SeatMap({
  map,
  selected,
  onToggle,
}: SeatMapProps) {
  const onlySeater = map.decks.every((d) =>
    d.seats.every((seat) => seat.kind === 'SEATER'),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {map.decks.map((deck) => {
          const sleeperDeck =
            deck.seats.length > 0 &&
            deck.seats.every((s) => s.kind === 'SLEEPER');

          const usedColumns = new Set(
            deck.seats.map((s) => s.column),
          );

          const aisleColumns = Array.from(
            { length: deck.columns },
            (_, c) => c,
          ).filter((c) => !usedColumns.has(c));

          const visualColumn = (column: number) =>
            deck.columns - column;

          const rowNumbers = Array.from(
            { length: deck.rows },
            (_, i) => i + 1,
          );

          return (
            <section
              key={deck.deck}
              aria-label={DECK_LABEL[deck.deck]}
              className="rounded-2xl border border-border bg-card p-4"
            >
              {/* Deck heading */}
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold">
                  {DECK_LABEL[deck.deck]}
                </h3>
              </div>

              {/*
                IMPORTANT:
                The inner coach border is now relative.
                This allows the steering wheel to sit ABOVE
                the border instead of overlapping it.
              */}
              <div
                className="
                  relative
                  mt-6
                  rounded-[1.75rem]
                  border
                  border-border
                  px-3
                  py-4
                "
              >
                {/* 
                  Steering wheel:
                  - sits above the border
                  - has a clean gap
                  - aligned toward the 4th/right-side seat
                */}
                {deck.deck === 'LOWER' && <SteeringWheel />}

                <div
                  className="mx-auto grid w-fit gap-x-2.5 gap-y-2"
                  style={{
                    gridTemplateColumns: `repeat(${deck.columns}, 2.5rem)`,
                    gridTemplateRows: `repeat(${deck.rows}, auto)`,
                  }}
                >
                  {sleeperDeck &&
                    aisleColumns.slice(0, 1).flatMap((aisle) =>
                      rowNumbers
                        .filter((row) => row % 2 === 1)
                        .map((row) => (
                          <div
                            key={`exit-${deck.deck}-${row}`}
                            className="flex h-[5.5rem] items-center justify-center"
                            style={{
                              gridRow: row,
                              gridColumn: visualColumn(aisle),
                            }}
                          >
                            <RoofExit />
                          </div>
                        )),
                    )}

                  {deck.seats.map((seat) => {
                    const isSelected = selected.includes(
                      seat.number,
                    );

                    const available = seat.available;
                    const ladies = seat.ladiesOnly;

                    return (
                      <div
                        key={seat.number}
                        className="flex flex-col items-center"
                        style={{
                          gridRow: seat.row,
                          gridColumn: visualColumn(seat.column),
                        }}
                      >
                        {seat.kind === 'SEATER' ? (
                          <button
                            type="button"
                            disabled={!available}
                            aria-pressed={isSelected}
                            aria-label={seatLabel(
                              seat,
                              isSelected,
                            )}
                            title={seatLabel(
                              seat,
                              isSelected,
                            )}
                            onClick={() => onToggle(seat)}
                            className={cn(
                              'relative flex size-8 items-center justify-center rounded-md transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',

                              isSelected &&
                                'text-primary',

                              !isSelected &&
                                available &&
                                !ladies &&
                                'text-success hover:bg-success/10',

                              !isSelected &&
                                available &&
                                ladies &&
                                'text-pink-500 hover:bg-pink-50',

                              !available &&
                                'cursor-not-allowed text-stone-300',
                            )}
                          >
                            <Armchair
                              selected={isSelected}
                              className={cn(
                                isSelected &&
                                  'fill-primary',

                                !isSelected &&
                                  !available &&
                                  'fill-border/40',
                              )}
                            />

                            {ladies && !isSelected && (
                              <WomanIcon
                                className={cn(
                                  'absolute left-1/2 top-[0.55rem] size-3 -translate-x-1/2',

                                  available
                                    ? 'text-pink-500'
                                    : 'text-pink-300',
                                )}
                              />
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!available}
                            aria-pressed={isSelected}
                            aria-label={seatLabel(
                              seat,
                              isSelected,
                            )}
                            title={seatLabel(
                              seat,
                              isSelected,
                            )}
                            onClick={() => onToggle(seat)}
                            className={cn(
                              'relative flex w-10 items-center justify-center rounded-md border-[1.5px] transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',

                              seat.kind === 'SLEEPER'
                                ? 'h-[5.5rem]'
                                : 'h-10',

                              isSelected &&
                                'border-primary bg-primary text-primary-foreground',

                              !isSelected &&
                                available &&
                                !ladies &&
                                'border-success bg-card hover:bg-success/10',

                              !isSelected &&
                                available &&
                                ladies &&
                                'border-pink-400 bg-card text-pink-500 hover:bg-pink-50',

                              !available &&
                                'cursor-not-allowed border-stone-500 bg-border/40',

                              !available &&
                                ladies &&
                                'text-pink-300',
                            )}
                          >
                            {ladies && !isSelected && (
                              <WomanIcon />
                            )}

                            <span
                              aria-hidden
                              className={cn(
                                'absolute bottom-1.5 left-1/2 h-1.5 w-5 -translate-x-1/2 rounded-full',

                                isSelected &&
                                  'bg-primary-foreground/50',

                                !isSelected &&
                                  available &&
                                  !ladies &&
                                  'bg-success/20',

                                !isSelected &&
                                  available &&
                                  ladies &&
                                  'bg-pink-200',

                                !available &&
                                  'bg-card/70',
                              )}
                            />
                          </button>
                        )}

                        <span
                          aria-hidden
                          className="
                            mt-0.5
                            text-[11px]
                            font-medium
                            leading-tight
                            tabular-nums
                            text-muted
                          "
                        >
                          {available
                            ? `₹${Math.round(
                                seat.pricePaise / 100,
                              )}`
                            : 'Sold'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Seat legend */}
      <ul
        className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted"
        aria-label="Seat legend"
      >
        <li className="inline-flex items-center gap-2">
          <Swatch
            tone="available"
            seater={onlySeater}
          />
          Available
        </li>

        <li className="inline-flex items-center gap-2">
          <Swatch
            tone="selected"
            seater={onlySeater}
          />
          Selected
        </li>

        <li className="inline-flex items-center gap-2">
          <Swatch
            tone="women"
            seater={onlySeater}
          />
          Reserved for women
        </li>

        <li className="inline-flex items-center gap-2">
          <Swatch
            tone="booked"
            seater={onlySeater}
          />
          Booked
        </li>
      </ul>
    </div>
  );
}