# Architecture

ZPROO GO is a **modular monolith**: one API deployable, one web app, sharing typed packages.
The full design (booking engine, payments, providers, real-time) is in
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). This document describes what exists now.

## Monorepo

```
apps/web ─┬─> @zproo/ui ──────────┐
          ├─> @zproo/types        │
          ├─> @zproo/utils        ├─> @zproo/config (tsconfig presets, brand)
          └─> @zproo/config       │
apps/api ─┬─> @zproo/types        │
          ├─> @zproo/validation ──┘
          ├─> @zproo/utils
          └─> @zproo/config
```

Internal packages ship TypeScript source (no build step). Vite compiles them for the web app;
`tsup` bundles them into `apps/api/dist/server.js`, leaving third-party dependencies external.
Turborepo runs `build`, `lint`, `typecheck` and `test` across workspaces with caching.

## API (`apps/api`)

```
server.ts          boot: env → logger → Prisma → Redis → services → app → listen; graceful shutdown
container.ts       composition root: the only place concrete repositories, services and providers are wired
app.ts             createApp(services): middleware + routers, no side effects (testable with Supertest)
config/env.ts      Zod-validated environment; fails fast with names (never values) of bad vars
middleware/        httpLogger (request IDs), security (Helmet, CORS), rateLimit, validate,
                   auth (authenticate, authorize), notFound, errorHandler
routes/            one router per module, mounted under /api (health, auth, me, admin, flights, buses,
                   bookings, payments)
controllers/       HTTP adapters only (read validated input, set cookies, send envelope)
services/          business logic: Auth, Otp, Token, Password, Rbac, Audit, User, Health, Flight, Bus, Booking,
                   Payment, Ticket (PDF), Cache (Redis, optional)
repositories/      data access with Prisma; accept a transaction client for multi-step writes
providers/         external integrations behind interfaces: sms/, email/, identity/ (Google, Apple),
                   flight/ (FlightProvider; MockFlightProvider), bus/ (BusProvider; MockBusProvider),
                   payment/ (PaymentProvider; mock gateway)
models/            DTO mappers (e.g. toPublicUser — the only shape a user leaves the API in)
validators/        route-specific Zod schemas (shared ones live in @zproo/validation)
docs/              OpenAPI registry built from Zod schemas + Swagger UI router
utils/             AppError hierarchy, response envelope, logger
```

Request pipeline: `request ID + log → Helmet → CORS → JSON body (100 kB) → rate limit →
router → validate → controller → service → repository`, with `notFound` and `errorHandler`
last. Express 5 forwards rejected promises from async handlers to the error handler.

Every response uses the envelope `{ success, message, data }`; failures add `errorCode`,
optional `details` (validation) and `requestId`.

## Web (`apps/web`)

```
routes/routes.tsx     route tree; every page is lazy-loaded (route-level code splitting)
routes/routeMap.ts    UI page map: every planned route, its title and delivery phase
layouts/              PublicLayout (header, footer, bottom nav), AuthLayout, AdminLayout
components/           brand/Logo, layout/*, feedback/*, seo/Seo
config/               service catalogue and navigation (single source for header/footer/search)
features/<domain>/    API hooks (TanStack Query) and domain components
services/http.ts      Axios instance; unwraps the envelope; normalises errors to ApiClientError
store/                Zustand stores (UI preferences)
features/auth/        session store (access token in memory), refresh with cross-tab lock,
                      guards (RequireAuth, RequirePermission), flows, form components
styles/globals.css    design tokens (CSS variables) mapped into Tailwind's theme
```

- Routes whose module has not shipped render `PlannedPage` (marked `noindex`), so navigation never
  breaks. Each phase replaces its placeholders with real pages.
- The admin area (`/admin`) is a separate lazy chunk with its own layout, behind
  `RequirePermission("admin:access")`. The API enforces permissions; client-side guards are only for UX.

## Authentication flow (web)

```
page load ──(had a session before?)──> POST /auth/refresh (cookie) ──> access token in memory
API call ──> Authorization: Bearer <access> ──401──> refresh once (Web Lock across tabs) ──> replay
sign in  ──> { user, accessToken } + HttpOnly refresh cookie (Path=/api/auth)
```

- Page metadata (title, description, canonical, Open Graph, Twitter) uses React 19's native
  `<title>`/`<meta>` hoisting via `<Seo />`.
- Mobile gets its own navigation model: app-style bottom navigation plus a slide-in menu.

## Design system

Tokens are CSS variables on `:root` (`--primary`, `--primary-hover`, `--primary-light`,
`--background`, `--foreground`, `--muted`, `--border`, `--success`, `--warning`, `--danger`)
exposed to Tailwind via `@theme inline`, so utilities like `bg-primary` and `text-muted` follow
them. The same values are exported from `@zproo/config` (`BRAND.colors`) for emails and PDFs.
Typeface: Plus Jakarta Sans (self-hosted, no third-party requests). Motion respects
`prefers-reduced-motion`.

## Search (Phase 3)

- One validated form per service under `apps/web/src/features/search/forms`, all driven by the shared
  Zod schemas in `@zproo/validation` (`flightSearchSchema`, `busSearchSchema`, …) — the same rules the
  API will enforce in Phases 4–11.
