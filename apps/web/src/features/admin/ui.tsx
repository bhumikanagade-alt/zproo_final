import {
  Badge,
  Button,
  Card,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Sheet,
  SheetContent,
  Skeleton,
} from '@zproo/ui';
import { DialogTitle as SheetTitle } from '@zproo/ui';
import { ChevronLeft, ChevronRight, Inbox, Search, TriangleAlert, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchParams } from 'react-router';
import { errorMessage } from '@/features/auth/errors';
import { count, humanize, toneOf } from './format';

// ───────── Page chrome ─────────

export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
            <Icon aria-hidden className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  change,
  icon: Icon,
  loading,
  invertChange,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Percent change vs the previous period. */
  change?: number | null;
  icon?: LucideIcon;
  loading?: boolean;
  /** For metrics where going down is good (e.g. cancellations). */
  invertChange?: boolean;
}) {
  const up = (change ?? 0) >= 0;
  const good = invertChange ? !up : up;
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-muted">
        <span>{label}</span>
        {Icon && <Icon aria-hidden className="size-4" />}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <div className="text-2xl font-extrabold tracking-tight tabular-nums">{value}</div>
      )}
      <div className="flex min-h-5 flex-wrap items-center gap-2 text-xs text-muted">
        {change !== null && change !== undefined && !loading && (
          <span className={cn('inline-flex items-center gap-0.5 font-bold', good ? 'text-green-700' : 'text-danger')}>
            {up ? <TrendingUp aria-hidden className="size-3.5" /> : <TrendingDown aria-hidden className="size-3.5" />}
            {up ? '+' : ''}
            {change}%<span className="sr-only"> vs previous period</span>
          </span>
        )}
        {hint}
      </div>
    </Card>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={toneOf(status)} className={cn('whitespace-nowrap', className)}>
      {humanize(status)}
    </Badge>
  );
}

export function DemoBadge() {
  return (
    <span
      title="Generated sample data (demo mode)"
      className="rounded-full border border-dashed border-border px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-muted"
    >
      Sample
    </span>
  );
}

// ───────── Filters ─────────

export const selectClass =
  'h-11 min-w-0 rounded-xl border border-border bg-card px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">{children}</div>;
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:min-w-64">
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} className="pl-10" type="search" />
    </div>
  );
}

export function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: T | '';
  onChange: (value: T | '') => void;
  options: readonly (T | { value: T; label: string })[];
  allLabel?: string;
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T | '')} className={selectClass}>
      {allLabel !== undefined && <option value="">{allLabel}</option>}
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: humanize(o) } : o;
        return (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        );
      })}
    </select>
  );
}

export function DateRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input type="date" aria-label="From date" value={from} max={to || undefined} onChange={(e) => onChange({ from: e.target.value, to })} className="w-auto" />
      <span className="text-muted" aria-hidden>
        –
      </span>
      <Input type="date" aria-label="To date" value={to} min={from || undefined} onChange={(e) => onChange({ from, to: e.target.value })} className="w-auto" />
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-border bg-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            o.value === value ? 'bg-foreground text-white' : 'text-muted hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ───────── Tables ─────────

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  empty = 'Nothing to show yet.',
  onRowClick,
  rowLabel,
  minWidth = 760,
  footer,
}: {
  columns: Column<T>[];
  rows: readonly T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Accessible name of the row's open action. */
  rowLabel?: (row: T) => string;
  minWidth?: number;
  footer?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead className="bg-background text-xs font-bold uppercase tracking-wider text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('whitespace-nowrap px-4 py-3', c.align === 'right' && 'text-right', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border" aria-busy={loading}>
            {loading &&
              !rows &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={columns.length} className="px-4 py-3">
                    <Skeleton className="h-6" />
                  </td>
                </tr>
              ))}
            {error !== undefined && error !== null && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-danger">
                  {errorMessage(error)}
                </td>
              </tr>
            )}
            {rows?.length === 0 && (error === undefined || error === null) && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted">
                  <Inbox aria-hidden className="mx-auto mb-2 size-6" />
                  {empty}
                </td>
              </tr>
            )}
            {rows?.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-background/70')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c, i) => (
                  <td key={c.key} className={cn('px-4 py-3 align-middle', c.align === 'right' && 'text-right tabular-nums', c.className)}>
                    {i === 0 && onRowClick ? (
                      <button
                        type="button"
                        className="text-left font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick(row);
                        }}
                        aria-label={rowLabel?.(row)}
                      >
                        {c.cell(row)}
                      </button>
                    ) : (
                      c.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </Card>
  );
}

