import { Button } from '@zproo/ui';
import { BedDouble, Plus, Trash2 } from 'lucide-react';
import { PopoverField } from '@/features/search/components/PopoverField';
import { Stepper } from '@/features/search/components/Stepper';
import {
  DEFAULT_CHILD_AGE,
  MAX_ADULTS_PER_ROOM,
  MAX_CHILD_AGE,
  MAX_GUESTS_PER_ROOM,
  MAX_ROOMS,
  addRoom,
  guestsLabel,
  removeRoom,
  setAdults,
  setChildAge,
  setChildCount,
  totalAdults,
  totalChildren,
  type RoomOccupancy,
} from '../occupancy';

interface Props {
  value: RoomOccupancy[];
  onChange: (next: RoomOccupancy[]) => void;
  error?: string | undefined;
}

/** Rooms & guests picker: per-room adults, children and child ages. */
export function RoomsGuestsField({ value, onChange, error }: Props) {
  const adults = totalAdults(value);
  const children = totalChildren(value);
  const guests = adults + children;
  return (
    <PopoverField
      label="Rooms & Guests"
      summary={`${guests} Guest${guests === 1 ? '' : 's'}`}
      detail={`${value.length} room${value.length === 1 ? '' : 's'} · ${guestsLabel(adults, children)}`}
      icon={<BedDouble aria-hidden />}
      error={error}
    >
      <div className="max-h-80 space-y-4 overflow-auto pr-1">
        {value.map((room, index) => (
          <fieldset key={index} className="rounded-xl border border-border p-3">
            <legend className="flex items-center gap-2 px-1 text-sm font-extrabold">
              Room {index + 1}
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(removeRoom(value, index))}
                  aria-label={`Remove room ${index + 1}`}
                  className="rounded-full p-1 text-muted hover:text-danger"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              )}
            </legend>
            <Stepper
              label={`Room ${index + 1} adults`}
              hint="18+ years"
              value={room.adults}
              min={1}
              max={Math.min(MAX_ADULTS_PER_ROOM, MAX_GUESTS_PER_ROOM - room.childAges.length)}
              onChange={(v) => onChange(setAdults(value, index, v))}
            />
            <Stepper
              label={`Room ${index + 1} children`}
              hint={`0–${MAX_CHILD_AGE} years`}
              value={room.childAges.length}
              min={0}
              max={Math.max(0, MAX_GUESTS_PER_ROOM - room.adults)}
              onChange={(v) => onChange(setChildCount(value, index, v))}
            />
            {room.childAges.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {room.childAges.map((age, ci) => (
                  <label key={ci} className="text-xs font-semibold text-muted">
                    Child {ci + 1} age
                    <select
                      aria-label={`Room ${index + 1} child ${ci + 1} age`}
                      value={age}
                      onChange={(e) => onChange(setChildAge(value, index, ci, Number(e.target.value)))}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm font-normal text-foreground"
                    >
                      {Array.from({ length: MAX_CHILD_AGE + 1 }, (_, a) => (
                        <option key={a} value={a}>
                          {a === 0 ? 'Under 1' : `${a} year${a === 1 ? '' : 's'}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 w-full"
        disabled={value.length >= MAX_ROOMS}
        onClick={() => onChange(addRoom(value))}
      >
        <Plus aria-hidden /> Add room
      </Button>
      <p className="mt-2 text-xs text-muted">
        Up to {MAX_GUESTS_PER_ROOM} guests per room. Children default to {DEFAULT_CHILD_AGE} years until you set their age.
      </p>
    </PopoverField>
  );
}
