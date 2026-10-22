import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { PageLoader } from '@/components/feedback/PageLoader';
import { NotificationsProvider } from '@/components/feedback/Notifications';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteNotice } from '@/components/layout/SiteNotice';
import { useModulePointerCursor } from '@/hooks/usePointerCursor';

export function PublicLayout() {
  useModulePointerCursor();
  return (
    <NotificationsProvider><div className="flex min-h-dvh flex-col">
      <SiteNotice />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
      <MobileBottomNav />
      <ScrollRestoration />
    </div></NotificationsProvider>
  );
}
