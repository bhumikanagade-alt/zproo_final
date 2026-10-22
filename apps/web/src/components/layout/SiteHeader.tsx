import { Button, cn } from '@zproo/ui';
import {
  BadgePercent,
  CircleHelp,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import {
  Link,
  NavLink,
} from 'react-router';

import { Logo } from '@/components/brand/Logo';
import { SERVICES } from '@/config/services';
import { useHotkey } from '@/hooks/useHotkey';

import { useIdleReady } from '@/hooks/useIdleReady';
import { useAuthStore } from '@/features/auth/store';
import { UserAvatar } from '@/features/auth/components/UserAvatar';
import { Bell, ChevronDown } from 'lucide-react';

import { LanguageSelect } from './LanguageSelect';

/*
 * Menus and dialogs load after the page is interactive (or the moment someone reaches for them):
 * they bring Radix menus and positioning code that the first paint does not need.
 */
const MobileMenu = lazy(() => import('./MobileMenu').then((m) => ({ default: m.MobileMenu })));
const QuickSearchDialog = lazy(() => import('./QuickSearchDialog').then((m) => ({ default: m.QuickSearchDialog })));
const NotificationBell = lazy(() => import('./NotificationBell').then((m) => ({ default: m.NotificationBell })));
const UserMenu = lazy(() => import('./UserMenu').then((m) => ({ default: m.UserMenu })));

const utilityLink =
  'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-background hover:text-foreground';

export function SiteHeader() {
  const [searchOpen, setSearchOpen] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [showOfferBanner, setShowOfferBanner] = useState(true);
  const [menusReady, readyNow] = useIdleReady();
  const [openOnLoad, setOpenOnLoad] = useState<'bell' | 'user' | null>(null);
  const loadMenus = (which: 'bell' | 'user') => {
    setOpenOnLoad(which);
    readyNow();
  };
  // Once opened, dialogs stay mounted so closing animates and reopening is instant.
  const searchMounted = useStickyTrue(searchOpen);
  const menuMounted = useStickyTrue(menuOpen);

  useHotkey(
    (e) =>
      (e.key === 'k' &&
        (e.metaKey || e.ctrlKey)) ||
      e.key === '/',
    () => setSearchOpen(true),
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      {/* Offer Banner */}
      {showOfferBanner && (
        <div className="relative flex min-h-9 w-full items-center justify-center gap-3 bg-primary px-14 py-2 text-center text-xs font-bold text-primary-foreground">
          <span>10% OFF on eligible ZPROO BUS app bookings</span>

          <Link
            to="/install-app"
            className="rounded-full bg-primary-foreground px-3 py-1 text-xs font-extrabold text-primary transition-all hover:scale-105 hover:shadow-md"
          >
            Install App
          </Link>

          <button
            type="button"
            onClick={() => setShowOfferBanner(false)}
            aria-label="Close offer banner"
            className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-primary-foreground transition-colors hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      )}

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <div className="mx-auto flex h-(--header-height) max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          aria-label="ZPROO GO home"
          className="shrink-0 rounded-lg"
        >
          <Logo
            height={32}
            priority
          />
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Desktop Search */}
          <button
            type="button"
            onClick={() =>
              setSearchOpen(true)
            }
            className="hidden h-9 items-center gap-2 rounded-full border border-border bg-background pl-3 pr-2 text-sm text-muted transition-colors hover:border-foreground/30 md:inline-flex"
          >
            <Search
              aria-hidden
              className="size-4"
            />

            <span className="w-40 text-left lg:w-52">
              Search flights, buses…
            </span>

            <kbd className="rounded-md border border-border bg-card px-1.5 text-[11px] font-semibold">
              Ctrl K
            </kbd>
          </button>

          {/* Mobile Search */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() =>
              setSearchOpen(true)
            }
            aria-label="Search"
          >
            <Search
              aria-hidden
              className="size-5!"
            />
          </Button>

          {/* Offers */}
          <NavLink
            to="/offers"
            className={cn(
              utilityLink,
              'hidden lg:inline-flex',
            )}
          >
            <BadgePercent
              aria-hidden
              className="size-4 text-primary"
            />
            Offers
          </NavLink>

          {/* Help */}
          <NavLink
            to="/help"
            className={cn(
              utilityLink,
              'hidden lg:inline-flex',
            )}
          >
            <CircleHelp
              aria-hidden
              className="size-4 text-primary"
            />
            Help
          </NavLink>

          {/* Language */}
          <LanguageSelect className="hidden lg:inline-flex" />

          {/*
           * Notification Bell
           *
           * The bell itself stays visible regardless
           * of whether the user is logged in.
           *
           * NotificationBell decides whether the
           * Booking Confirmed item should be displayed.
           */}
          <div className="hidden md:block">
            {menusReady ? (
              <Suspense fallback={<BellButton onIntent={() => loadMenus('bell')} />}>
                <NotificationBell defaultOpen={openOnLoad === 'bell'} />
              </Suspense>
            ) : (
              <BellButton onIntent={() => loadMenus('bell')} />
            )}
          </div>

          {/* Existing Profile / User Menu */}
          <div className="hidden md:block">
            {menusReady ? (
              <Suspense fallback={<AccountButton onIntent={() => loadMenus('user')} />}>
                <UserMenu defaultOpen={openOnLoad === 'user'} />
              </Suspense>
            ) : (
              <AccountButton onIntent={() => loadMenus('user')} />
            )}
          </div>

          {/* Mobile Menu */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() =>
              setMenuOpen(true)
            }
            aria-label="Open menu"
          >
            <Menu
              aria-hidden
              className="size-5!"
            />
          </Button>
        </div>
      </div>

      {/* Travel Services Navigation */}
      <nav
        aria-label="Travel services"
        className="hidden border-t border-border/70 md:block"
      >
        <ul className="mx-auto flex max-w-7xl items-stretch gap-1 overflow-x-auto px-4 sm:px-6 lg:justify-between lg:px-8 [scrollbar-width:none]">
          <li>
            <ServiceNavLink
              to="/"
              label="Home"
              end
            />
          </li>

          {SERVICES.map(
            ({
              label,
              path,
              icon,
            }) => (
              <li key={path}>
                <ServiceNavLink
                  to={path}
                  label={label}
                  icon={icon}
                />
              </li>
            ),
          )}
        </ul>
      </nav>

      {/* Quick Search & mobile menu: mounted the first time they open. */}
      {(searchOpen || searchMounted) && (
        <Suspense fallback={null}>
          <QuickSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        </Suspense>
      )}
      {(menuOpen || menuMounted) && (
        <Suspense fallback={null}>
          <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
        </Suspense>
      )}
    </header>
  );
}

