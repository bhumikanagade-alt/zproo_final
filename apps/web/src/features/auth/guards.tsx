import type { Permission } from '@zproo/types';
import { Navigate, Outlet, useLocation } from 'react-router';
import { PageLoader } from '@/components/feedback/PageLoader';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { loginPath, safeNext } from './redirect';
import { hasPermission, useAuthStore } from './store';

/** Signed-in users only; others go to login and come back afterwards. */
export function RequireAuth() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status === 'anonymous') {
    return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  }
  return <Outlet />;
}

/**
 * Hides pages from users lacking a permission. This is a convenience only — the API checks
 * the same permission on every request.
 */
export function RequirePermission({ permission }: { permission: Permission }) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (status === 'loading') return <PageLoader fullscreen />;
  if (status === 'anonymous') {
    return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  }
  if (!hasPermission(user, permission)) return <ForbiddenPage />;
  return <Outlet />;
}

/** Login/signup screens: already signed-in users continue to where they were going. */
export function RedirectIfAuthenticated() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === 'authenticated') {
    return <Navigate to={safeNext(new URLSearchParams(location.search).get('next'))} replace />;
  }
  return <Outlet />;
}
