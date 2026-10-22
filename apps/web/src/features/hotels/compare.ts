import { create } from 'zustand';

export const MAX_COMPARE = 3;

interface CompareState {
  ids: string[];
  /** Adds or removes a hotel. Returns false when the list is already full. */
  toggle: (id: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
}

export const useCompare = create<CompareState>()((set, get) => ({
  ids: [],
  toggle: (id) => {
    const { ids } = get();
    if (ids.includes(id)) {
      set({ ids: ids.filter((x) => x !== id) });
      return true;
    }
    if (ids.length >= MAX_COMPARE) return false;
    set({ ids: [...ids, id] });
    return true;
  },
  remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
  clear: () => set({ ids: [] }),
}));
