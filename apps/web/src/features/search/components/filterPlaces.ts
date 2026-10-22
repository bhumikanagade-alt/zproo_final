export interface PlaceOption {
  value: string;
  /** Shown in the field when selected, e.g. "Pune". */
  label: string;
  /** Secondary line, e.g. "PNQ · Pune Airport". */
  detail: string;
  /** Extra words to match, e.g. state or station name. */
  keywords?: string;
  /** Short code badge in the list, e.g. "PNQ". */
  badge?: string;
  /** Heading the option is listed under, e.g. "Maharashtra". */
  group?: string;
}

/**
 * Ranks exact codes, then name prefixes, then code prefixes, then any other match; empty query
 * shows everything. Ties keep the list order, so Maharashtra places come first.
 */
export function filterPlaces(options: readonly PlaceOption[], query: string): PlaceOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options];
  const scored = options
    .map((o) => {
      const label = o.label.toLowerCase();
      const code = o.value.toLowerCase();
      const all = `${label} ${code} ${o.detail} ${o.keywords ?? ''}`.toLowerCase();
      const score =
        code === q ? 0 : label.startsWith(q) ? 1 : code.startsWith(q) ? 2 : all.includes(q) ? 3 : 9;
      return { o, score };
    })
    .filter((x) => x.score < 9);
  return scored.sort((a, b) => a.score - b.score).map((x) => x.o);
}
