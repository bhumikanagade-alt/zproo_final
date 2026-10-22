import { Button, DialogTitle, Separator, Sheet, SheetContent } from '@zproo/ui';
import { BadgePercent, CircleHelp, LogIn, LogOut } from 'lucide-react';
import { useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { SERVICES } from '@/config/services';
import { UserAvatar } from '@/features/auth/components/UserAvatar';
import { signOut } from '@/features/auth/session';
import { useAuthStore } from '@/features/auth/store';

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMenu({ open, onOpenChange }: MobileMenuProps) {
  const close = () => onOpenChange(false);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={panelRef}
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          panelRef.current?.focus();
        }}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Logo height={30} />
          <DialogTitle className="sr-only">Menu</DialogTitle>
        </div>

        <div className="flex flex-col gap-5 p-5">
          {user ? (
            <div className="flex items-center gap-3 rounded-2xl bg-background p-3">
              <UserAvatar
                name={user.fullName}
                src={user.avatarUrl}
                size={44}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{user.fullName}</p>

                <Link
                  to="/profile"
                  onClick={close}
                  className="text-sm font-semibold text-primary"
                >
                  View profile
                </Link>
              </div>
            </div>
          ) : (
            <Button asChild size="lg" className="w-full">
              <Link to="/login" onClick={close}>
                <LogIn aria-hidden />
                Login / Sign up
              </Link>
            </Button>
          )}

          <nav aria-label="Services">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
              Book travel
            </p>

            <ul className="grid grid-cols-3 gap-2">
              {SERVICES.map(({ label, path, icon: Icon }) => (
                <li key={path}>
                  <Link
                    to={path}
                    onClick={close}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border px-1 py-3 text-xs font-semibold transition-colors hover:border-primary/40 hover:bg-primary-light"
                  >
                    <Icon aria-hidden className="size-5 text-primary" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Separator />

          <ul className="flex flex-col gap-1 text-sm font-semibold">
            <li>
              <Link
                to="/offers"
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-background"
              >
                <BadgePercent aria-hidden className="size-5 text-primary" />
                Offers
              </Link>
            </li>

            <li>
              <Link
                to="/help"
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-background"
              >
                <CircleHelp aria-hidden className="size-5 text-primary" />
                Help & support
              </Link>
            </li>

            {user && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    void signOut().finally(() => navigate('/'));
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-background"
                >
                  <LogOut aria-hidden className="size-5 text-primary" />
                  Sign out
                </button>
              </li>
            )}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}