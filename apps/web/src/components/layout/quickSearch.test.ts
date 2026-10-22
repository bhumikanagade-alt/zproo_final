import { describe, expect, it } from 'vitest';
import { filterQuickSearch, QUICK_SEARCH_ENTRIES } from './quickSearch';

describe('filterQuickSearch', () => {
  it('returns everything for an empty query', () => {
    expect(filterQuickSearch('  ')).toHaveLength(QUICK_SEARCH_ENTRIES.length);
  });

  it('matches labels, hints and keywords case-insensitively', () => {
    expect(filterQuickSearch('cashback').map((e) => e.path)).toEqual(['/wallet', '/offers']);
    expect(filterQuickSearch('VOLVO').map((e) => e.path)).toEqual(['/buses']);
  });

  it('ranks label matches first', () => {
    expect(filterQuickSearch('bus').map((e) => e.path)[0]).toBe('/buses');
  });

  it('requires every word to match', () => {
    expect(filterQuickSearch('track parcel').map((e) => e.path)).toEqual(['/parcel/track']);
    expect(filterQuickSearch('track flights')).toEqual([]);
  });
});
