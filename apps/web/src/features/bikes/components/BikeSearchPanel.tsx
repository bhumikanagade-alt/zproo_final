import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { SearchButton } from '@/features/search/components/SearchButton';
import { useLocations } from '../hooks';
import { bikeLinks } from '../links';
import { useBikeStore } from '../store';
import { validateSchedule } from '../validation';
import { ScheduleFields } from './ScheduleFields';
import { BikeNameField } from './BikeNameField';
import { focusRing } from './ui';
import { cn } from '@zproo/ui';

/**
 * Rental search: optional bike name/model (max 20 characters) + pickup city + pickup/return date and time.
 * Used on the Bikes landing page and in the home-page search widget. Submitting validates the
 * schedule, keeps it in the bike store and opens the results page (filters live there).
 */
export function BikeSearchPanel() {
  const navigate = useNavigate();
  const { schedule, patchSchedule, ensureFreshSchedule } = useBikeStore();
  const locationsQuery = useLocations();
  const [q, setQ] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof validateSchedule>>({});

  useEffect(() => {
    ensureFreshSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateSchedule(schedule, 4, new Date(), { cityOnly: true });
    setErrors(errs);
    if (Object.keys(errs).length) {
      window.setTimeout(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus(), 0);
      return;
    }
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    navigate(bikeLinks.results(params.toString()));
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Search bikes for rent" className="space-y-4">
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
          Please fix the highlighted fields to search.
        </p>
      )}
      <BikeNameField id="bike-home-q" label="Bike name or model (optional)" value={q} onChange={setQ} />
      {locationsQuery.isError ? (
        <p role="alert" className="text-sm text-danger">
          Could not load pickup locations.{' '}
          <button type="button" onClick={() => void locationsQuery.refetch()} className={cn('font-semibold underline', focusRing)}>Retry</button>
        </p>
      ) : (
        <ScheduleFields schedule={schedule} locations={locationsQuery.data ?? []} onChange={patchSchedule} errors={errors} />
      )}
      <SearchButton label="Search Bikes" className="sm:w-auto sm:px-10" />
      <p className="text-xs text-muted">Helmet, insurance and roadside assistance included on every rental.</p>
    </form>
  );
}
