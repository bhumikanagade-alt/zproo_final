import { cn, Sheet, SheetContent } from '@zproo/ui';
import { DialogTitle } from '@zproo/ui';
import { ArrowLeft, LogOut, Menu } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { NotificationsProvider } from '@/components/feedback/Notifications';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Seo } from '@/components/seo/Seo';
import { ADMIN_GROUPS, ADMIN_NAV } from '@/config/navigation';
import { UserAvatar } from '@/features/auth/components/UserAvatar';
import { signOut } from '@/features/auth/session';
import { hasPermission, useAuthStore } from '@/features/auth/store';
import { humanize } from '@/features/admin/format';
import { env } from '@/lib/env';

/**
 * Admin shell (its own lazy chunk). Sections are shown only to staff holding their permission;
 * the API (or the in-browser demo engine) checks the same permission on every request.
 */
export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const current = ADMIN_NAV.find((n) => (n.segment ? location.pathname.startsWith(n.path) : location.pathname === '/admin'));

  return (
    <NotificationsProvider>
      <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[16rem_1fr]">
        <Seo title="Admin" noIndex />
        <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2">
          Skip to content
        </a>
        <aside className="hidden border-r border-border bg-card lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
          <Sidebar />
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur sm:px-6 lg:px-8">
            <button
              type="button"
              className="-ml-1 grid size-10 place-items-center rounded-full hover:bg-background lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open admin menu"
            >
              <Menu aria-hidden className="size-5" />
            </button>
            <span className="truncate text-sm font-bold text-muted">{current?.group ?? 'Admin'}</span>
            <span className="text-muted" aria-hidden>
              /
            </span>
            <span className="truncate text-sm font-bold">{current?.label ?? 'Admin'}</span>
            <div className="ml-auto flex items-center gap-3">
              {env.staticMode && (
                <span
                  className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900 sm:inline"
                  title="Running in the browser with sample data. Changes are saved in this browser only."
                >
                  Demo mode
                </span>
              )}
              {user && (
                <div className="flex items-center gap-2">
                  <UserAvatar name={user.fullName} src={user.avatarUrl} size={32} />
                  <div className="hidden leading-tight sm:block">
                    <div className="text-sm font-bold">{user.fullName}</div>
                    <div className="text-[11px] text-muted">{user.roles.filter((r) => r !== 'USER').map(humanize).join(', ')}</div>
                  </div>
                </div>
              )}
            </div>
          </header>
          <main id="admin-main" className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent className="left-0 right-auto max-w-xs" aria-describedby={undefined}>
            <DialogTitle className="sr-only">Admin menu</DialogTitle>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </NotificationsProvider>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const visible = ADMIN_NAV.filter((n) => hasPermission(user, n.permission));

  return (
    <>
      <div className={cn('flex items-center justify-between gap-3 px-5 py-4', onNavigate && 'pr-14')}>
        <Link to="/admin" aria-label="Admin dashboard" onClick={onNavigate}>
          <Logo height={28} />
        </Link>
        <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Admin</span>
      </div>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-4">
        {ADMIN_GROUPS.map((group) => {
          const items = visible.filter((n) => n.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="mb-3">
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted">{group}</p>
              <ul className="space-y-0.5">
                {items.map(({ label, path, icon: Icon }) => (
                  <li key={path}>
                    <NavLink
                      to={path}
                      end={path === '/admin'}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                          isActive ? 'bg-primary-light text-primary' : 'text-foreground/75 hover:bg-background hover:text-foreground',
                        )
                      }
                    >
                      <Icon aria-hidden className="size-4" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-border px-3 py-3">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-background hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" /> Back to website
        </Link>
        <button
          type="button"
          onClick={() => void signOut().finally(() => navigate('/'))}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-background hover:text-foreground"
        >
          <LogOut aria-hidden className="size-4" /> Sign out
        </button>
      </div>
    </>
  );
}
