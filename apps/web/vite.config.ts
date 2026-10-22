import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import INDEXABLE_PATHS from './scripts/indexable-pages.json' with { type: 'json' };

const repoRoot = path.resolve(import.meta.dirname, '../..');

/**
 * Pages search engines should index (also the prerendered pages). Placeholder pages are
 * `noindex` and stay out until their phase ships; add each module's public pages as it goes live.
 */

/** Writes sitemap.xml and a robots.txt that points to it (needs VITE_SITE_URL for absolute URLs). */
function sitemap(siteUrl: string | undefined): Plugin {
  return {
    name: 'zproo-sitemap',
    apply: 'build',
    async closeBundle() {
      // Client build only (the SSR build for prerendering shares this config).
      if (!siteUrl || this.environment?.config.build.ssr) return;
      const base = siteUrl.replace(/\/$/, '');
      const urls = INDEXABLE_PATHS.map(
        (p) => `  <url><loc>${base}${p === '/' ? '/' : p}</loc></url>`,
      ).join('\n');
      const out = path.resolve(import.meta.dirname, 'dist');
      await writeFile(
        path.join(out, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      );
      await writeFile(
        path.join(out, 'robots.txt'),
        [
          'User-agent: *',
          'Disallow: /admin',
          'Disallow: /wallet',
          'Disallow: /bookings',
          'Disallow: /profile',
          '',
          `Sitemap: ${base}/sitemap.xml`,
          '',
        ].join('\n'),
      );
    },
  };
}

/**
 * A production build must talk to the real API. The in-browser demo engine ships demo staff
 * accounts and a shared demo password, so a live site must never be built with it.
 */
function requireApiForProduction(mode: string) {
  if (mode !== 'production') return;
  const source = loadEnv(mode, repoRoot, 'VITE_').VITE_DATA_SOURCE;
  if (source !== 'api') {
    throw new Error(
      `Production builds need VITE_DATA_SOURCE=api (found ${source ? `"${source}"` : 'nothing'}). ` +
        'Set it in the root .env or the build environment. The demo engine is for local development only.',
    );
  }
}

export default defineConfig(({ mode }) => {
  requireApiForProduction(mode);
  return {
  plugins: [react(), tailwindcss(), sitemap(loadEnv(mode, repoRoot, 'VITE_').VITE_SITE_URL)],
  // One .env at the monorepo root serves the API, Prisma and the web app (VITE_* only is exposed).
  envDir: repoRoot,
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
  build: {
    target: 'es2022',
    // Hashed bundles go to /_app so hosts can cache them forever (public/_headers, vercel.json,
    // .htaccess); /assets keeps the unhashed public images, which get a shorter cache.
    assetsDir: '_app',
    sourcemap: true,
    rolldownOptions: {
      output: {
        // Framework code changes rarely; a separate chunk keeps it cached across deploys.
        // No catch-all vendor group: other libraries (zod, react-hook-form, …) must stay in the
        // lazy chunks of the pages that use them, not in the initial download.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler|cookie|set-cookie-parser)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Page tests mock the API client; the static engine has its own tests (src/static).
    env: { VITE_DATA_SOURCE: 'api' },
  },
  };
});
