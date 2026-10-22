import type { Prisma, PrismaClient } from '@prisma/client';
import { adminInstant } from '@zproo/utils';
import type { Coupon, CouponCheck, PublicCoupon, ServiceType } from '@zproo/types';
import { ConflictError, ValidationError } from '../utils/errors';

interface CouponServiceDeps {
  prisma: PrismaClient;
  now?: () => Date;
}

export interface CouponQuote {
  couponId: string;
  code: string;
  discountPaise: number;
}

/** Percent coupons round down and respect their cap; the discount never exceeds the order. */
function discountFor(c: Coupon, orderPaise: number): number {
  const raw = c.discountType === 'PERCENT' ? Math.floor((orderPaise * c.value) / 100) : c.value;
  const capped = c.discountType === 'PERCENT' && c.maxDiscountPaise !== null ? Math.min(raw, c.maxDiscountPaise) : raw;
  return Math.max(0, Math.min(capped, orderPaise));
}

/**
 * Coupons created in the admin panel. Checkout asks `quote()` for the discount (it checks the code,
 * dates, service, minimum order and usage limits) and records the use with `redeem()` in the same
 * transaction as the booking, so limits cannot be beaten by two checkouts at once.
 */
export class CouponService {
  private readonly now: () => Date;

  constructor(private readonly deps: CouponServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  /**
   * Returns null when no coupon with this code exists (the caller may try another kind of promo code),
   * the discount when it applies, and throws a ValidationError that says why when it does not.
   */
  async quote(input: { code: string; service: ServiceType; userId: string; orderPaise: number }): Promise<CouponQuote | null> {
    const code = input.code.trim().toUpperCase();
    const row = await this.deps.prisma.adminRecord.findFirst({ where: { collection: 'coupons', data: { path: ['code'], equals: code } } });
    if (!row) return null;
    const c = row.data as unknown as Coupon;
    const reject = (message: string): never => {
      throw new ValidationError([{ path: 'body.promoCode', message }]);
    };
    const now = this.now().getTime();
    if (!c.active) return reject('This coupon is not active');
    if (adminInstant(c.validFrom, 'start') > now) return reject('This coupon is not valid yet');
    if (adminInstant(c.validTo, 'end') < now) return reject('This coupon has expired');
    if (c.services.length > 0 && !c.services.includes(input.service)) return reject('This coupon does not apply to this service');
    if (input.orderPaise < c.minOrderPaise) return reject(`Spend at least ₹${(c.minOrderPaise / 100).toLocaleString('en-IN')} to use this coupon`);
    if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return reject('This coupon has been fully used');
    const usedByUser = await this.deps.prisma.couponRedemption.count({ where: { couponId: row.id, userId: input.userId } });
    if (usedByUser >= c.perUserLimit) return reject('You have already used this coupon the maximum number of times');
    return { couponId: row.id, code, discountPaise: discountFor(c, input.orderPaise) };
  }

  /**
   * Coupons a customer may see right now: active, inside their dates, not used up, and (when a
   * service is given) valid on it. Internal fields such as usage counts are left out.
   */
  async listPublic(service?: ServiceType): Promise<PublicCoupon[]> {
    const rows = await this.deps.prisma.adminRecord.findMany({ where: { collection: 'coupons' }, orderBy: { createdAt: 'desc' } });
    const now = this.now().getTime();
    return rows
      .map((r) => r.data as unknown as Coupon)
      .filter(
        (c) =>
          c.active &&
          adminInstant(c.validFrom, 'start') <= now &&
          adminInstant(c.validTo, 'end') >= now &&
          (c.usageLimit === null || c.usedCount < c.usageLimit) &&
          (!service || c.services.length === 0 || c.services.includes(service)),
      )
      .map((c) => ({
        code: c.code,
        description: c.description,
        discountType: c.discountType,
        value: c.value,
        maxDiscountPaise: c.maxDiscountPaise,
        minOrderPaise: c.minOrderPaise,
        services: c.services,
        validTo: c.validTo,
      }));
  }

  /** Checkout's "Apply" button: the discount for this order, or a ValidationError that says why not. */
  async check(input: { code: string; service: ServiceType; userId: string; orderPaise: number }): Promise<CouponCheck> {
    const quote = await this.quote(input);
    if (!quote) throw new ValidationError([{ path: 'body.code', message: 'Invalid or expired coupon code' }]);
    const row = await this.deps.prisma.adminRecord.findUnique({ where: { id: quote.couponId } });
    const description = (row?.data as unknown as Coupon | undefined)?.description ?? '';
    return { code: quote.code, description, discountPaise: quote.discountPaise };
  }

  /**
   * For bookings that are completed in the customer's browser (hotels): checks the code again against the
   * order and records the use. The same booking reference and code counts once, so a retry is harmless.
   */
  async redeemForReference(input: { code: string; service: ServiceType; userId: string; orderPaise: number; bookingRef: string }): Promise<CouponCheck> {
    const code = input.code.trim().toUpperCase();
    const row = await this.deps.prisma.adminRecord.findFirst({ where: { collection: 'coupons', data: { path: ['code'], equals: code } } });
    if (!row) throw new ValidationError([{ path: 'body.code', message: 'Invalid or expired coupon code' }]);
    const coupon = row.data as unknown as Coupon;
    const already = await this.deps.prisma.couponRedemption.findFirst({ where: { couponId: row.id, userId: input.userId, bookingId: input.bookingRef } });
    if (already) return { code, description: coupon.description, discountPaise: discountFor(coupon, input.orderPaise) };

    const quote = await this.quote({ code, service: input.service, userId: input.userId, orderPaise: input.orderPaise });
    if (!quote) throw new ValidationError([{ path: 'body.code', message: 'Invalid or expired coupon code' }]);
    await this.deps.prisma.$transaction((tx) => this.redeem(tx, { couponId: quote.couponId, code: quote.code, userId: input.userId, bookingId: input.bookingRef }));
    return { code: quote.code, description: coupon.description, discountPaise: quote.discountPaise };
  }

  /**
   * Gives back the use recorded for this booking reference (payment failed after the coupon was used, or the
   * booking was cancelled): the "Used" count goes down by one and the customer can use the coupon again.
   * Only the customer who used it can release it, and releasing twice does nothing.
   */
  async releaseForReference(input: { code: string; userId: string; bookingRef: string }): Promise<{ released: boolean }> {
    const code = input.code.trim().toUpperCase();
    const row = await this.deps.prisma.adminRecord.findFirst({ where: { collection: 'coupons', data: { path: ['code'], equals: code } } });
    if (!row) return { released: false };
    return this.deps.prisma.$transaction(async (tx) => {
      const gone = await tx.couponRedemption.deleteMany({ where: { couponId: row.id, code, userId: input.userId, bookingId: input.bookingRef } });
      if (gone.count === 0) return { released: false };
      await tx.$executeRaw`
        UPDATE admin_records
        SET data = jsonb_set(data, '{usedCount}', to_jsonb(GREATEST(COALESCE((data->>'usedCount')::int, 0) - 1, 0)))
        WHERE id = ${row.id} AND collection = 'coupons'`;
      return { released: true };
    });
  }

  /** Records one use. Call inside the booking's transaction. */
  async redeem(tx: Prisma.TransactionClient, input: { couponId: string; code: string; userId: string; bookingId: string }): Promise<void> {
    await tx.couponRedemption.create({ data: input });
    // The count only moves while the limit still has room, in one statement (safe under concurrent checkouts).
    const moved = await tx.$executeRaw`
      UPDATE admin_records
      SET data = jsonb_set(data, '{usedCount}', to_jsonb(COALESCE((data->>'usedCount')::int, 0) + 1))
      WHERE id = ${input.couponId} AND collection = 'coupons'
        AND ((data->>'usageLimit') IS NULL OR COALESCE((data->>'usedCount')::int, 0) < (data->>'usageLimit')::int)`;
    if (moved !== 1) throw new ConflictError('This coupon has just been fully used. Please try again without it.');
  }
}