- Place pickers use the shared reference data in `@zproo/config` (`AIRPORTS`, `CITIES`,
  `TRAIN_STATIONS`), which the Phase 4+ database seed will also use.
- Submitting navigates to a result URL (`features/search/url.ts`) so searches are shareable and
  survive reloads. Each `…Url` builder has a `parse…` counterpart for the result page.
- Links on prerendered pages (deals, popular routes) never contain dates; result pages default
  them (`DEFAULT_LEAD_DAYS`).
- Only the flight form ships with the home page; other tabs load when first opened.

## Images (Phase 3)

- Every photo slot is declared in `apps/web/src/config/images.ts` with alt text and an illustrated
  fallback scene. `<TravelImage>` renders responsive WebP (480/960/1600 px, lazy by default) when a
  photo is published, otherwise the illustration — never a broken image.
- Originals go in `apps/web/assets-src/images/<id>.jpg`; `npm run images -w @zproo/web` generates
  the variants and `src/config/imageManifest.json`, and refuses any photo without an entry in
  `credits.json`. See `apps/web/assets-src/images/README.md`.

## Prerendering (Phase 3)

Public pages listed in `apps/web/scripts/indexable-pages.json` (home, about, terms, privacy, refund
policy) are rendered to static HTML at build time:

```
vite build                           → dist/ (client app)
vite build --ssr src/entry-server.tsx → dist-ssr/ (temporary)
node scripts/prerender.mjs           → dist/index.html, dist/<page>/index.html, dist/app.html
```

- Crawlers and link-preview bots (which don't run JavaScript) get the content, title, description,
  canonical and Open Graph tags; the page paints before JavaScript loads.
- The stylesheet is inlined and the Latin font files are preloaded.
- `main.tsx` hydrates only when `#root[data-prerendered-path]` equals the current path; any other page
  is rendered in the browser from scratch. Browser-only state (saved preferences, the session check,
  the booking widget via `useHydrated()`) loads after hydration so it can't disagree with the HTML.
- Nothing time- or user-specific may be rendered into prerendered pages. A test
  (`src/entry-server.test.tsx`) checks that no date is baked into the home page.

**Hosting requirements (Phase 21):** serve `dist/<path>/index.html` for prerendered paths and
fall back to `dist/app.html` for every other route. The web app's Content-Security-Policy must allow
the inline `<style>`, the JSON-LD `<script type="application/ld+json">`, and React Router's inline
hydration script (use hashes).

## Flights and bookings (Phase 4)

```
GET  /flights/search ─▶ FlightService ─▶ FlightProvider.search   (cached 60 s in Redis)
POST /flights/book   ─▶ BookingService: re-price offers → check passengers → PRICE_CHANGED?
                        └─ transaction: FlightProvider.hold (seats) + create booking (PENDING_PAYMENT)
POST /payments/create ─▶ PaymentService: order for the stored total (PaymentProvider.createOrder)
POST /payments/verify ─▶ verify signature → transaction: booking CONFIRMED (hold still valid) + payment SUCCESS
                        └─ after commit: FlightProvider.issue → PNR + ticket numbers
every minute         ─▶ BookingService.expireHolds: CANCELLED + seats released + open payments cancelled
```

`FlightProvider` and `PaymentProvider` are the seams for real suppliers (an airline aggregator,
Razorpay): services depend only on the interfaces, and `container.ts` picks the implementation from
`FLIGHT_PROVIDER` / `PAYMENT_PROVIDER`. The mock flight provider prices deterministically (route,
date, cabin, days to departure and a simulated load factor), so search, offer and booking agree.
The price breakdown lives in `@zproo/utils` so the web app and the API compute it identically.

On the web, the checkout draft (chosen offers, travellers, idempotency key, booking reference) is
kept per tab in `sessionStorage`, so a reload mid-checkout keeps it. Pages:
`/flights` → `/flights/results` (filters, sorting, leg selection) → `/flights/:id` →
`/flights/booking` (sign-in required) → `/flights/review` → `/flights/payment` → `/flights/confirmation`.

## Buses (Phase 5)

Buses reuse the booking core: `BookingService.createBusBooking` checks the trip, seats, points,
ladies-only rules and prices, then writes the booking and holds the seats in one transaction
(`BusProvider.hold` inserts one `bus_seat_bookings` row per seat; the unique `(trip, seat)` pair
rejects a taken seat). Payment, ticket issue (operator PNR), hold expiry (seat rows deleted) and
the PDF ticket are shared with flights.

On the web, checkout pieces are shared under `features/checkout` (layout and steps, price summary,
payment and confirmation pages at `/flights/…` and `/buses/…`). The bus flow is
`/buses` → `/buses/results` → `/buses/:id` (details) → `/buses/:id/seats` (seat map, boarding and
dropping points) → `/buses/booking` (sign-in required) → `/buses/review` → `/buses/payment` →
`/buses/confirmation`. The seat map refreshes every 20 seconds; seats taken meanwhile drop out of the
selection, and the review step re-checks them before booking.
