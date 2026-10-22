import { cn } from '@zproo/ui';
import { useApiHealth } from './hooks';

/** Development-only indicator confirming the web app can reach the API, database and Redis. */
export function ApiStatus() {
  const { data, isPending, isError } = useApiHealth();
  const state = isPending ? 'checking' : isError ? 'unreachable' : data.status;
  const tone = state === 'ok' ? 'bg-success' : state === 'checking' ? 'bg-muted' : 'bg-danger';
  const detail = data
    ? Object.entries(data.checks)
        .map(([name, check]) => `${name}: ${check.status}`)
        .join(', ')
    : undefined;

  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted" title={detail}>
      <span aria-hidden className={cn('size-2 rounded-full', tone)} />
      API {state}
      {detail && <span className="hidden sm:inline">({detail})</span>}
    </span>
  );
}
