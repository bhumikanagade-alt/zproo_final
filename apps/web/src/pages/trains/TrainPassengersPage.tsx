import { zodResolver } from '@hookform/resolvers/zod';
import type { TrainCapabilities } from '@zproo/types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Skeleton } from '@zproo/ui';
import {
  berthPreferencesFor,
  contactSchema,
  TRAIN_MAX_PASSENGERS,
  TRAIN_MAX_TATKAL_PASSENGERS,
  trainPassengerRuleIssues,
  trainPassengerSchema,
} from '@zproo/validation';
import { ArrowRight, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useFieldArray, useForm, type FieldErrors, type FieldPath } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { errorMessage } from '@/features/auth/errors';
import { useAuthStore } from '@/features/auth/store';
import { CheckoutShell, NothingSelected } from '@/features/checkout/CheckoutShell';
import { useTrainCapabilities } from '@/features/trains/api';
import { TrainJourneySummary } from '@/features/trains/components/TrainJourneySummary';
import { useTrainDraft, type TrainSelection } from '@/features/trains/draft';
import { berthLabel } from '@/features/trains/format';
import { useTrainCursor } from '@/features/trains/useTrainCursor';

export default function TrainPassengersPage() {
  useTrainCursor();
  const selection = useTrainDraft((s) => s.selection);
  const caps = useTrainCapabilities();
  if (!selection) return <NothingSelected service="train" />;
  return (
    <CheckoutShell
      step={1}
      service="train"
      title="Passenger details"
      back={{
        to: `/trains/selection?${new URLSearchParams({ offer: selection.offerId, class: selection.travelClass, quota: selection.quota, passengers: String(selection.passengers) }).toString()}`,
        label: 'Change class',
      }}
      aside={
        <TrainJourneySummary
          train={selection.train}
          travelClass={selection.travelClass}
          quota={selection.quota}
        />
      }
    >
      {caps.error ? (
        <FormAlert>{errorMessage(caps.error)}</FormAlert>
      ) : !caps.data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <PassengerForm selection={selection} caps={caps.data} />
      )}
    </CheckoutShell>
  );
}

const blank = (berth = 'NO_PREFERENCE') => ({
  firstName: '',
  lastName: '',
  age: '' as unknown as number,
  gender: 'MALE' as const,
  berthPreference: berth as 'NO_PREFERENCE',
});

