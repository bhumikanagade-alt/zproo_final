import type { AdminCollectionName, AdminCollections } from '@zproo/types';
import { Button, Input } from '@zproo/ui';
import { Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Seo } from '@/components/seo/Seo';
import { fieldErrors, useAdminGet, useAdminMutation } from './api';
import { count, humanize } from './format';
import {
  ConfirmDialog,
  DataTable,
  Drawer,
  Field,
  FilterSelect,
  PageHeader,
  Pagination,
  SearchBox,
  selectClass,
  StatCard,
  TextArea,
  Toggle,
  Toolbar,
  type Column,
} from './ui';

/**
 * One generic screen for the panel's editable collections (coupons, offers, notifications,
 * partners, drivers): searchable table, status filter, create/edit drawer with server-side
 * validation messages shown under each field, and delete with confirmation.
 */

export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'percent' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'datetime';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: readonly { value: string; label: string }[];
  hint?: ReactNode;
  placeholder?: string;
  /** Full width in the two-column form. */
  wide?: boolean;
  /** Empty input → null (instead of omitted). */
  nullable?: boolean;
  /** Only show when this returns true for the current form values. */
  when?: (values: FormValues) => boolean;
}

export type FormValues = Record<string, string | boolean | string[]>;

export interface CollectionConfig<K extends AdminCollectionName> {
  name: K;
  title: string;
  singular: string;
  icon: LucideIcon;
  description: string;
  columns: Column<AdminCollections[K]>[];
  fields: FieldDef[];
  /** Defaults for a new document (form values). */
  defaults: FormValues;
  search: (doc: AdminCollections[K]) => (string | null | undefined)[];
  filter?: { label: string; key: keyof AdminCollections[K] & string; options: readonly string[] };
  stats?: (items: AdminCollections[K][]) => { label: string; value: string }[];
  /** Map a stored document to form fields that differ from its own (e.g. split a value). */
  prepare?: (doc: AdminCollections[K]) => Record<string, unknown>;
  /** Adjust the request body before sending (e.g. derived fields). */
  transform?: (body: Record<string, unknown>, values: FormValues) => Record<string, unknown>;
  canDelete?: (doc: AdminCollections[K]) => boolean;
  /** Extra actions in the edit drawer footer. */
  drawerExtras?: (doc: AdminCollections[K]) => ReactNode;
}

const PAGE = 20;

function toForm(fields: FieldDef[], doc: Record<string, unknown>): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    const v = doc[f.name];
    switch (f.type) {
      case 'checkbox':
        out[f.name] = Boolean(v);
        break;
      case 'multiselect':
        out[f.name] = Array.isArray(v) ? (v as string[]) : [];
        break;
      case 'money':
        out[f.name] = v === null || v === undefined ? '' : String(Number(v) / 100);
        break;
      case 'date':
        out[f.name] = typeof v === 'string' ? v.slice(0, 10) : '';
        break;
      case 'datetime':
        out[f.name] = typeof v === 'string' ? toLocalInput(v) : '';
        break;
      default:
        out[f.name] = v === null || v === undefined ? '' : String(v);
    }
  }
  return out;
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

function toBody(fields: FieldDef[], values: FormValues): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.when && !f.when(values)) continue;
    const v = values[f.name];
    if (f.type === 'checkbox' || f.type === 'multiselect') {
      body[f.name] = v;
      continue;
    }
    const s = String(v ?? '').trim();
    if (s === '') {
      // Required text is sent empty so the server explains what is missing.
      if (f.nullable) body[f.name] = null;
      else if (f.type === 'text' || f.type === 'textarea') body[f.name] = '';
      continue;
    }
    if (f.type === 'number' || f.type === 'percent') body[f.name] = Number(s);
    else if (f.type === 'money') body[f.name] = Math.round(Number(s) * 100);
    else if (f.type === 'datetime') body[f.name] = new Date(s).toISOString();
    else body[f.name] = s;
  }
  return body;
}

export function CollectionPage<K extends AdminCollectionName>({ config }: { config: CollectionConfig<K> }) {
  type Doc = AdminCollections[K];
  const query = useAdminGet<Doc[]>(`/${config.name}`);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Doc | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Doc | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (d) =>
        (!filter || !config.filter || String(d[config.filter.key]) === filter) &&
        (!q || config.search(d).some((v) => v?.toLowerCase().includes(q))),
    );
  }, [query.data, search, filter, config]);

  const remove = useAdminMutation<{ id: string }>('delete', (v) => `/${config.name}/${encodeURIComponent(v.id)}`, {
    success: `${config.singular} deleted`,
    onSuccess: () => setDeleting(null),
  });

  const columns: Column<Doc>[] = [
    ...config.columns,
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (d) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" aria-label={`Edit ${config.singular.toLowerCase()}`} onClick={(e) => { e.stopPropagation(); setEditing(d); }}>
            <Pencil aria-hidden />
          </Button>
          {(config.canDelete?.(d) ?? true) && (
            <Button size="icon" variant="ghost" aria-label={`Delete ${config.singular.toLowerCase()}`} onClick={(e) => { e.stopPropagation(); setDeleting(d); }}>
              <Trash2 aria-hidden className="text-danger" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Seo title={`${config.title} · Admin`} noIndex />
      <PageHeader
        icon={config.icon}
        title={config.title}
        description={config.description}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden /> New {config.singular.toLowerCase()}
          </Button>
        }
      />
      {config.stats && query.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {config.stats(query.data).map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      )}
      <Toolbar>
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={`Search ${config.title.toLowerCase()}`}
          label={`Search ${config.title}`}
        />
        {config.filter && (
          <FilterSelect
            label={config.filter.label}
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setPage(1);
            }}
            allLabel={`All ${config.filter.label.toLowerCase()}`}
            options={config.filter.options}
          />
        )}
      </Toolbar>
      <DataTable
        rows={query.data ? rows.slice((page - 1) * PAGE, page * PAGE) : undefined}
        loading={query.isPending}
        error={query.isError ? query.error : undefined}
        rowKey={(d) => d.id}
        onRowClick={(d) => setEditing(d)}
        rowLabel={() => `Edit ${config.singular.toLowerCase()}`}
        columns={columns}
        empty={search || filter ? 'Nothing matches.' : `No ${config.title.toLowerCase()} yet.`}
        footer={query.data && <Pagination page={page} limit={PAGE} total={rows.length} onPage={setPage} />}
      />
      {editing && <EditDrawer config={config} doc={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete this ${config.singular.toLowerCase()}?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate({ id: deleting.id })}
      />
      <p className="text-xs text-muted">{count(query.data?.length ?? 0)} in total.</p>
    </div>
  );
}

