import type { PriceBreakdown } from '@zproo/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@zproo/ui';
import { Armchair, BadgePercent, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { formatMoney as inr } from '@zproo/utils';

/** Fare breakdown. All taxes are shown up front; there are no convenience fees. */
export function PriceSummary({
  price,
  title = 'Fare summary',
  seatNumbers = [],
}: {
  price: PriceBreakdown;
  title?: string;
  seatNumbers?: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          <dl className="space-y-2">
            {/* SELECTED SEAT NUMBER */}
            {seatNumbers.length > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted">
                  <Armchair aria-hidden className="size-3.5" />
                  Seat number{seatNumbers.length === 1 ? '' : 's'}
                </dt>

                <dd className="font-semibold tabular-nums">{seatNumbers.join(', ')}</dd>
              </div>
            )}

            {/* FARE BREAKDOWN */}
            {price.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-3">
                <dt className="text-muted">{line.label}</dt>

                <dd className="tabular-nums">{inr(line.amountPaise)}</dd>
              </div>
            ))}

            {/* CONVENIENCE FEE (a fee, when charged, is one of the lines above) */}
            {price.feesPaise === 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Convenience fee</dt>

                <dd className="font-semibold text-success">Free</dd>
              </div>
            )}

            {/* DISCOUNT */}
            {price.discountPaise > 0 && (
              <div className="flex justify-between gap-3 text-success">
                <dt>Discount</dt>
                <dd className="tabular-nums">−{inr(price.discountPaise)}</dd>
              </div>
            )}

            {/* TOTAL */}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-base font-extrabold">
              <dt>Total</dt>

              <dd className="tabular-nums">{inr(price.totalPaise)}</dd>
            </div>
          </dl>

          {/* SAVINGS: shown only when a discount was actually applied */}
          {price.discountPaise > 0 && (
            <p className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">
              <BadgePercent aria-hidden className="size-4" />
              You saved {inr(price.discountPaise)} on this booking
            </p>
          )}

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            View price breakdown
          </button>

          {/* TAX INFORMATION */}
          <p className="flex items-center gap-1.5 pt-1 text-xs text-muted">
            <ShieldCheck aria-hidden className="size-3.5 text-success" />
            Includes all taxes. No hidden charges.
          </p>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Complete price breakdown</DialogTitle>
          <DialogDescription>How the total is made up.</DialogDescription>
          <dl className="mt-5 space-y-3 text-sm">
            {price.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-4">
                <dt>{line.label}</dt>
                <dd className="font-semibold tabular-nums">{inr(line.amountPaise)}</dd>
              </div>
            ))}
            {price.feesPaise > 0 && !price.lines.some((l) => /fee/i.test(l.label)) && (
              <div className="flex justify-between gap-4">
                <dt>Service fee</dt>
                <dd className="font-semibold tabular-nums">{inr(price.feesPaise)}</dd>
              </div>
            )}
            {price.taxesPaise > 0 && !price.lines.some((l) => /gst|tax/i.test(l.label)) && (
              <div className="flex justify-between gap-4">
                <dt>Taxes</dt>
                <dd className="font-semibold tabular-nums">{inr(price.taxesPaise)}</dd>
              </div>
            )}
            {price.discountPaise > 0 && (
              <div className="flex justify-between gap-4 text-success">
                <dt>Discount</dt>
                <dd className="font-semibold tabular-nums">−{inr(price.discountPaise)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base font-extrabold">
              <dt>Total</dt>
              <dd>{inr(price.totalPaise)}</dd>
            </div>
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}
