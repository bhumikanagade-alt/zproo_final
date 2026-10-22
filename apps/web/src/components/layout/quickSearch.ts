import { SERVICES } from '@/config/services';

export interface QuickSearchEntry {
  label: string;
  hint: string;
  path: string;
  keywords: string;
}

export const QUICK_SEARCH_ENTRIES: readonly QuickSearchEntry[] = [
  ...SERVICES.map((s) => ({
    label: s.label,
    hint: s.tagline,
    path: s.path,
    keywords: `${s.label} ${s.type}`,
  })),
  {
    label: 'My bookings',
    hint: 'Tickets, cancellations & refunds',
    path: '/bookings',
    keywords: 'trips tickets pnr cancel refund',
  },
  {
    label: 'ZPROO Wallet',
    hint: 'Balance, add money & cashback',
    path: '/wallet',
    keywords: 'wallet money balance cashback recharge',
  },
  {
    label: 'Offers',
    hint: 'Coupons & cashback deals',
    path: '/offers',
    keywords: 'offers coupons deals discount promo',
  },
  {
    label: 'Track parcel',
    hint: 'Live parcel status',
    path: '/parcel/track',
    keywords: 'track parcel courier delivery',
  },
  {
    label: 'Help center',
    hint: '24×7 support',
    path: '/help',
    keywords: 'help support contact faq',
  },
];

/**
 * Case-insensitive match on label, hint and keywords; every word typed must match.
 * Entries whose label starts with the query rank first, so Enter picks the obvious one.
 */
export function filterQuickSearch(query: string): QuickSearchEntry[] {
  const normalized = query.trim().toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...QUICK_SEARCH_ENTRIES];
  const rank = (entry: QuickSearchEntry) =>
    entry.label.toLowerCase().startsWith(normalized) ? 0 : 1;
  return QUICK_SEARCH_ENTRIES.filter((entry) => {
    const haystack = `${entry.label} ${entry.hint} ${entry.keywords}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  }).sort((a, b) => rank(a) - rank(b));
}
