import { useEffect, useState } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@zproo/ui';
import {
  CalendarCheck,
  ChevronDown,
  CircleUser,
  LayoutDashboard,
  LogOut,
  Wallet,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { UserAvatar } from '@/features/auth/components/UserAvatar';
import { signOut } from '@/features/auth/session';
import { hasPermission, useAuthStore } from '@/features/auth/store';

/** Header account area: login button when signed out, account menu when signed in. */
export function UserMenu({ defaultOpen = false }: { defaultOpen?: boolean } = {}) {
  // Opened by a click on the placeholder shown before this menu's code loaded: open it once
  // mounted (a tick later, so the trigger is positioned first).
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!defaultOpen) return;
    const frame = requestAnimationFrame(() => setMenuOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [defaultOpen]);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  if (status === 'loading')
    return <span aria-hidden className="h-9 w-32 animate-pulse rounded-full bg-border/60" />;
  if (!user) {
    return (
      <Button asChild size="sm">
        <Link to="/login">Login / Sign up</Link>
      </Button>
    );
  }

  const firstName = user.fullName.split(' ')[0];
  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger className="flex h-10 items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 text-sm font-semibold transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <UserAvatar name={user.fullName} src={user.avatarUrl} size={32} />
        <span className="max-w-28 truncate">{firstName}</span>
        <ChevronDown aria-hidden className="size-4 text-muted" />
        <span className="sr-only">Account menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <p className="truncate text-sm font-bold">{user.fullName}</p>
          <p className="truncate text-xs font-normal text-muted">{user.email ?? user.phone}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate('/profile')}>
          <CircleUser aria-hidden /> My profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate('/bookings')}>
          <CalendarCheck aria-hidden /> My bookings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate('/wallet')}>
          <Wallet aria-hidden /> ZPROO Wallet
        </DropdownMenuItem>
        {hasPermission(user, 'admin:access') && (
          <DropdownMenuItem onSelect={() => void navigate('/admin')}>
            <LayoutDashboard aria-hidden /> Admin panel
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void signOut().finally(() => navigate('/'));
          }}
        >
          <LogOut aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
