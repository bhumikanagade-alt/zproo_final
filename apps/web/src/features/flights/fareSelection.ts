import type { CabinClass, FlightOffer, PaxCounts, TripType } from '@zproo/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeSessionStorage } from './draft';
import type { FareOption } from './fares';

export interface SelectedFare {
  legIndex: number;
  route: { from: string; to: string; date: string };
  offer: FlightOffer;
  fare: FareOption;
}

export interface FareSelection {
  /** The results URL the choice was made on; a different search starts a fresh selection. */
  searchUrl: string;
  tripType: TripType;
  returnDate: string | undefined;
  pax: PaxCounts;
  cabin: CabinClass;
  /** Baggage asked for in the search (undefined = no preference, 0 = no bag). */
  cabinBagKg: number | undefined;
  checkedBagKg: number | undefined;
  /** Chosen fare per flight, keyed by leg index (round trip: 0 outbound, 1 return). */
  selected: Record<string, SelectedFare>;
}

interface FareSelectionState {
  selection: FareSelection | null;
  select: (context: Omit<FareSelection, 'selected'>, choice: SelectedFare) => void;
  clear: () => void;
}

/**
 * The fare(s) chosen in the flight results — the last step of this flow. Kept per browser tab
 * (sessionStorage); holds no payment or passenger data.
 */
export const useFareSelection = create<FareSelectionState>()(
  persist(
    (set) => ({
      selection: null,
      select: (context, choice) =>
        set((s) => {
          const previous = s.selection?.searchUrl === context.searchUrl ? s.selection.selected : {};
          return {
            selection: { ...context, selected: { ...previous, [String(choice.legIndex)]: choice } },
          };
        }),
      clear: () => set({ selection: null }),
    }),
    {
      name: 'zproo-flight-fare-selection',
      version: 1,
      storage: createJSONStorage(() => safeSessionStorage),
      partialize: ({ selection }) => ({ selection }),
    },
  ),
);

export const selectionTotalPaise = (selection: FareSelection | null): number =>
  Object.values(selection?.selected ?? {}).reduce((sum, s) => sum + s.fare.pricePaise, 0);
