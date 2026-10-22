import { cn } from '@zproo/ui';
import { BANKS, DEMO_DECLINE, PAYMENT_METHODS, PAYMENT_ORDER } from '../rules';
import type { PaymentMethod } from '../types';
import { sanitizeCardNumber, sanitizeCvv, sanitizeExpiry, type Errors, type PaymentFields as Fields, type PaymentKey } from '../validation';
import { SelectField, TextField, focusRing } from './ui';

/** Radio cards for choosing how to pay. */
export function PaymentMethodPicker({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  return (
    <fieldset>
      <legend className="sr-only">Payment method</legend>
      <ul className="grid gap-3 sm:grid-cols-2">
        {PAYMENT_ORDER.map((m) => {
          const checked = value === m;
          return (
            <li key={m}>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- the input is nested; the text is in child spans */}
              <label
                className={cn(
                  'flex h-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors',
                  checked ? 'border-primary bg-primary-light' : 'border-border bg-card hover:border-foreground/40',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground has-[:focus-visible]:ring-offset-2',
                )}
              >
                <input type="radio" name="bike-payment-method" checked={checked} onChange={() => onChange(m)} className={cn('mt-0.5 size-4 accent-[var(--primary)]', focusRing)} />
                <span className="min-w-0">
                  <span className="block font-semibold">{PAYMENT_METHODS[m].label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{PAYMENT_METHODS[m].blurb}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

interface Props {
  method: PaymentMethod;
  fields: Fields;
  errors?: Errors<PaymentKey>;
  onChange: (patch: Partial<Fields>) => void;
}

/** Inputs for the chosen method. Entered details live only in this form's state: never stored, never sent. */
export function PaymentDetailsForm({ method, fields, errors = {}, onChange }: Props) {
  if (method === 'upi') {
    return (
      <TextField
        label="UPI ID"
        autoComplete="off"
        autoCapitalize="none"
        value={fields.upiId}
        error={errors.upiId}
        hint={`e.g. name@okaxis. Demo: ${DEMO_DECLINE.upi} is declined.`}
        onChange={(e) => onChange({ upiId: e.target.value.replace(/\s/g, '').slice(0, 60) })}
        placeholder="name@okaxis"
      />
    );
  }
  if (method === 'card') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Card number"
          className="sm:col-span-2"
          inputMode="numeric"
          autoComplete="cc-number"
          value={fields.cardNumber}
          error={errors.cardNumber}
          hint="Demo: 4242 4242 4242 4242 succeeds. 4000 0000 0000 0002 is declined."
          onChange={(e) => onChange({ cardNumber: sanitizeCardNumber(e.target.value), cvv: sanitizeCvv(fields.cvv, e.target.value) })}
          placeholder="1234 5678 9012 3456"
        />
        <TextField
          label="Name on card"
          className="sm:col-span-2"
          autoComplete="cc-name"
          value={fields.cardName}
          error={errors.cardName}
          onChange={(e) => onChange({ cardName: e.target.value.replace(/[^\p{L}\p{M}\s.'’-]/gu, '').slice(0, 60) })}
        />
        <TextField
          label="Expiry (MM/YY)"
          inputMode="numeric"
          autoComplete="cc-exp"
          value={fields.expiry}
          error={errors.expiry}
          onChange={(e) => onChange({ expiry: sanitizeExpiry(e.target.value) })}
          placeholder="08/29"
        />
        <TextField
          label="CVV"
          type="password"
          inputMode="numeric"
          autoComplete="cc-csc"
          value={fields.cvv}
          error={errors.cvv}
          onChange={(e) => onChange({ cvv: sanitizeCvv(e.target.value, fields.cardNumber) })}
          placeholder="•••"
        />
      </div>
    );
  }
  if (method === 'netbanking') {
    return (
      <SelectField label="Choose your bank" value={fields.bank} error={errors.bank} onChange={(e) => onChange({ bank: e.target.value })}>
        <option value="">Select bank</option>
        {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
      </SelectField>
    );
  }
  return (
    <p className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-muted">
      Nothing is charged now. Pay the rental at the hub when you collect the bike. Carry your documents and the refundable security deposit.
    </p>
  );
}
