import { cn } from '@zproo/ui';
import { NavLink } from 'react-router';
import { BOTTOM_NAV } from '@/config/navigation';

/** App-style bottom navigation for phones and small tablets. */
export function MobileBottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-(--bottom-nav-height) max-w-md grid-cols-5">
        {BOTTOM_NAV.map(({ label, path, icon: Icon }) => (
          <li key={path}>
            <NavLink
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-primary' : 'text-muted hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon aria-hidden className="size-5" strokeWidth={isActive ? 2.4 : 2} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
