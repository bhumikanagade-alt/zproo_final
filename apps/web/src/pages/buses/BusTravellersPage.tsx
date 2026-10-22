import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogTitle, Input, Skeleton } from '@zproo/ui';
import { BUS_FIRST_NAME_MAX, BUS_LAST_NAME_MAX, BUS_PROMO_MAX, busPassengerSchema, contactSchema } from '@zproo/validation';
import { ArrowRight, Tag, Venus } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { errorMessage } from '@/features/auth/errors';
import { useAuthStore } from '@/features/auth/store';
import { useBusTrip } from '@/features/buses/api';
import { couponCondition, couponErrorMessage, couponHeadline, couponsApi, useLiveCoupons } from '@/features/coupons/api';
import { BusTripSummary } from '@/features/buses/components/BusTripSummary';
import { useBusDraft, type BusSelection } from '@/features/buses/draft';
import { CheckoutShell, NothingSelected } from '@/features/checkout/CheckoutShell';
import { PriceSummary } from '@/features/checkout/PriceSummary';
import { busPriceBreakdown } from '@/features/buses/price';
import { useNotifications } from '@/components/feedback/Notifications';
import { useState } from 'react';

export default function BusTravellersPage() {
  const selection = useBusDraft((s) => s.selection);
  if (!selection) return <NothingSelected service="bus" />;
  return <Travellers selection={selection} />;
}

function Travellers({ selection }: { selection: BusSelection }) {
  const draft = useBusDraft();
  const { data: trip, isPending, error } = useBusTrip(selection.tripId);
  return (
    <CheckoutShell
      step={2}
      service="bus"
      title="Traveller details"
      back={{ to: selection.seatsUrl, label: 'Change seats' }}
      aside={
        trip ? (
          <>
            <PriceSummary price={busPriceBreakdown({ ...selection, discountPaise: draft.discountPaise })} seatNumbers={selection.seats.map((s) => s.number)} />
            <BusTripSummary
              trip={trip}
              boarding={trip.boardingPoints.find((p) => p.id === selection.boardingPointId)}
              dropping={trip.droppingPoints.find((p) => p.id === selection.droppingPointId)}
              seatNumbers={selection.seats.map((s) => s.number)}
            />
          </>
        ) : (
          <Skeleton className="h-64 rounded-2xl" />
        )
      }
    >
      {error ? (
        <FormAlert>{errorMessage(error)}</FormAlert>
      ) : isPending || !trip ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <TravellerForm selection={selection} />
      )}
    </CheckoutShell>
  );
}

