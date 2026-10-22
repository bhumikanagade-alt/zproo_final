import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogTitle, Input, Skeleton } from '@zproo/ui';
import { Tag } from 'lucide-react';
import { useState } from 'react';
import { couponCondition, couponErrorMessage, couponHeadline, couponsApi, useLiveCoupons } from '@/features/coupons/api';
import { useFlightDraft } from '@/features/flights/draft';

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** "Offers & coupons" on the flight review page: coupons made in Admin → Marketing → Coupons that are valid on flights. */
export function FlightCouponCard({
  grossPaise,
  discountPaise,
  problem,
}: {
  /** The total before any coupon (fare, taxes and any seats, meals or baggage). */
  grossPaise: number;
  /** What the applied coupon takes off right now (0 when none applies). */
  discountPaise: number;
  /** Why the applied coupon no longer works, when the server refuses it. */
  problem: string | null;
}) {
  const promoCode = useFlightDraft((s) => s.promoCode);
  const setPromo = useFlightDraft((s) => s.setPromo);
  const [input, setInput] = useState(promoCode ?? '');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [offersOpen, setOffersOpen] = useState(false);
  const live = useLiveCoupons('FLIGHT');

  async function apply(raw: string) {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    setApplying(true);
    setError('');
    try {
      const result = await couponsApi.check({ code, service: 'FLIGHT', orderPaise: grossPaise });
      setPromo(result.code, result.discountPaise);
      setInput(result.code);
    } catch (e) {
      setPromo(null);
      setError(couponErrorMessage(e));
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Offers &amp; coupons</CardTitle>
            <p className="text-sm text-muted">Enter a code or pick one of the offers available for flight bookings.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setOffersOpen(true)}>
            <Tag aria-hidden /> View offers
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={input}
              maxLength={20}
              onChange={(e) => {
                setInput(e.target.value.trim().toUpperCase().slice(0, 20));
                setError('');
              }}
              placeholder="Enter coupon code"
              aria-label="Coupon code"
            />
            <Button type="button" disabled={applying || !input.trim()} onClick={() => void apply(input)}>
              {applying ? 'Checking…' : 'Apply'}
            </Button>
            {promoCode && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPromo(null);
                  setInput('');
                  setError('');
                }}
              >
                Remove
              </Button>
            )}
          </div>
          {promoCode && !problem && discountPaise > 0 && (
            <p role="status" className="text-sm font-semibold text-success">
              {promoCode} applied — you save {rupees(discountPaise)}.
            </p>
          )}
          {problem && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {problem} The total shown is without the coupon.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={offersOpen} onOpenChange={setOffersOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Available offers</DialogTitle>
          <DialogDescription>Choose an offer and apply it to this booking.</DialogDescription>
          <div className="mt-5 space-y-3">
            {live.isPending && <Skeleton className="h-16 rounded-xl" />}
            {live.data?.length === 0 && <p className="text-sm text-muted">There are no flight offers right now.</p>}
            {(live.data ?? []).map((c) => (
              <button
                key={c.code}
                type="button"
                className="w-full rounded-xl border border-border p-4 text-left hover:border-primary"
                onClick={() => {
                  setOffersOpen(false);
                  setInput(c.code);
                  void apply(c.code);
                }}
              >
                <strong className="font-mono">{c.code}</strong> — {couponHeadline(c)}
                <p className="mt-1 text-xs text-muted">
                  {c.description}
                  {couponCondition(c) ? ` · ${couponCondition(c)}` : ''}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
