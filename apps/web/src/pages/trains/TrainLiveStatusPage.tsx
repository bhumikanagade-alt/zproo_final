import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
} from '@zproo/ui';
import {
  addDays,
  LIVE_STATUS_FUTURE_DAYS,
  LIVE_STATUS_PAST_DAYS,
  liveStatusSchema,
  todayIso,
} from '@zproo/validation';
import { Radio, Search } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { useLiveStatus } from '@/features/trains/api';
import { trainLiveStatusUrl } from '@/features/trains/links';
import { istTime } from '@/features/trains/format';
import { useTrainCursor } from '@/features/trains/useTrainCursor';

/**
 * Live running status. Shown only when the railway provider supplies live data; otherwise the page
 * says so plainly — no delays, positions or times are ever invented.
 */
export default function TrainLiveStatusPage() {
  useTrainCursor();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const trainParam = params.get('train')?.toUpperCase() ?? '';
  const date = params.get('date') ?? todayIso();
  const [train, setTrain] = useState(trainParam);
  const [day, setDay] = useState(date);
  const [problem, setProblem] = useState<string | null>(null);
  const [dateProblem, setDateProblem] = useState<string | null>(null);
  const trainId = useId();
  const dateId = useId();
  const { data, isFetching, error } = useLiveStatus(trainParam || null, date);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = liveStatusSchema.safeParse({ train, date: day });
    if (!result.success) {
      const first = (field: string) =>
        result.error.issues.find((i) => i.path[0] === field)?.message ?? null;
      setProblem(first('train'));
      setDateProblem(first('date'));
      return;
    }
    setProblem(null);
    setDateProblem(null);
    void navigate(trainLiveStatusUrl(result.data.train, result.data.date));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <Seo
        title="Live train status"
        description="Check where your train is, when the railway provider supplies live running data."
      />
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
        <Radio aria-hidden className="size-7 text-primary" /> Live train status
      </h1>
      <form
        onSubmit={submit}
        noValidate
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_auto] sm:items-start sm:p-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor={trainId}>Train number</Label>
          <Input
            id={trainId}
            value={train}
            onChange={(e) => {
              setTrain(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6));
              if (problem) setProblem(null);
            }}
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={6}
            placeholder="e.g. 12123"
            aria-invalid={Boolean(problem) || undefined}
            aria-describedby={problem ? `${trainId}-error` : undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={dateId}>Date</Label>
          <Input
            id={dateId}
            type="date"
            value={day}
            min={addDays(todayIso(), -LIVE_STATUS_PAST_DAYS)}
            max={addDays(todayIso(), LIVE_STATUS_FUTURE_DAYS)}
            onChange={(e) => {
              setDay(e.target.value);
              if (dateProblem) setDateProblem(null);
            }}
            aria-invalid={Boolean(dateProblem) || undefined}
            aria-describedby={dateProblem ? `${dateId}-error` : undefined}
          />
        </div>
        <Button type="submit" className="w-full sm:mt-[1.625rem] sm:w-auto">
          <Search aria-hidden /> Check status
        </Button>
        {problem && (
          <p id={`${trainId}-error`} role="alert" className="text-xs font-semibold text-danger sm:col-span-3">
            {problem}
          </p>
        )}
        {dateProblem && (
          <p id={`${dateId}-error`} role="alert" className="text-xs font-semibold text-danger sm:col-span-3">
            {dateProblem}
          </p>
        )}
      </form>

      {!trainParam ? null : error ? (
        <FormAlert>{errorMessage(error)}</FormAlert>
      ) : isFetching || !data ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : !data.supported ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live status isn't available</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            <p>{data.message}</p>
            <p className="mt-2">
              Running status needs a connected railway data provider. Until one is configured we
              don't show any position or delay information.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Train {data.trainNumber} ·{' '}
              {data.state === 'ARRIVED'
                ? 'Arrived'
                : data.state === 'RUNNING'
                  ? 'Running'
                  : data.state === 'NOT_STARTED'
                    ? 'Not started yet'
                    : 'Status unknown'}
            </CardTitle>
            <p className="text-xs text-muted">
              {data.lastUpdatedAt
                ? `Last updated ${istTime(data.lastUpdatedAt)}`
                : 'No update time from the provider'}
              {data.stale && ' · This information may be out of date'}
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.currentStation && (
              <p>
                Last reported at <strong>{data.currentStation.name}</strong>
                {data.delayMinutes !== null &&
                  (data.delayMinutes > 0 ? ` · ${data.delayMinutes} min late` : ' · On time')}
              </p>
            )}
            <ol className="divide-y divide-border">
              {data.stations.map((s) => (
                <li key={s.code} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="font-semibold">{s.name}</span>
                  <span className="tabular-nums text-muted">
                    {s.actualArrival ?? s.scheduledArrival ?? '—'} /{' '}
                    {s.actualDeparture ?? s.scheduledDeparture ?? '—'}
                    {s.delayMinutes ? ` · +${s.delayMinutes} min` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