function TravellerForm({ selection }: { selection: BusSelection }) {
  const [offersOpen, setOffersOpen] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const liveCoupons = useLiveCoupons('BUS');
  const grossPaise = selection.seats.reduce((sum, seat) => sum + seat.pricePaise, 0);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const draft = useBusDraft();
  const { notify } = useNotifications();
  const ladies = new Set(selection.seats.filter((s) => s.ladiesOnly).map((s) => s.number));

  /** Admin-made coupons are checked by the server (dates, limits, minimum order…); the two built-in codes stay local. */
  async function applyCoupon(raw: string) {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    setApplying(true);
    try {
      if (code === 'ZPROO10' || code === 'BUS100') {
        const discount = code === 'ZPROO10' ? Math.floor(grossPaise * 0.1) : Math.min(10_000, grossPaise);
        // An admin coupon with the same code takes priority on the server, so ask it first.
        const admin = await couponsApi.check({ code, service: 'BUS', orderPaise: grossPaise }).catch(() => null);
        const amount = admin ? admin.discountPaise : discount;
        draft.applyPromo(code, amount);
        const text = `${code} applied — you save ₹${(amount / 100).toLocaleString('en-IN')}.`;
        setCouponMessage({ ok: true, text });
        notify(text, 'success');
        return;
      }
      const result = await couponsApi.check({ code, service: 'BUS', orderPaise: grossPaise });
      draft.applyPromo(result.code, result.discountPaise);
      const text = `${result.code} applied — you save ₹${(result.discountPaise / 100).toLocaleString('en-IN')}.`;
      setCouponMessage({ ok: true, text });
      notify(text, 'success');
    } catch (error) {
      draft.clearPromo();
      const text = couponErrorMessage(error);
      setCouponMessage({ ok: false, text });
      notify(text, 'error');
    } finally {
      setApplying(false);
    }
  }

  const schema = z
    .object({ passengers: z.array(busPassengerSchema), contact: contactSchema })
    .superRefine((v, ctx) =>
      v.passengers.forEach((p, i) => {
        if (ladies.has(p.seatNumber) && p.gender !== 'FEMALE') {
          ctx.addIssue({
            code: 'custom',
            path: ['passengers', i, 'gender'],
            message: `Seat ${p.seatNumber} is reserved for women`,
          });
        }
      }),
    );

  const saved = new Map(draft.passengers?.map((p) => [p.seatNumber, p]) ?? []);
  const passengers = selection.seats.map(
    (seat) =>
      saved.get(seat.number) ?? {
        seatNumber: seat.number,
        firstName: '',
        lastName: '',
        age: '' as unknown as number,
        gender: seat.ladiesOnly ? ('FEMALE' as const) : ('MALE' as const),
      },
  );

  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      passengers,
      contact: draft.contact ?? {
        email: user?.email ?? '',
        phone: user?.phone?.replace(/^\+91/, '') ?? '',
      },
    },
    mode: 'onTouched',
  });
  const { register, handleSubmit, formState } = form;
  const errors = formState.errors as FieldErrors<z.output<typeof schema>>;

  const onSubmit = handleSubmit((values) => {
    draft.setTravellers(values.passengers, values.contact);
    void navigate('/buses/review');
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <p className="text-sm text-muted">
        One traveller per seat. Names as on a government photo ID.
      </p>
      {passengers.map((p, i) => {
        const e = errors.passengers?.[i];
        return (
          <Card key={p.seatNumber}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {/* TRAVELLER NUMBER */}
                Traveller {i + 1}
                {ladies.has(p.seatNumber) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 text-xs font-semibold text-pink-800">
                    <Venus aria-hidden className="size-3" /> Reserved for women
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField label="First & middle name" error={e?.firstName?.message}>
                <Input
                  autoComplete={i === 0 ? 'given-name' : 'off'}
                  maxLength={BUS_FIRST_NAME_MAX}
                  {...register(`passengers.${i}.firstName`)}
                  onInput={(event) => {
                    event.currentTarget.value = event.currentTarget.value.replace(/[^A-Za-z ]/g, '');
                  }}
                />
              </FormField>
              <FormField label="Last name" error={e?.lastName?.message}>
                <Input
                  autoComplete={i === 0 ? 'family-name' : 'off'}
                  maxLength={BUS_LAST_NAME_MAX}
                  {...register(`passengers.${i}.lastName`)}
                  onInput={(event) => {
                    event.currentTarget.value = event.currentTarget.value.replace(/[^A-Za-z ]/g, '');
                  }}
                />
              </FormField>
              <FormField label="Age" error={e?.age?.message}>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={3}
                  placeholder="Age in years"
                  {...register(`passengers.${i}.age`, {
                    // Digits only: letters, symbols and spaces are removed as the user types or pastes.
                    onChange: (event) => {
                      event.target.value = event.target.value.replace(/\D/g, '').slice(0, 3);
                    },
                  })}
                />
              </FormField>
              <FormField label="Gender" error={e?.gender?.message}>
                <Select {...register(`passengers.${i}.gender`)}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
              </FormField>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Offers & coupons</CardTitle>
            <p className="text-sm text-muted">Enter a code or pick one of the offers available for this bus booking.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setOffersOpen(true)}><Tag aria-hidden /> View offers</Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input value={coupon} maxLength={BUS_PROMO_MAX} onChange={(e) => { setCoupon(e.target.value.trim().toUpperCase().slice(0, BUS_PROMO_MAX)); setCouponMessage(null); }} placeholder="Enter coupon code" aria-label="Coupon code" />
          <Button type="button" disabled={applying || !coupon.trim()} onClick={() => void applyCoupon(coupon)}>{applying ? 'Checking…' : 'Apply'}</Button>
          {draft.promoCode && (
            <Button type="button" variant="outline" onClick={() => { draft.clearPromo(); setCoupon(''); setCouponMessage({ ok: true, text: 'Coupon removed.' }); }}>Remove</Button>
          )}
        </CardContent>
        {couponMessage && <p role="status" className={`px-6 pb-4 text-sm font-semibold ${couponMessage.ok ? 'text-success' : 'text-danger'}`}>{couponMessage.text}</p>}
        {draft.promoCode && !couponMessage && <p className="px-6 pb-4 text-sm font-semibold text-success">{draft.promoCode} applied — you save ₹{(draft.discountPaise / 100).toLocaleString('en-IN')}.</p>}
      </Card>

      <Dialog open={offersOpen} onOpenChange={setOffersOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Available offers</DialogTitle>
          <DialogDescription>Choose an offer and apply it to this booking.</DialogDescription>
          <div className="mt-5 space-y-3">
            {liveCoupons.isPending && <Skeleton className="h-16 rounded-xl" />}
            {(liveCoupons.data ?? []).map((c) => (
              <button key={c.code} type="button" className="w-full rounded-xl border border-border p-4 text-left hover:border-primary" onClick={() => { setOffersOpen(false); setCoupon(c.code); void applyCoupon(c.code); }}>
                <strong className="font-mono">{c.code}</strong> — {couponHeadline(c)}
                <p className="mt-1 text-xs text-muted">{c.description}{couponCondition(c) ? ` · ${couponCondition(c)}` : ''}</p>
              </button>
            ))}
            {/* Built-in promotions that exist besides the admin-made coupons. */}
            {['ZPROO10', 'BUS100'].filter((code) => !(liveCoupons.data ?? []).some((c) => c.code === code)).map((code) => (
              <button key={code} type="button" className="w-full rounded-xl border border-border p-4 text-left hover:border-primary" onClick={() => { setOffersOpen(false); setCoupon(code); void applyCoupon(code); }}>
                <strong>{code === 'ZPROO10' ? 'ZPROO10 — 10% OFF' : 'BUS100 — ₹100 OFF'}</strong>
                <p className="mt-1 text-xs text-muted">{code === 'ZPROO10' ? 'App promotion for eligible bookings.' : 'Eligible bus promotion.'}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact details</CardTitle>
          <p className="text-sm text-muted">We send the ticket and bus updates here.</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email" error={errors.contact?.email?.message}>
            <Input type="email" autoComplete="email" {...register('contact.email')} />
          </FormField>
          <FormField label="Mobile number" error={errors.contact?.phone?.message}>
            <PhoneInput digitsOnly {...register('contact.phone')} />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          Continue to review <ArrowRight aria-hidden />
        </Button>
      </div>
    </form>
  );
}

function Select(props: ComponentProps<'select'>) {
  return (
    <select
      {...props}
      className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-danger"
    />
  );
}
