import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
} from '@zproo/ui';
import {
  Camera,
  CalendarDays,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  MonitorSmartphone,
  Phone,
} from 'lucide-react';
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import type { PublicUser } from '@zproo/types';
import type { z } from 'zod';
import { Seo } from '@/components/seo/Seo';
import { authApi } from '@/features/auth/api';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { UserAvatar } from '@/features/auth/components/UserAvatar';
import { errorMessage } from '@/features/auth/errors';
import { maskPhone } from '@/features/auth/redirect';
import { signOut } from '@/features/auth/session';
import { hasPermission, useAuthStore } from '@/features/auth/store';
import { changePasswordSchema, updateProfileSchema } from '@zproo/validation';

const memberSince = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

type ProfileForm = z.input<typeof updateProfileSchema>;

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  if (!user) return null;

  const staffRoles = user.roles.filter((r) => r !== 'USER');
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <Seo title="My profile" noIndex />
      <section className="flex items-center gap-4">
        <ProfileAvatar user={user} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
            {user.fullName}
          </h1>
          <p className="text-sm text-muted">
            Member since {memberSince.format(new Date(user.createdAt))}
          </p>
          {staffRoles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {staffRoles.map((role) => (
                <Badge key={role} variant="soft">
                  {role.replace(/_/g, ' ').toLowerCase()}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </section>

      <EditProfile user={user} />

      <Card>
        <CardHeader>
          <CardTitle>Contact & sign-in</CardTitle>
          <CardDescription>How you log in and where we send tickets.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <DetailRow
            icon={<Phone aria-hidden />}
            label="Mobile number"
            value={user.phone ? maskPhone(user.phone) : 'Not added'}
            verified={user.phone ? user.phoneVerified : undefined}
          />
          <DetailRow
            icon={<Mail aria-hidden />}
            label="Email"
            value={user.email ?? 'Not added'}
            verified={user.email ? user.emailVerified : undefined}
          />
          <DetailRow
            icon={<KeyRound aria-hidden />}
            label="Password"
            value={user.hasPassword ? 'Set' : 'Not set — you log in with OTP'}
            action={<PasswordAction hasPassword={user.hasPassword} />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Sign out here, or everywhere if you lost a device.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {hasPermission(user, 'admin:access') && (
            <Button asChild variant="secondary">
              <Link to="/admin">
                <LayoutDashboard aria-hidden /> Admin panel
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => void signOut().finally(() => navigate('/'))}>
            <LogOut aria-hidden /> Sign out
          </Button>
          <SignOutEverywhere
            onDone={() =>
              void navigate('/login', {
                state: { notice: 'You have been signed out of all devices.' },
              })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileAvatar({ user }: { user: PublicUser }) {
  const setUser = useAuthStore((s) => s.setUser);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (avatarUrl: string | null) =>
      authApi.updateMe({
        fullName: user.fullName,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        state: user.state,
        avatarUrl,
      }),
    onSuccess: setUser,
    onError: (err) => setError(errorMessage(err)),
  });

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please choose a JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be 5 MB or smaller.');
      return;
    }
    try {
      const dataUrl = await compressAvatar(file);
      mutation.mutate(dataUrl);
    } catch {
      setError('We could not process that image. Please try another photo.');
    }
  };

  return (
    <div className="relative shrink-0">
      <UserAvatar name={user.fullName} src={user.avatarUrl} size={72} />
      <button
        type="button"
        aria-label="Change profile photo"
        title="Change profile photo"
        disabled={mutation.isPending}
        onClick={() => fileInput.current?.click()}
        className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-2 border-card bg-primary text-white shadow-md transition-transform hover:scale-105 disabled:opacity-60"
      >
        <Camera className="size-4" aria-hidden />
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onFile}
      />
      {error && <p className="absolute left-0 top-[82px] w-64 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}

async function compressAvatar(file: File): Promise<string> {
  const source = await createImageBitmap(file);
  const maxSize = 320;
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  const dataUrl = canvas.toDataURL('image/webp', 0.78);
  if (dataUrl.length > 85_000) {
    const smaller = document.createElement('canvas');
    smaller.width = 240;
    smaller.height = 240;
    const smallerContext = smaller.getContext('2d');
    if (!smallerContext) throw new Error('Canvas unavailable');
    smallerContext.drawImage(canvas, 0, 0, 240, 240);
    return smaller.toDataURL('image/webp', 0.65);
  }
  return dataUrl;
}

function EditProfile({ user }: { user: PublicUser }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [saved, setSaved] = useState(false);
  const form = useForm<ProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    values: {
      fullName: user.fullName,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      state: user.state,
      avatarUrl: user.avatarUrl,
    },
  });
  const mutation = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (updated) => {
      setUser(updated);
      setSaved(true);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>
          Keep your personal details accurate for a smoother ZPROO GO booking experience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="space-y-5"
          onSubmit={form.handleSubmit((values) => {
            setSaved(false);
            mutation.mutate({
              fullName: values.fullName,
              dateOfBirth: values.dateOfBirth ?? null,
              gender: values.gender ?? null,
              state: values.state ?? null,
              avatarUrl: values.avatarUrl ?? null,
            });
          })}
        >
          <FormField label="Full name" error={form.formState.errors.fullName?.message}>
            <Input className="h-11" autoComplete="name" {...form.register('fullName')} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Date of birth" error={form.formState.errors.dateOfBirth?.message}>
              <div className="relative">
                <Input
                  type="date"
                  className="h-11 pr-10"
                  max={new Date().toISOString().slice(0, 10)}
                  {...form.register('dateOfBirth')}
                />
                <CalendarDays className="pointer-events-none absolute right-3 top-3 size-5 text-muted" aria-hidden />
              </div>
            </FormField>

            <FormField label="Gender" error={form.formState.errors.gender?.message}>
              <select
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                {...form.register('gender')}
                value={form.watch('gender') ?? ''}
              >
                <option value="">Prefer not to say</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </FormField>
          </div>

          <FormField label="State" error={form.formState.errors.state?.message}>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-3 size-5 text-muted" aria-hidden />
              <select
                className="h-11 w-full appearance-none rounded-xl border border-border bg-card pl-10 pr-10 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                {...form.register('state')}
                value={form.watch('state') ?? ''}
              >
                <option value="">Select your state</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          </FormField>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={!form.formState.isDirty || mutation.isPending}
              onClick={() => form.reset({
                fullName: user.fullName,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                state: user.state,
                avatarUrl: user.avatarUrl,
              })}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !form.formState.isDirty}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
        <div className="mt-3 empty:hidden">
          {mutation.isError && <FormAlert>{errorMessage(mutation.error)}</FormAlert>}
          {saved && !form.formState.isDirty && <FormAlert tone="success">Profile saved successfully.</FormAlert>}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  icon,
  label,
  value,
  verified,
  action,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  verified?: boolean | undefined;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-light text-primary [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className="truncate font-semibold">{value}</p>
      </div>
      {verified !== undefined && (
        <Badge variant={verified ? 'success' : 'warning'}>
          {verified ? 'Verified' : 'Not verified'}
        </Badge>
      )}
      {action}
    </div>
  );
}

function PasswordAction({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  if (!hasPassword) {
    return (
      <a href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
        Set password
      </a>
    );
  }
  return (
    <>
      <Button variant="ghost" className="text-sm font-semibold text-primary" onClick={() => setOpen(true)}>
        Reset
      </Button>
      <ChangePasswordDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const form = useForm<z.input<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const mutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: async () => {
      onOpenChange(false);
      form.reset();
      await signOut();
      navigate('/login', { state: { notice: 'Password changed successfully. Please sign in again.' } });
    },
  });

  const newPassword = form.watch('newPassword') ?? '';
  const requirements = [
    ['At least 8 characters', newPassword.length >= 8],
    ['Contains a letter', /[A-Za-z]/.test(newPassword)],
    ['Contains a number', /\d/.test(newPassword)],
  ] as const;

  const field = (
    name: 'currentPassword' | 'newPassword' | 'confirmPassword',
    label: string,
    visible: boolean,
    setVisible: (value: boolean) => void,
  ) => (
    <FormField label={label} error={form.formState.errors[name]?.message}>
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          className="h-11 pr-11"
          autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
          {...form.register(name)}
        />
        <button
          type="button"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-2.5 rounded-md p-1 text-muted hover:bg-primary-light hover:text-primary"
        >
          {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
      </div>
    </FormField>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!mutation.isPending) onOpenChange(value);
      }}
    >
      <DialogContent>
        <DialogTitle>Change password</DialogTitle>
        <DialogDescription className="mt-1">
          Enter your current password and choose a new password for your ZPROO GO account.
        </DialogDescription>
        <form
          noValidate
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          {field('currentPassword', 'Current password', showCurrent, setShowCurrent)}
          {field('newPassword', 'New password', showNew, setShowNew)}

          <div className="rounded-xl bg-primary-light/60 p-3">
            <p className="mb-2 text-xs font-bold text-foreground">Password requirements</p>
            <ul className="space-y-1 text-xs text-muted">
              {requirements.map(([text, valid]) => (
                <li key={text} className={valid ? 'font-semibold text-success' : ''}>
                  {valid ? '✓' : '○'} {text}
                </li>
              ))}
            </ul>
          </div>

          {field('confirmPassword', 'Confirm new password', showConfirm, setShowConfirm)}

          {mutation.isError && <FormAlert>{errorMessage(mutation.error)}</FormAlert>}

          <div className="flex justify-end gap-3 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={mutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Changing…' : 'Change password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SignOutEverywhere({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        className="text-danger hover:bg-danger/5"
        onClick={() => setOpen(true)}
      >
        <MonitorSmartphone aria-hidden /> Sign out of all devices
      </Button>
      <DialogContent>
        <DialogTitle>Sign out of all devices?</DialogTitle>
        <DialogDescription className="mt-2">
          You'll be signed out everywhere, including this browser. Your bookings and wallet are not
          affected.
        </DialogDescription>
        <div className="mt-6 flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              setPending(true);
              void signOut({ everywhere: true }).finally(() => {
                setPending(false);
                setOpen(false);
                onDone();
              });
            }}
          >
            {pending ? 'Signing out…' : 'Sign out everywhere'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