export function Pagination({
  page,
  limit,
  total,
  onPage,
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const first = total ? (page - 1) * limit + 1 : 0;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
      <span className="text-muted">
        {total ? `${count(first)}–${count(Math.min(total, page * limit))} of ${count(total)}` : 'No results'}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft aria-hidden /> <span className="hidden sm:inline">Previous</span>
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <span className="hidden sm:inline">Next</span> <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <Card className="flex items-center gap-3 border-danger/30 p-5 text-danger">
      <TriangleAlert aria-hidden className="size-5 shrink-0" />
      {errorMessage(error)}
    </Card>
  );
}

// ───────── Drawer & dialogs ─────────

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-xl sm:w-[36rem] sm:max-w-[92vw]" aria-describedby={undefined}>
        <div className="border-b border-border px-6 py-5 pr-14">
          <SheetTitle className="text-lg font-extrabold tracking-tight">{title}</SheetTitle>
          {description && <div className="mt-1 text-sm text-muted">{description}</div>}
        </div>
        <div className="flex-1 space-y-6 px-6 py-5">{children}</div>
        {footer && <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border bg-card px-6 py-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  pending,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="pr-8 text-lg font-extrabold">{title}</DialogTitle>
        {description && <DialogDescription className="mt-2 text-sm text-muted">{description}</DialogDescription>}
        {children && <div className="mt-4 space-y-4">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep it
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} disabled={pending} onClick={onConfirm}>
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function DefinitionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-semibold text-muted">{k}</dt>
          <dd className="break-words font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ───────── Form fields ─────────

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-xs font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  hideLabel,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: ReactNode;
  /** Visually hidden label (e.g. inside a table row). */
  hideLabel?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-4', !hideLabel && 'justify-between')}>
      <div className={cn(hideLabel && 'sr-only')}>
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-border',
        )}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

export function TextArea(props: ComponentProps<'textarea'>) {
  return (
    <textarea
      {...props}
      className={cn(
        'min-h-24 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        props.className,
      )}
    />
  );
}

/** Small hook for drawer state keyed by the selected record id. */
export function useSelection<T = string>() {
  const [selected, setSelected] = useState<T | null>(null);
  return { selected, open: (v: T) => setSelected(v), close: () => setSelected(null), isOpen: selected !== null };
}

/**
 * Filter state kept in the URL (shareable, survives reloads and the back button). Changing any
 * filter other than `page` resets the page to 1.
 */
export function useUrlFilters<K extends string>(defaults: Record<K, string>) {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(
    (Object.keys(defaults) as K[]).map((k) => [k, params.get(k) ?? defaults[k]]),
  ) as Record<K, string>;
  const set = (patch: Partial<Record<K, string>>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch) as [K, string | undefined][]) {
          if (!v || v === defaults[k]) next.delete(k);
          else next.set(k, v);
        }
        if (!('page' in patch)) next.delete('page');
        return next;
      },
      { replace: true },
    );
  };
  return [values, set] as const;
}

/** A search box value that commits to the URL filters once typing pauses. */
export function useSearchFilter(current: string, commit: (value: string) => void) {
  const [search, setSearch] = useState(current);
  const debounced = useDebouncedValue(search.trim());
  const commitRef = useRef(commit);
  // Browser Back/Forward or a shared link changes the URL value: show it in the box too.
  useEffect(() => {
    setSearch((typed) => (typed.trim() === current ? typed : current));
  }, [current]);
  useEffect(() => {
    commitRef.current = commit;
  });
  useEffect(() => {
    if (debounced !== current) commitRef.current(debounced);
    // Only typing should commit; `current` changing from elsewhere must not loop back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return [search, setSearch] as const;
}
