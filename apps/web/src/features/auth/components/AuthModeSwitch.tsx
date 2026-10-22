import { cn } from '@zproo/ui';
import { NavLink, useLocation } from 'react-router';

/** Login / Sign Up switch from the reference design; keeps `?next=` when switching. */
export function AuthModeSwitch() {
  const { search } = useLocation();
  const item = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex h-10 flex-1 items-center justify-center rounded-full text-sm font-bold transition-colors',
      isActive
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-foreground/70 hover:text-foreground',
    );
  return (
    <nav
      aria-label="Account"
      className="mb-6 flex rounded-full bg-background p-1 ring-1 ring-border"
    >
      <NavLink to={{ pathname: '/login', search }} className={item}>
        Login
      </NavLink>
      <NavLink to={{ pathname: '/signup', search }} className={item}>
        Sign Up
      </NavLink>
    </nav>
  );
}
