import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { routes } from '@/routes/routes';

/**
 * Build-time prerendering of public pages (scripts/prerender.mjs). Crawlers and link previews
 * (which don't run JavaScript) get the content and meta tags, and the page paints before the
 * app's JavaScript loads. Anything user- or date-specific must render client-side only.
 */
export async function render(url: string): Promise<string> {
  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(new URL(url, 'http://prerender.local')));
  if (context instanceof Response)
    throw new Error(`Cannot prerender ${url}: got a ${context.status} response`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToString(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <StaticRouterProvider router={router} context={context} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