function PassengerForm({
  selection,
  caps,
}: {
  selection: TrainSelection;
  caps: TrainCapabilities;
}) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const draft = useTrainDraft();
  const max = Math.min(
    selection.quota === 'TQ' ? caps.maxTatkalPassengers : caps.maxPassengers,
    selection.quota === 'TQ' ? TRAIN_MAX_TATKAL_PASSENGERS : TRAIN_MAX_PASSENGERS,
  );
  const berths = caps.berthPreference
    ? berthPreferencesFor(selection.travelClass)
    : ['NO_PREFERENCE'];
  const food = caps.foodChoice && selection.train.pantry;

  const schema = z
    .object({
      passengers: z
        .array(trainPassengerSchema)
        .min(1, 'Add at least one passenger')
        .max(max, `Up to ${max} passengers per ticket`),
      contact: contactSchema,
      confirmOnly: z.boolean(),
    })
    .superRefine((v, ctx) => {
      for (const issue of trainPassengerRuleIssues({
        quota: selection.quota,
        travelClass: selection.travelClass,
        passengers: v.passengers,
      })) {
        ctx.addIssue({ code: 'custom', ...issue });
      }
    });

  const initialCount = Math.min(max, Math.max(1, selection.passengers));
  const saved = draft.passengers ?? [];
  const passengers = Array.from(
    { length: Math.max(initialCount, Math.min(saved.length, max)) },
    (_, i) => {
      const p = saved[i];
      return p
        ? {
            ...p,
            berthPreference: berths.includes(p.berthPreference)
              ? p.berthPreference
              : 'NO_PREFERENCE',
          }
        : blank();
    },
  );

  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      passengers: passengers as z.input<typeof schema>['passengers'],
      contact: draft.contact
        ? { email: draft.contact.email, phone: draft.contact.phone.replace(/^\+91/, '') }
        : { email: user?.email ?? '', phone: user?.phone?.replace(/^\+91/, '') ?? '' },
      confirmOnly: draft.confirmOnly,
    },
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  });
  const { register, handleSubmit, formState, control } = form;
  const rows = useFieldArray({ control, name: 'passengers' });
  const errors = formState.errors as FieldErrors<z.output<typeof schema>>;
  const listError = errors.passengers as
    { message?: string; root?: { message?: string } } | undefined;

  const onSubmit = handleSubmit(
    (values) => {
      draft.setPassengers(
        values.passengers.map((p) => ({
          ...p,
          firstName: p.firstName.trim().replace(/\s+/g, ' '),
          lastName: p.lastName.trim().replace(/\s+/g, ' '),
          ...(food ? {} : { foodChoice: undefined }),
        })),
        values.contact,
        caps.confirmOnlyOption ? values.confirmOnly : false,
      );
      void navigate('/trains/review');
    },
    () => {
      // Bring the first problem into view (react-hook-form focuses the field itself).
      requestAnimationFrame(() =>
        document
          .querySelector('[aria-invalid="true"]')
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
      );
    },
  );
  const errorCount = Object.keys(formState.errors).length > 0 && formState.isSubmitted
    ? countErrors(formState.errors)
    : 0;
  /** Collapse repeated spaces and strip anything that is not a letter while typing. */
  const cleanName = (value: string, limit: number) =>
    value.replace(/[^A-Za-z ]/g, '').replace(/^ +/, '').replace(/ {2,}/g, ' ').slice(0, limit);
  const trimOnBlur = (name: FieldPath<z.input<typeof schema>>) => () => {
    const v = form.getValues(name);
    if (typeof v === 'string' && v !== v.trim()) form.setValue(name, v.trim() as never, { shouldValidate: true });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 pb-24 sm:space-y-6 sm:pb-0">
      <p className="text-sm text-muted">
        Names as on a government photo ID. Children under 5 travel without a ticket — don't add
        them.
        {caps.idRequired ? '' : ' No ID numbers are needed to book.'}
      </p>
      {errorCount > 0 && (
        <FormAlert>
          Please fix {errorCount} highlighted field{errorCount === 1 ? '' : 's'} before continuing.
        </FormAlert>
      )}
      {(listError?.message || listError?.root?.message) && (
        <FormAlert>{listError.message ?? listError.root?.message}</FormAlert>
      )}
      {rows.fields.map((field, i) => {
        const e = errors.passengers?.[i];
        return (
          <Card key={field.id}>
            <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base">
                Passenger {i + 1}
                <span className="ml-2 text-xs font-medium text-muted">of {max} max</span>
              </CardTitle>
              {rows.fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => rows.remove(i)}
                  aria-label={`Remove passenger ${i + 1}`}
                >
                  <Trash2 aria-hidden /> Remove
                </Button>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="First & middle name" error={e?.firstName?.message}>
                <Input
                  autoComplete={i === 0 ? 'given-name' : 'off'}
                  maxLength={20}
                  autoCapitalize="words"
                  spellCheck={false}
                  {...register(`passengers.${i}.firstName`, {
                    onChange: (event) => {
                      event.target.value = cleanName(event.target.value, 20);
                    },
                    onBlur: trimOnBlur(`passengers.${i}.firstName`),
                  })}
                />
              </FormField>
              <FormField label="Last name (optional)" error={e?.lastName?.message}>
                <Input
                  autoComplete={i === 0 ? 'family-name' : 'off'}
                  maxLength={15}
                  autoCapitalize="words"
                  spellCheck={false}
                  {...register(`passengers.${i}.lastName`, {
                    onChange: (event) => {
                      event.target.value = cleanName(event.target.value, 15);
                    },
                    onBlur: trimOnBlur(`passengers.${i}.lastName`),
                  })}
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
                  <option value="OTHER">Transgender / other</option>
                </Select>
              </FormField>
              {berths.length > 1 && (
                <FormField
                  label="Berth preference"
                  error={e?.berthPreference?.message}
                  hint="Subject to availability"
                >
                  <Select {...register(`passengers.${i}.berthPreference`)}>
                    {berths.map((b) => (
                      <option key={b} value={b}>
                        {berthLabel(b)}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}
              {food && (
                <FormField label="Food choice" error={e?.foodChoice?.message}>
                  <Select
                    {...register(`passengers.${i}.foodChoice`, {
                      setValueAs: (v: string) => v || undefined,
                    })}
                  >
                    <option value="">No preference</option>
                    <option value="VEG">Veg</option>
                    <option value="NON_VEG">Non-veg</option>
                    <option value="NO_FOOD">No food</option>
                  </Select>
                </FormField>
              )}
            </CardContent>
          </Card>
        );
      })}

      {rows.fields.length < max && (
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => rows.append(blank())}
        >
          <Plus aria-hidden /> Add passenger
        </Button>
      )}

      {caps.confirmOnlyOption && (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            {...register('confirmOnly')}
          />
          <span>
            <span className="block font-semibold">Book only if confirmed berths are available</span>
            <span className="block text-muted">
              If the railway can't give every passenger a confirmed berth, nothing is booked and you
              get a full refund — instead of an RAC or waitlisted ticket.
            </span>
          </span>
        </label>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact details</CardTitle>
          <p className="text-sm text-muted">We send the ticket, PNR and status updates here.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Email" error={errors.contact?.email?.message}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              {...register('contact.email')}
            />
          </FormField>
          <FormField label="Mobile number" error={errors.contact?.phone?.message}>
            <PhoneInput digitsOnly {...register('contact.phone')} />
          </FormField>
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <ShieldCheck aria-hidden className="size-3.5" />
        We share passenger details only with the railway provider for this booking.
      </p>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:z-auto sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={formState.isSubmitting}>
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

/** Number of fields with a problem in a (nested) react-hook-form error tree. */
function countErrors(node: unknown): number {
  if (!node || typeof node !== 'object') return 0;
  const record = node as Record<string, unknown>;
  if (typeof record.message === 'string' && 'type' in record) return 1;
  return Object.entries(record).reduce(
    (sum, [key, value]) => (key === 'ref' ? sum : sum + countErrors(value)),
    0,
  );
}
