import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createBrowserRouter, matchRoutes, type HydrationState } from 'react-router';
import { App } from './App';
import { bootstrapSession, installAuth } from './features/auth/session';
import { routes } from './routes/routes';
import { usePreferences } from './store/preferences';
import './styles/globals.css';

declare global {
  interface Window {
    __staticRouterHydrationData?: HydrationState;
  }
}

installAuth();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

// Hydrate only if this HTML was prerendered for this exact path. A static host may serve a
// prerendered page as the fallback for other URLs; those are rendered from scratch instead.
const prerendered = container.dataset.prerenderedPath === window.location.pathname;

async function start() {
  if (prerendered) {
    // Lazy routes on the current page must be loaded before hydrating, or React would find
    // a loading fallback where the server rendered the page.
    const lazyMatches = matchRoutes(routes, window.location)?.filter((m) => m.route.lazy) ?? [];
    await Promise.all(
      lazyMatches.map(async (m) => {
        const loader = m.route.lazy as () => Promise<Record<string, unknown>>;
        Object.assign(m.route, { ...(await loader()), lazy: undefined });
      }),
    );
  }
  const router = createBrowserRouter(
    routes,
    prerendered ? { hydrationData: window.__staticRouterHydrationData } : {},
  );
  const app = (
    <StrictMode>
      <App router={router} />
    </StrictMode>
  );
  if (prerendered && container) hydrateRoot(container, app);
  else createRoot(container as HTMLElement).render(app);

  // Browser-only state loads after the first render so it can't disagree with the prerendered HTML.
  void usePreferences.persist.rehydrate();
  void bootstrapSession();
}

void start();
