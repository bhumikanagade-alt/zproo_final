import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { localJson } from './localStorageAdapter';

export interface SavedSearch {
  id: string;
  /** Results URL query string for the saved search. */
  query: string;
  label: string;
  /** Lowest all-in nightly price (paise) when the alert was set, and the latest seen since. */
  basePaise: number;
  lastPaise: number;
  createdAt: string;
}

interface SavedSearchState {
  items: SavedSearch[];
  save: (item: Omit<SavedSearch, 'id' | 'createdAt' | 'lastPaise'>) => void;
  /** Records the price seen on a later visit. */
  observe: (id: string, paise: number) => void;
  remove: (id: string) => void;
}

export const useSavedSearches = create<SavedSearchState>()(
  persist(
    (set) => ({
      items: [],
      save: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.query === item.query);
          if (existing) return s;
          const next: SavedSearch = {
            ...item,
            id: `ss-${Date.now().toString(36)}`,
            lastPaise: item.basePaise,
            createdAt: new Date().toISOString(),
          };
          return { items: [next, ...s.items].slice(0, 10) };
        }),
      observe: (id, paise) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, lastPaise: paise } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    }),
    { name: 'zproo-hotel-saved-searches', storage: localJson() },
  ),
);

/** Positive when the price fell since the alert was set. */
export const priceDropPaise = (s: Pick<SavedSearch, 'basePaise' | 'lastPaise'>) => s.basePaise - s.lastPaise;