function EditDrawer<K extends AdminCollectionName>({
  config,
  doc,
  onClose,
}: {
  config: CollectionConfig<K>;
  doc: AdminCollections[K] | null;
  onClose: () => void;
}) {
  const [values, setValues] = useState<FormValues>(() =>
    doc ? toForm(config.fields, config.prepare ? config.prepare(doc) : (doc as unknown as Record<string, unknown>)) : { ...config.defaults },
  );
  const save = useAdminMutation<Record<string, unknown>>(doc ? 'patch' : 'post', doc ? `/${config.name}/${encodeURIComponent(doc.id)}` : `/${config.name}`, {
    success: doc ? `${config.singular} saved` : `${config.singular} created`,
    onSuccess: onClose,
  });
  const errors = fieldErrors(save.error);
  const set = (name: string, v: FormValues[string]) => setValues((prev) => ({ ...prev, [name]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = toBody(config.fields, values);
    save.mutate(config.transform ? config.transform(body, values) : body);
  };

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      title={doc ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
      footer={
        <>
          {doc && config.drawerExtras?.(doc)}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="collection-form" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : doc ? 'Save changes' : `Create ${config.singular.toLowerCase()}`}
          </Button>
        </>
      }
    >
      <form id="collection-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        {config.fields
          .filter((f) => !f.when || f.when(values))
          .map((f) => (
            <FieldInput key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={(v) => set(f.name, v)} />
          ))}
      </form>
    </Drawer>
  );
}

function FieldInput({
  field: f,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  value: FormValues[string] | undefined;
  error?: string;
  onChange: (v: FormValues[string]) => void;
}) {
  const wide = f.wide || f.type === 'textarea' || f.type === 'multiselect' || f.type === 'checkbox';
  if (f.type === 'checkbox') {
    return (
      <div className="sm:col-span-2">
        <Toggle checked={Boolean(value)} onChange={onChange} label={f.label} description={f.hint} />
      </div>
    );
  }
  if (f.type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="space-y-1.5 sm:col-span-2">
        <legend className="text-sm font-semibold">{f.label}</legend>
        <div className="flex flex-wrap gap-2">
          {f.options?.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary-light has-[:checked]:text-primary">
              <input
                type="checkbox"
                className="sr-only"
                checked={selected.includes(o.value)}
                onChange={(e) => onChange(e.target.checked ? [...selected, o.value] : selected.filter((x) => x !== o.value))}
              />
              {o.label}
            </label>
          ))}
        </div>
        {error ? <p className="text-xs font-semibold text-danger">{error}</p> : f.hint && <p className="text-xs text-muted">{f.hint}</p>}
      </fieldset>
    );
  }
  const str = typeof value === 'string' ? value : '';
  return (
    <Field label={f.label} hint={f.hint} error={error} className={wide ? 'sm:col-span-2' : undefined}>
      {(id) =>
        f.type === 'textarea' ? (
          <TextArea id={id} value={str} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} aria-invalid={Boolean(error)} />
        ) : f.type === 'select' ? (
          <select id={id} value={str} onChange={(e) => onChange(e.target.value)} className={`${selectClass} w-full`} aria-invalid={Boolean(error)}>
            {f.nullable && <option value="">—</option>}
            {f.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="relative">
            {f.type === 'money' && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">₹</span>}
            <Input
              id={id}
              value={str}
              onChange={(e) => onChange(e.target.value)}
              placeholder={f.placeholder}
              aria-invalid={Boolean(error)}
              type={f.type === 'date' ? 'date' : f.type === 'datetime' ? 'datetime-local' : f.type === 'text' ? 'text' : 'number'}
              inputMode={f.type === 'money' || f.type === 'number' || f.type === 'percent' ? 'decimal' : undefined}
              step={f.type === 'money' ? '0.01' : f.type === 'percent' ? '1' : undefined}
              className={f.type === 'money' ? 'pl-8' : undefined}
            />
            {f.type === 'percent' && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>}
          </div>
        )
      }
    </Field>
  );
}

export const options = (values: readonly string[], label: (v: string) => string = humanize) => values.map((value) => ({ value, label: label(value) }));
