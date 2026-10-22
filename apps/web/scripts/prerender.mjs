#!/usr/bin/env node
/**
 * Writes static HTML for public pages after `vite build` + the SSR build of src/entry-server.tsx.
 *
 *   dist/index.html            prerendered home page
 *   dist/<page>/index.html     other prerendered pages
 *   dist/app.html              empty app shell — the fallback for every other URL
 *
 * React 19 emits <title>, <meta> and <link> tags inline; they are moved into <head> here.
 *
 * The stylesheet (~10 kB gzipped) is inlined so first paint doesn't wait for another request —
 * inlining only "critical" CSS was tried and caused layout shift when the rest arrived — and the
 * Latin font files are preloaded so text rarely re-flows when the web font swaps in.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const ssrDir = path.join(root, 'dist-ssr');
const pages = JSON.parse(
  await readFile(path.join(import.meta.dirname, 'indexable-pages.json'), 'utf8'),
);
const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);

const template = await readFile(path.join(dist, 'index.html'), 'utf8');
await writeFile(path.join(dist, 'app.html'), template);
// Hosts without rewrite rules (e.g. GitHub Pages) serve 404.html for unknown paths: same shell.
await writeFile(path.join(dist, '404.html'), template);

const HEAD_TAG = /<title>[\s\S]*?<\/title>|<meta\b[^>]*\/?>|<link\b[^>]*rel="canonical"[^>]*\/?>/g;
const ROOT = /<div id="root">[\s\S]*?<\/div>\s*<\/div>\s*(?=<noscript>)/;

// Vite's hashed output lives in /_app (see vite.config.ts build.assetsDir); /assets holds public files.
const assets = await readdir(path.join(dist, '_app'));
const stylesheet = template.match(/<link rel="stylesheet"[^>]*href="(\/_app\/[^"]+\.css)"[^>]*>/);
if (!stylesheet) throw new Error('Could not find the stylesheet link in dist/index.html');
const css = await readFile(path.join(dist, stylesheet[1]), 'utf8');
const fontPreloads = assets
  .filter((f) => /^plus-jakarta-sans-latin(-ext)?-wght-normal-.*\.woff2$/.test(f))
  .map((f) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="/_app/${f}">`);

for (const page of pages) {
  const appHtml = await render(page);
  const headTags = appHtml.match(HEAD_TAG) ?? [];
  const body = appHtml.replace(HEAD_TAG, '');
  if (!ROOT.test(template))
    throw new Error('Could not find the #root boot markup in dist/index.html');

  let html = template
    // The page's own title/description replace the defaults.
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/, '')
    .replace('</head>', `    ${headTags.join('\n    ')}\n  </head>`)
    .replace(ROOT, `<div id="root" data-prerendered-path="${page}">${body}</div>\n    `);

  html = html
    .replace(stylesheet[0], `<style>${css.replaceAll('</style', '<\\/style')}</style>`)
    .replace('</head>', `    ${fontPreloads.join('\n    ')}\n  </head>`);

  const file =
    page === '/' ? path.join(dist, 'index.html') : path.join(dist, page.slice(1), 'index.html');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
  console.info(`✓ prerendered ${page} (${Math.round(html.length / 1024)} kB)`);
}

await rm(ssrDir, { recursive: true, force: true });
