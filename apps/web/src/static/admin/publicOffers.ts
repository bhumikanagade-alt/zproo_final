import type { AdminOffer } from '@zproo/types';
import { adminDb } from './db';
import { STARTERS } from './demo';

/** Live offers for the public Offers page (static mode), as managed in the admin panel. */
export function publicOffers(): AdminOffer[] {
  const a = adminDb();
  const all = a.seeded.offers ? a.collections.offers : STARTERS.offers();
  const today = new Date().toISOString().slice(0, 10);
  return all.filter((o) => o.active && o.validTo.slice(0, 10) >= today).sort((x, y) => x.sortOrder - y.sortOrder);
}
