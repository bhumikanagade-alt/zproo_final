# Performance

Measured on the production build with a throttled mobile profile (Chromium, 412 px viewport,
150 ms latency, 1.6 Mbps down, 4× CPU slowdown), served with gzip, average of 3 runs.

| Page | Metric | Before | After |
| --- | --- | --- | --- |
| Home `/` | Largest Contentful Paint | 3.99 s | **0.79 s** |
| | Total Blocking Time | 1,380 ms | **1,070 ms** |
| | Load event | 3.17 s | **2.25 s** |
| Buses `/buses` | First Contentful Paint | 1.48 s | **0.61 s** |
| | Largest Contentful Paint | 4.06 s | **2.22 s** |
| Flights `/flights` | Largest Contentful Paint | 3.55 s | **1.91 s** |
| Hotels `/hotels` | Largest Contentful Paint | 4.89 s | **2.76 s** |

Cumulative Layout Shift is 0 throughout. The JavaScript the home page preloads went from **260 kB to
187 kB** (gzipped, −28%); the admin panel and its demo engine (≈80 kB gzipped) are never downloaded by customers.

## What changed

1. **Hydration mismatch fixed.** The home page's JSON-LD used the browser's origin, which differs from the
   prerendered HTML, so React threw away the whole prerendered page and rendered it again (error #418).
   That second render was the slow LCP and most of the blocking time. Markup that is prerendered now only
   uses `VITE_SITE_URL` (`env.configuredSiteUrl`).
2. **Service landing pages are prerendered** (`/flights`, `/buses`, `/trains`, `/hotels`, `/cabs`, `/bikes`,
   `/holidays`, `/parcel`, `/offers`, `/faq`, `/contact`, `/blog`, …) — they paint before JavaScript loads
   and are in the sitemap. Each is checked to hydrate without a mismatch.
3. **Header menus and dialogs load when needed.** The account menu, notifications, quick search, mobile
   menu and the app-discount popup (with Radix menus/positioning code) load once the page is idle or on
   first use; their placeholders look identical and a click while loading still opens the menu.
4. **Notification polling** went from every 1.5 s to every 30 s (the list refreshes right after a payment).
5. **Images**: the footer logo was a 163 kB PNG preloaded at high priority; it is now a 17 kB WebP, lazy.
   Earlier passes re-encoded photos and added responsive sizes (`apps/web/scripts/optimize-images.mjs`).
6. **Smaller bundles**: workspace packages are marked side-effect free, and zod stays out of the home page.
7. **Caching**: hashed bundles moved to `/_app/` and are cached for a year (`_headers`, `vercel.json`,
   `.htaccess`); public images get a week with background revalidation.
8. **Database**: indexes on `bookings(created_at)`, `bookings(status, created_at)`, `payments(created_at)`
   and `refunds(created_at)` for the admin lists and reports; settings are cached for 15 s.

## Where the remaining time goes

The home page's remaining blocking time is mostly parsing its large prerendered HTML (inline CSS ~157 kB
raw and ~250 inline SVG icons). Next steps if needed: split the Tailwind stylesheet per area (admin vs
site), and swap decorative inline SVG illustrations for cached image files.

## Re-measuring

```bash
npm run build -w @zproo/web
# serve apps/web/dist with any static server that gzips and maps /page → /page/index.html,
# then run Lighthouse (mobile) on /, /buses, /flights, /hotels.
```
