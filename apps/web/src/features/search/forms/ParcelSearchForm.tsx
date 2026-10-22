import { parcelQuoteSchema } from '@zproo/validation';
import { MapPin, Navigation, Weight } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import { FieldShell } from '../components/FieldShell';
import { fieldInputClass } from '../components/fieldStyles';
import { SearchButton } from '../components/SearchButton';
import { parcelUrl } from '../url';
import { useSearchForm } from '../useSearchForm';

export function ParcelSearchForm() {
  const ids = { from: useId(), to: useId(), weight: useId() };
  const { form, onSubmit } = useSearchForm(
    parcelQuoteSchema,
    { fromPincode: '', toPincode: '', weightKg: 1 },
    parcelUrl,
  );
  const { register, formState } = form;
  const errors = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate aria-label="Get a parcel quote" className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.7fr_0.8fr] lg:items-start">
        <FieldShell
          id={ids.from}
          label="Pickup PIN code"
          icon={<Navigation aria-hidden />}
          error={errors.fromPincode?.message}
        >
          <input
            id={ids.from}
            inputMode="numeric"
            maxLength={6}
            placeholder="411001"
            autoComplete="postal-code"
            className={fieldInputClass}
            {...register('fromPincode')}
          />
          <p className="text-xs text-muted">Where we collect it</p>
        </FieldShell>
        <FieldShell
          id={ids.to}
          label="Delivery PIN code"
          icon={<MapPin aria-hidden />}
          error={errors.toPincode?.message}
        >
          <input
            id={ids.to}
            inputMode="numeric"
            maxLength={6}
            placeholder="400001"
            className={fieldInputClass}
            {...register('toPincode')}
          />
          <p className="text-xs text-muted">Where it goes</p>
        </FieldShell>
        <FieldShell
          id={ids.weight}
          label="Weight (kg)"
          icon={<Weight aria-hidden />}
          error={errors.weightKg?.message}
        >
          <input
            id={ids.weight}
            type="number"
            step="0.1"
            min={0.1}
            max={50}
            inputMode="decimal"
            className={fieldInputClass}
            {...register('weightKg')}
          />
          <p className="text-xs text-muted">Up to 50 kg</p>
        </FieldShell>
        <SearchButton label="Get Quote" className="lg:h-[4.25rem]" />
      </div>
      <p className="text-sm text-muted">
        Already sent one?{' '}
        <Link to="/parcel/track" className="font-semibold text-primary hover:underline">
          Track a parcel
        </Link>
      </p>
    </form>
  );
}