interface ServiceNavLinkProps {
  to: string;
  label: string;
  icon?: (typeof SERVICES)[number]['icon'];
  end?: boolean;
}

function ServiceNavLink({
  to,
  label,
  icon: Icon,
  end,
}: ServiceNavLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative flex h-11 items-center gap-1.5 whitespace-nowrap px-2.5 text-sm font-semibold transition-colors',
          'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors',
          isActive
            ? 'text-primary after:bg-primary'
            : 'text-foreground/75 after:bg-transparent hover:text-foreground',
        )
      }
    >
      {Icon && (
        <Icon
          aria-hidden
          className="size-4"
        />
      )}

      {label}
    </NavLink>
  );
}
function useStickyTrue(value: boolean): boolean {
  const [seen, setSeen] = useState(value);
  if (value && !seen) setSeen(true);
  return seen || value;
}

/** Looks exactly like the bell; clicking it loads the real menu and opens it. */
function BellButton({ onIntent }: { onIntent?: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-10 w-10 rounded-full hover:bg-primary-light"
      aria-label="Notifications"
      onClick={onIntent}
      onPointerEnter={onIntent ? () => void import('./NotificationBell') : undefined}
    >
      <Bell aria-hidden className="size-5 text-foreground/80" />
    </Button>
  );
}

/** Placeholder for the account menu with the same size and look. */
function AccountButton({ onIntent }: { onIntent?: () => void }) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  if (status === 'loading') return <span aria-hidden className="block h-9 w-32 animate-pulse rounded-full bg-border/60" />;
  if (!user) {
    return (
      <Button asChild size="sm">
        <Link to="/login">Login / Sign up</Link>
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={onIntent}
      onPointerEnter={onIntent ? () => void import('./UserMenu') : undefined}
      className="flex h-10 items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 text-sm font-semibold"
    >
      <UserAvatar name={user.fullName} src={user.avatarUrl} size={32} />
      <span className="max-w-28 truncate">{user.fullName.split(' ')[0]}</span>
      <ChevronDown aria-hidden className="size-4 text-muted" />
      <span className="sr-only">Account menu</span>
    </button>
  );
}
