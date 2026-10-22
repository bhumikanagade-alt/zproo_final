import type { PlatformSettings, ServiceType } from '@zproo/types';
import { Button, Card, Input, Skeleton } from '@zproo/ui';
import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Seo } from '@/components/seo/Seo';
import { fieldErrors, useAdminMutation, useAdminSettings } from '@/features/admin/api';
import { SERVICE_LABELS, SERVICE_ORDER } from '@/features/admin/format';
import { ConfirmDialog, ErrorState, Field, PageHeader, selectClass, Toggle } from '@/features/admin/ui';
import { hasPermission, useAuthStore } from '@/features/auth/store';
import { ApiClientError } from '@/services/http';
import { env } from '@/lib/env';

export default function AdminSettingsPage() {
  const query = useAdminSettings();
  return (
    <div className="space-y-6">
      <Seo title="Settings · Admin" noIndex />
      <PageHeader icon={Settings} title="Settings" description="Platform-wide switches, fees and policies." />
      {query.isError && <ErrorState error={query.error} />}
      {query.data ? <SettingsForm initial={query.data} /> : !query.isError && <Skeleton className="h-96" />}
    </div>
  );
}

/** A number box you can clear while typing (it restores the last valid value when you leave it empty). */
function NumInput({ id, value, onValue, ...rest }: { id: string; value: number; onValue: (n: number) => void; min?: string; max?: string; step?: string; disabled?: boolean }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((t) => (t !== '' && Number(t) === value ? t : String(value)));
  }, [value]);
  return (
    <Input
      id={id}
      type="number"
      {...rest}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        if (e.target.value !== '') onValue(Number(e.target.value));
      }}
      onBlur={() => text === '' && setText(String(value))}
    />
  );
}

const SOON = 'Coming soon: this value is saved but customers are not charged or shown it yet.';

