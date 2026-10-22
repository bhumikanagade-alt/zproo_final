/**
 * Starter content for the admin panel (development): a few coupons, home-page offers and a
 * support ticket, so every screen has something to show. Skipped when the collection has data.
 */
import type { PrismaClient } from '@prisma/client';

const day = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();

const coupon = (id: string, code: string, description: string, discountType: 'PERCENT' | 'FLAT', value: number, services: string[], extra: object = {}) => ({
  id,
  code,
  description,
  discountType,
  value,
  maxDiscountPaise: null,
  minOrderPaise: 0,
  services,
  validFrom: iso(-30),
  validTo: iso(60),
  usageLimit: null,
  perUserLimit: 1,
  usedCount: 0,
  active: true,
  createdAt: iso(-30),
  updatedAt: iso(-30),
  ...extra,
});

const offer = (id: string, title: string, subtitle: string, service: string, couponCode: string, ctaLabel: string, ctaPath: string, sortOrder: number) => ({
  id,
  title,
  subtitle,
  service,
  couponCode,
  ctaLabel,
  ctaPath,
  validTo: iso(45),
  featured: sortOrder <= 2,
  active: true,
  sortOrder,
  createdAt: iso(-10),
  updatedAt: iso(-10),
});

const STARTERS: Record<string, { id: string }[]> = {
  coupons: [
    coupon('cpn_zpfly', 'ZPFLY', '10% off domestic flights, up to ₹1,000', 'PERCENT', 10, ['FLIGHT'], { maxDiscountPaise: 100_000, minOrderPaise: 300_000 }),
    coupon('cpn_bus150', 'BUS150', '₹150 off bus tickets above ₹999', 'FLAT', 15_000, ['BUS'], { minOrderPaise: 99_900 }),
    coupon('cpn_train50', 'TRAIN50', '₹50 off the convenience fee on trains', 'FLAT', 5_000, ['TRAIN']),
  ],
  offers: [
    offer('ofr_flights', 'Up to 10% off domestic flights', 'Use ZPFLY on fares above ₹3,000', 'FLIGHT', 'ZPFLY', 'Search flights', '/flights', 1),
    offer('ofr_bus', 'Flat ₹150 off bus tickets', 'Overnight sleepers across Maharashtra', 'BUS', 'BUS150', 'Book a bus', '/buses', 2),
    offer('ofr_train', '₹50 off on train tickets', 'Book IRCTC trains with TRAIN50', 'TRAIN', 'TRAIN50', 'Book a train', '/trains', 3),
  ],
};

export async function seedAdminContent(prisma: PrismaClient): Promise<number> {
  if (process.env.NODE_ENV === 'production') return 0;
  let created = 0;
  for (const [collection, docs] of Object.entries(STARTERS)) {
    if ((await prisma.adminRecord.count({ where: { collection } })) > 0) continue;
    for (const doc of docs) {
      await prisma.adminRecord.create({ data: { id: doc.id, collection, data: doc } });
      created += 1;
    }
  }
  return created;
}