function SettingsForm({ initial }: { initial: PlatformSettings }) {
  const user = useAuthStore((s) => s.user);
  const canEdit = hasPermission(user, 'settings:manage');
  // `base` is what the form was last in sync with. The form is NOT rebuilt when fresh data arrives,
  // so edits are never wiped by a window refocus or another admin saving.
  const [base, setBase] = useState(initial);
  const [s, setS] = useState(initial);
  const [confirmRisky, setConfirmRisky] = useState(false);
  const save = useAdminMutation<Partial<PlatformSettings>>('patch', '/settings', { success: 'Settings saved', onSuccess: () => setConfirmRisky(false) });
  const changedElsewhere = JSON.stringify(initial) !== JSON.stringify(base);
  const untouched = JSON.stringify(s) === JSON.stringify(base);
  useEffect(() => {
    // Nothing edited here: quietly follow the saved settings.
    if (changedElsewhere && untouched) {
      setBase(initial);
      setS(initial);
    }
  }, [changedElsewhere, untouched, initial]);
  const regenerate = useAdminMutation('post', '/demo/regenerate', { success: 'New sample data generated' });
  const reset = useAdminMutation('post', '/demo/reset', { success: 'Admin data reset', onSuccess: () => setConfirmReset(false) });
  const [confirmReset, setConfirmReset] = useState(false);
  const errors = fieldErrors(save.error);
  // Errors by full path ("announcement.text"), so a link error does not appear under the Message box.
  const pathError = (path: string) => (save.error instanceof ApiClientError ? save.error.details.find((d) => d.path.replace(/^body\./, '') === path)?.message : undefined);
  const dirty = !untouched;
  const turnsOffSales = (!base.maintenanceMode && s.maintenanceMode) || s.disabledServices.some((x) => !base.disabledServices.includes(x));
  const patch = (p: Partial<PlatformSettings>) => setS((prev) => ({ ...prev, ...p }));
  const rupees = (paise: number) => String(paise / 100);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Maintenance mode and pausing a service stop customers booking: ask first.
        if (turnsOffSales) setConfirmRisky(true);
        else save.mutate(s, { onSuccess: () => setBase(s) });
      }}
      className="space-y-6"
    >
      <fieldset disabled={!canEdit} className="space-y-6">
        {!canEdit && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Only a super admin can change settings. You can view them.</p>}
        {changedElsewhere && !untouched && (
          <p className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            These settings were changed elsewhere while you were editing.
            <button type="button" className="font-bold underline" onClick={() => { setBase(initial); setS(initial); }}>
              Load the latest (discards your edits)
            </button>
          </p>
        )}

        <Card className="space-y-5 p-5">
          <h2 className="font-bold">Website</h2>
          <Toggle
            checked={s.maintenanceMode}
            onChange={(v) => patch({ maintenanceMode: v })}
            label="Maintenance mode"
            description="Customers see a maintenance notice and cannot start new bookings. Staff can still use the admin panel."
          />
          <Toggle
            checked={s.announcement.enabled}
            onChange={(v) => patch({ announcement: { ...s.announcement, enabled: v } })}
            label="Announcement bar"
            description="A message at the top of every page."
          />
          {s.announcement.enabled && (
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem_12rem]">
              <Field label="Message" error={pathError('announcement.text')}>
                {(id) => <Input id={id} value={s.announcement.text} maxLength={200} onChange={(e) => patch({ announcement: { ...s.announcement, text: e.target.value } })} />}
              </Field>
              <Field label="Style">
                {(id) => (
                  <select id={id} className={`${selectClass} w-full`} value={s.announcement.tone} onChange={(e) => patch({ announcement: { ...s.announcement, tone: e.target.value as 'info' } })}>
                    <option value="info">Info</option>
                    <option value="success">Promotion</option>
                    <option value="warning">Warning</option>
                  </select>
                )}
              </Field>
              <Field label="Link (optional)" error={pathError('announcement.linkPath')}>
                {(id) => <Input id={id} value={s.announcement.linkPath ?? ''} placeholder="/offers" onChange={(e) => patch({ announcement: { ...s.announcement, linkPath: e.target.value || null } })} />}
              </Field>
            </div>
          )}
          <fieldset>
            <legend className="text-sm font-semibold">Services on sale</legend>
            <p className="mb-2 text-xs text-muted">Switch a service off to pause new bookings for it (existing bookings are unaffected).</p>
            <div className="flex flex-wrap gap-2">
              {SERVICE_ORDER.map((svc: ServiceType) => {
                const on = !s.disabledServices.includes(svc);
                return (
                  <label key={svc} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary-light has-[:checked]:text-primary">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => patch({ disabledServices: on ? [...s.disabledServices, svc] : s.disabledServices.filter((x) => x !== svc) })}
                    />
                    {SERVICE_LABELS[svc]} {on ? '· on' : '· off'}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Card>

        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Brand & support</h2>
          <Field label="Site name" error={errors.siteName}>
            {(id) => <Input id={id} value={s.siteName} onChange={(e) => patch({ siteName: e.target.value })} />}
          </Field>
          <Field label="Support email" error={errors.supportEmail}>
            {(id) => <Input id={id} type="email" value={s.supportEmail} onChange={(e) => patch({ supportEmail: e.target.value })} />}
          </Field>
          <Field label="Support phone" error={errors.supportPhone}>
            {(id) => <Input id={id} value={s.supportPhone} onChange={(e) => patch({ supportPhone: e.target.value })} />}
          </Field>
        </Card>

        <Card className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <h2 className="font-bold sm:col-span-2 lg:col-span-3">Fees & policies</h2>
          <Field label="Convenience fee (₹ per booking)" hint={SOON} error={errors.convenienceFeePaise}>
            {(id) => <NumInput id={id} min="0" step="1" disabled value={Number(rupees(s.convenienceFeePaise))} onValue={(n) => patch({ convenienceFeePaise: Math.round(n * 100) })} />}
          </Field>
          <Field label="GST on fees (%)" hint={SOON} error={errors.gstPercent}>
            {(id) => <NumInput id={id} min="0" max="28" step="0.5" disabled value={s.gstPercent} onValue={(n) => patch({ gstPercent: n })} />}
          </Field>
          <Field label="Seat hold (minutes)" hint="How long seats stay reserved while paying (applies to new bookings)." error={errors.bookingHoldMinutes}>
            {(id) => <NumInput id={id} min="5" max="60" value={s.bookingHoldMinutes} onValue={(n) => patch({ bookingHoldMinutes: n })} />}
          </Field>
          <Field label="Free cancellation (hours before)" hint={SOON} error={errors.freeCancellationHours}>
            {(id) => <NumInput id={id} min="0" max="168" disabled value={s.freeCancellationHours} onValue={(n) => patch({ freeCancellationHours: n })} />}
          </Field>
          <Field label="Referral bonus (₹)" hint={SOON} error={errors.referralBonusPaise}>
            {(id) => <NumInput id={id} min="0" disabled value={Number(rupees(s.referralBonusPaise))} onValue={(n) => patch({ referralBonusPaise: Math.round(n * 100) })} />}
          </Field>
          <div className="self-end pb-2 sm:col-span-2 lg:col-span-3">
            <Toggle checked={s.walletEnabled} onChange={(v) => patch({ walletEnabled: v })} disabled label="ZPROO Wallet (coming soon)" description="Customer wallet payments and cashback are not connected yet; this switch does nothing for now." />
          </div>
        </Card>

        {env.staticMode && (
          <Card className="space-y-4 p-5">
            <h2 className="font-bold">Demo data</h2>
            <Toggle
              checked={s.showDemoData}
              onChange={(v) => patch({ showDemoData: v })}
              label="Include sample data"
              description="Mix six months of generated bookings and customers into the panel, so reports have something to show. Real bookings made in this browser are always included."
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => regenerate.mutate(undefined)} disabled={regenerate.isPending}>
                Generate new sample data
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmReset(true)}>
                Reset admin panel
              </Button>
            </div>
          </Card>
        )}
      </fieldset>

      {canEdit && (
        <div className="sticky bottom-4 z-10 flex justify-end gap-2 rounded-card border border-border bg-card/95 p-3 shadow-raised backdrop-blur">
          <span className="mr-auto self-center px-2 text-sm text-muted">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
          <Button type="button" variant="outline" disabled={!dirty} onClick={() => setS(base)}>
            Discard
          </Button>
          <Button type="submit" disabled={!dirty || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmRisky}
        onOpenChange={setConfirmRisky}
        title={s.maintenanceMode && !base.maintenanceMode ? 'Switch on maintenance mode?' : 'Pause these services?'}
        description="Customers will not be able to start new bookings until you switch this back. Existing bookings are not affected."
        confirmLabel="Yes, save"
        destructive
        pending={save.isPending}
        onConfirm={() => save.mutate(s, { onSuccess: () => setBase(s) })}
      />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset the admin panel?"
        description="Settings, coupons, offers, tickets and every change made in the panel go back to their defaults. Customer bookings are kept."
        confirmLabel="Reset"
        destructive
        pending={reset.isPending}
        onConfirm={() => reset.mutate(undefined)}
      />
    </form>
  );
}
