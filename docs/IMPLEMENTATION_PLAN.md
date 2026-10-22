# ZPROO GO — Architecture & Implementation Plan

> Unified Mobility & Travel Super App — _"Travel Smarter. Go Further."_
>
> Status: **Release 1 complete — flights and buses** (Phases 1–5). Phases 6+ are paused; their pages show "Coming soon". Sections 0 and 16 record where things stood when the plan was written and what is still open.
> This document is the reference for all 23 phases. Per-topic docs (`ARCHITECTURE.md`, `API.md`, `DATABASE.md`, …) are created in the phase that implements them.

---

## 0. Current repository state

| Item         | State                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Git history  | Empty — no commits on `claude/gallant-mendel-7cikw6`                                                                          |
| Source files | None                                                                                                                          |
| Brand assets | **Not in repo.** Only two app-flow reference screenshots were supplied (1254×1254 JPG). No standalone logo file was supplied. |

Because the repository is empty, the plan is to **initialise the complete monorepo** in Phase 1. Nothing will be deleted or migrated.

---

## 1. Architecture overview

```
                        ┌──────────────────────────────────────────┐
  Browser / Mobile web  │  apps/web  (React + Vite SPA)            │
  ─────────────────────▶│  • Customer site  (/, /flights, …)       │
                        │  • Admin panel    (/admin/*, lazy chunk) │
                        └──────────────┬───────────────────────────┘
                              HTTPS REST (Axios + TanStack Query)
                              WSS (Socket.IO client)
                        ┌──────────────▼───────────────────────────┐
                        │  apps/api  (Express + Socket.IO)         │
                        │  routes → controllers → services         │
                        │          → repositories (Prisma)         │
                        │          → providers (interfaces)        │
                        └───┬───────────┬────────────┬─────────────┘
                            │           │            │
                     ┌──────▼───┐  ┌────▼────┐  ┌────▼──────────────────────┐
                     │PostgreSQL│  │  Redis  │  │ External providers        │
                     │ (Prisma) │  │ cache,  │  │ Razorpay · Maps · SMS ·   │
                     │          │  │ BullMQ, │  │ Email · Flight/Bus/Train/ │
                     │          │  │ seat    │  │ Hotel suppliers           │
                     │          │  │ holds,  │  └───────────────────────────┘
                     │          │  │ rate    │
                     └──────────┘  │ limits, │
                                   │ WS adapt│
                                   └─────────┘
```

**Style:** modular monolith. One deployable API, internally split by domain module (auth, flights, buses, trains, hotels, rides, holidays, parcels, corporate, wallet, payments, bookings, offers, notifications, support, admin, reports). Each module owns its routes, controller, service, repository, validators and DTOs. Modules talk to each other only through services, never through another module's repository. This keeps it one deployment today while leaving clean seams to extract services later.

**Key decisions**

| Decision         | Choice                                                                            | Why                                                                                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo tooling | npm workspaces + Turborepo                                                        | Matches requested `turbo.json`; no extra package manager                                                                                                                                 |
| Admin panel      | Lazy-loaded route tree inside `apps/web` at `/admin`, separate layout + chunk     | Matches the requested structure (only `web` and `api` apps) and the `/admin` route; admin code is never downloaded by customers. Can be split into `apps/admin` later with no API change |
| Money            | Integer **paise** (`Int`) everywhere; currency code column                        | No floating-point rounding in fares, taxes, refunds, wallet                                                                                                                              |
| IDs              | `cuid` string PKs; human references (`ZP-2026-XXXXXX`) as separate unique columns | Non-enumerable IDs; friendly refs for customers                                                                                                                                          |
| Background jobs  | BullMQ on Redis                                                                   | Notifications, PDF generation, seat-hold expiry, refund processing, webhook retries                                                                                                      |
| API docs         | `@asteasolutions/zod-to-openapi` + `swagger-ui-express` at `/api/docs`            | One Zod schema is the source of truth for validation _and_ OpenAPI                                                                                                                       |
| Logging          | Pino + pino-http with redaction                                                   | Structured JSON, request IDs, fast                                                                                                                                                       |
| PDF              | `pdfkit` (server)                                                                 | Tickets/invoices generated server-side with the official logo; no headless browser needed                                                                                                |
| Charts (admin)   | Recharts                                                                          | Only addition beyond the requested stack; needed for dashboard charts                                                                                                                    |

---

## 2. Folder structure

```
zproo-go/
├── apps/
│   ├── web/
│   │   ├── public/assets/{brand,flights,buses,trains,hotels,cabs,bikes,holidays,parcel,corporate,destinations}/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── main.tsx, App.tsx
│   │       ├── components/        # shared UI: Logo, Header, Footer, BottomNav, SearchWidget, cards…
│   │       │   └── ui/            # shadcn/ui primitives (button, input, dialog, tabs…)
│   │       ├── layouts/           # PublicLayout, AuthLayout, AccountLayout, AdminLayout
│   │       ├── pages/             # route-level components only (thin)
│   │       ├── features/          # domain slices: auth, flights, buses, trains, hotels, rides,
│   │       │   └── <feature>/     #   bikes, holidays, parcel, corporate, wallet, bookings,
│   │       │       ├── api.ts     #   offers, support, admin/*
│   │       │       ├── hooks.ts   # TanStack Query hooks
│   │       │       ├── components/
│   │       │       └── schemas.ts # form schemas (re-exported from packages/validation)
│   │       ├── hooks/             # generic hooks (useDebounce, useMediaQuery…)
│   │       ├── services/          # axios instance, socket client, token refresh
│   │       ├── store/             # Zustand: auth session, booking draft, UI
│   │       ├── routes/            # route table, guards (RequireAuth, RequireRole)
│   │       ├── types/  utils/  lib/
│   │       └── styles/globals.css # design tokens (CSS variables)
│   └── api/
│       └── src/
│           ├── app.ts, server.ts
│           ├── config/            # env (Zod-validated), constants
│           ├── modules/<domain>/  # routes, controller, service, repository, validators, dto
│           ├── controllers/ services/ repositories/ routes/ validators/   # (see note)
│           ├── middleware/        # auth, rbac, validate, rateLimit, requestId, error, idempotency
│           ├── providers/         # flight/, bus/, train/, hotel/, payment/, map/, sms/, email/, notification/
│           ├── models/            # domain types / DTO mappers
│           ├── jobs/              # BullMQ queues + workers
│           ├── websocket/         # Socket.IO server, auth, rooms, event emitters
│           ├── pdf/  templates/email/
│           ├── utils/             # errors, response envelope, money, reference generator
│           └── types/
├── packages/
│   ├── ui/          # (reserved) cross-app UI once a second app exists
│   ├── types/       # shared enums & API DTO types (BookingStatus, ServiceType…)
│   ├── validation/  # shared Zod schemas (used by web forms AND api validators)
│   ├── config/      # tsconfig, eslint, prettier, tailwind preset
│   └── utils/       # pure helpers: money formatting, dates, reference parsing
├── prisma/  schema.prisma · migrations/ · seed.ts · seed/*
├── docs/    ARCHITECTURE · API · API_DOCUMENTATION · DATABASE · DEPLOYMENT · SECURITY · ENVIRONMENT · TESTING · CONTRIBUTING
├── docker/  Dockerfile.web · Dockerfile.api · nginx.conf
├── e2e/     Playwright specs
├── .github/workflows/ci.yml
├── docker-compose.yml · package.json · turbo.json · .env.example · README.md
```

> Note on `apps/api/src`: the requested top-level folders (`controllers/`, `services/`, `repositories/`, …) are kept, organised **by domain inside each** (e.g. `services/flight.service.ts`, `repositories/booking.repository.ts`). This satisfies the requested layout while keeping each domain easy to find.

---

## 3. Database ERD plan

```
User ─┬─< UserRole >─ Role ─< RolePermission >─ Permission
      ├─< RefreshToken            ├─< Address
      ├─< OtpCode (by phone/email)├─< Passenger (saved travellers)
      ├── Wallet ─< WalletTransaction
      ├─< Booking ─┬─< BookingPassenger
      │            ├─< Payment ─< Refund
      │            ├── (1:1 detail) FlightBooking | BusBooking | TrainBooking | HotelBooking
      │            │                 | Ride | Parcel | HolidayBooking
      │            ├── Coupon redemption (CouponUsage)
      │            └── CorporateApproval (if corporate)
      ├─< Notification   ├─< SupportTicket ─< SupportMessage
      ├─< Review         └─< AuditLog (actor)
      └── Driver (if DRIVER) ─< Vehicle, ─< Ride

Airline ─< Flight ─< FlightSegment >─ Airport (origin/destination)
BusOperator ─< Bus ─< BusSeat          BusRoute ─< BusTrip (Bus × Route × date) ─< BusSeatBooking
TrainStation ─< TrainSchedule(stops) >─ Train ─< TrainClassFare
Hotel ─< HotelRoom ─< HotelRoomInventory(date)      HolidayPackage ─< HolidayItineraryDay
CorporateCompany ─< CorporateEmployee(User, manager) ─< CorporateApproval
                 ├── CorporatePolicy     └── Wallet (company wallet, ownerType=COMPANY)
Partner ─< Commission ─< PartnerSettlement      Offer ─< Coupon ─< CouponUsage
Cab (vehicle class catalogue: MINI/SEDAN/SUV/PREMIUM/BIKE, per-km pricing)
IdempotencyKey · WebhookEvent · SystemSetting
```

---

## 4. Prisma model plan

**Enums:** `RoleName` (USER, ADMIN, SUPER_ADMIN, SUPPORT, OPERATOR, DRIVER, HOTEL_PARTNER, TRAVEL_PARTNER, CORPORATE_ADMIN) · `ServiceType` (FLIGHT, BUS, TRAIN, HOTEL, CAB, BIKE, HOLIDAY, PARCEL, CORPORATE) · `BookingStatus` (INITIATED, PENDING_PAYMENT, CONFIRMED, CANCELLED, COMPLETED, REFUND_PENDING, REFUNDED) · `PaymentStatus` (CREATED, PENDING, AUTHORIZED, SUCCESS, FAILED, REFUNDED, PARTIALLY_REFUNDED, CANCELLED) · `RefundStatus` (REQUESTED, PROCESSING, COMPLETED, FAILED) · `WalletTxnType` (CREDIT, DEBIT, REFUND, CASHBACK, RECHARGE) · `RideStatus` (SEARCHING, DRIVER_ASSIGNED, DRIVER_ARRIVING, TRIP_STARTED, TRIP_COMPLETED, CANCELLED) · `ParcelStatus` (ORDER_CREATED … DELIVERED) · `DriverStatus` (ONLINE, OFFLINE, BUSY, SUSPENDED) · `ApprovalStatus` (PENDING, APPROVED, REJECTED) · `TicketStatus` (OPEN, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED) · `NotificationType` (BOOKING, PAYMENT, REFUND, TRIP, OFFER, SECURITY, SYSTEM) · `NotificationChannel` (EMAIL, SMS, PUSH, WHATSAPP, IN_APP) · `CabinClass`, `BusType`, `TrainClass` (1A, 2A, 3A, SL, CC, 2S, EC), `HolidayCategory`, `DiscountType` (FLAT, PERCENT), `PartnerType`, …

**Model groups (all required models plus the few needed to make them work):**

| Group            | Models                                                                                      | Notes                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Identity         | User, Role, Permission, UserRole, RolePermission, RefreshToken, OtpCode, Address, Passenger | `User.deletedAt` soft delete; unique `phone`, unique `email`; refresh & OTP stored **hashed**                      |
| Booking core     | Booking, BookingPassenger                                                                   | `bookingReference` unique; `(userId, createdAt)`, `(status)`, `(serviceType, travelDate)` indexes; `metadata Json` |
| Flights          | Airline, Airport, Flight, FlightSegment, FlightBooking                                      | `Airport.iataCode` unique                                                                                          |
| Buses            | BusOperator, Bus, BusSeat, BusRoute, **BusTrip**, **BusSeatBooking**, BusBooking            | Unique `(busTripId, busSeatId)` on active seat bookings → DB-level double-booking guard                            |
| Trains           | Train, TrainStation, TrainSchedule, **TrainClassFare**, TrainBooking                        | Provider-backed; local tables act as cache/mock                                                                    |
| Hotels           | Hotel, HotelRoom, **HotelRoomInventory**, HotelBooking                                      | Per-date inventory row, decremented in a transaction                                                               |
| Mobility         | Cab, Driver, Vehicle, Ride                                                                  | `Ride.status` state machine; driver location in Redis (hot) + periodic snapshot                                    |
| Holiday / Parcel | HolidayPackage, HolidayItineraryDay, HolidayBooking, Parcel, ParcelTrackingEvent            | `Parcel.trackingNumber` unique                                                                                     |
| Corporate        | CorporateCompany, CorporateEmployee, CorporatePolicy, CorporateApproval                     | GSTIN on company                                                                                                   |
| Money            | Wallet, WalletTransaction, Payment, Refund, IdempotencyKey, WebhookEvent                    | `Wallet.version` for optimistic locking; `WebhookEvent.providerEventId` unique for dedupe                          |
| Marketing        | Offer, Coupon, CouponUsage                                                                  | `Coupon.code` unique; usage counted transactionally                                                                |
| Engagement       | Notification, SupportTicket, SupportMessage, Review                                         |                                                                                                                    |
| Partners         | Partner, Commission, PartnerSettlement                                                      | API credentials stored encrypted (AES-GCM, key from env)                                                           |
| Platform         | AuditLog, SystemSetting                                                                     | AuditLog is append-only                                                                                            |

Bold models are additions required for correctness (e.g. seats must be booked per _trip_, not per bus).

---

## 5. API architecture

- **Base:** `/api`, JSON, versionable via router mount (`/api/v1` alias later).
- **Envelope:** `{ success, message, data }` / `{ success:false, message, errorCode, data:null }` — produced only by `utils/response.ts` and the global error handler.
- **Layering:** `route → validate(zod) → auth → authorize(permission) → controller (HTTP only) → service (business rules, transactions) → repository (Prisma) / provider (external)`.
- **Errors:** `AppError` base → `ValidationError(400)`, `AuthenticationError(401)`, `AuthorizationError(403)`, `NotFoundError(404)`, `ConflictError(409)`, `PaymentError(402)`, `ProviderError(502)`, `RateLimitError(429)`; Prisma errors mapped (P2002→409, P2025→404); unknown → 500 with request ID, no stack in production.
- **Pagination:** `?page&limit` (max 100) → `data: { items, page, limit, total }`; cursor pagination for large admin tables/transactions.
- **Idempotency:** `Idempotency-Key` header required on `POST /bookings*`, `/payments/create`, `/wallet/add-money`, `/refund`; stored with request hash + response for 24h.
- **Endpoints:** exactly the list in the brief (auth, flights, buses, trains, hotels, rides, bikes, holidays, parcels, wallet, bookings, payments, offers, support, admin/*), plus `GET /api/health`, `GET /api/me`, `GET /api/bookings/:id/ticket.pdf`, `GET /api/bookings/:id/invoice.pdf`, `GET /api/notifications`.
- **Docs:** OpenAPI generated from Zod at `/api/docs` (disabled or auth-gated in production).

---

## 6. Authentication architecture

```
Signup: phone → POST /auth/send-otp → OTP (6 digits, hashed, 5 min TTL, 5 attempts, 60 s resend)
        → POST /auth/verify-otp → (new user) POST /auth/register {name,email?,password?} → tokens
Login:  phone+OTP  |  email/phone+password  |  Google (OAuth code → ID token verify)  |  Apple (interface only)
```

- **Access token:** JWT, 15 min, claims `{sub, roles, sid}`; sent as `Authorization: Bearer`; held **in memory** on the web (Zustand, not localStorage).
- **Refresh token:** opaque random 256-bit, 30 days, `HttpOnly; Secure; SameSite=Lax; Path=/api/auth` cookie; stored as SHA-256 hash with `familyId`. **Rotation** on every refresh; reuse of a rotated token revokes the whole family (theft detection).
- **Passwords:** argon2id.
- **Authorization:** roles → permissions (`booking:read:own`, `booking:read:any`, `refund:approve`, …) loaded into a cached map; `authorize('refund:approve')` middleware + ownership checks inside services. The frontend's `RequireRole` guard is UX only.
- **Abuse controls:** Redis rate limits per IP and per phone on OTP/login; OTP values never logged; security notifications on new login / password change.

---

## 7. Payment architecture

```
PaymentProvider (interface)
  createOrder(amountPaise, currency, receipt, notes) → { providerOrderId }
  verifyPayment({orderId, paymentId, signature})     → boolean
  verifyWebhook(rawBody, signatureHeader)            → Event
  refund(paymentId, amountPaise, notes)              → { providerRefundId, status }
  ├── RazorpayProvider      (production)
  └── MockPaymentProvider   (dev/test/E2E — deterministic success/failure)
```

Flow: booking `PENDING_PAYMENT` → `POST /payments/create` (idempotent, amount computed **server-side** from the booking) → Razorpay Checkout → client posts `{order_id, payment_id, signature}` to `/payments/verify` → HMAC verified server-side → **in one DB transaction**: Payment `SUCCESS`, Booking `CONFIRMED`, inventory committed, coupon usage recorded, cashback scheduled → enqueue ticket PDF + notifications. `POST /payments/webhook` (raw body, signature check, `WebhookEvent` dedupe) is the source of truth and reconciles cases where the client never returns. A reconciliation job expires unpaid bookings and releases holds. Wallet payments and split wallet+gateway payments go through the same `PaymentService`.

---

## 8. Booking architecture

- **Generic core** (`Booking`) + **per-service detail** (1:1 tables) + **per-service `BookingHandler`** implementing `quote()`, `hold()`, `confirm()`, `cancel()`, `refundPolicy()`. `BookingService` orchestrates; handlers contain service-specific rules. No duplicated lifecycle logic.
- **State machine** (single table of allowed transitions, enforced in one place):
  `INITIATED → PENDING_PAYMENT → CONFIRMED → COMPLETED`; `PENDING_PAYMENT → CANCELLED` (timeout/user); `CONFIRMED → CANCELLED → REFUND_PENDING → REFUNDED`.
- **Inventory safety:** seat/room holds in Redis with TTL (10 min) + DB unique constraints / conditional updates at confirm time, inside `prisma.$transaction` with `Serializable` isolation for inventory rows.
- **Reference:** `ZP-{YEAR}-{6 chars Crockford base32}` generated randomly, guaranteed by unique index with retry.
- **Pricing:** `PricingService` returns a breakdown (base, taxes, fees, discount, total) — used by review page, payment, invoice. Coupons validated server-side only.
- **Cancellation:** `CancellationPolicy` rules per service (time-before-travel bands → % refund) → `Refund` record → provider refund or wallet credit → notification.

---

## 9. Provider architecture

```
providers/
  flight/  FlightProvider         → MockFlightProvider   (→ Amadeus/other later)
  bus/     BusProvider            → MockBusProvider
  train/   TrainProvider          → MockTrainProvider
  hotel/   HotelProvider          → MockHotelProvider
  payment/ PaymentProvider        → RazorpayProvider, MockPaymentProvider
  map/     MapProvider            → GoogleMapsProvider, MapboxProvider, MockMapProvider (haversine)
  sms/     SmsProvider            → ConsoleSmsProvider (dev), + vendor adapters later (MSG91/Twilio…)
  email/   EmailProvider          → SmtpEmailProvider (nodemailer), ResendEmailProvider, ConsoleEmailProvider
  notification/ NotificationProvider (fan-out over channels incl. WhatsApp/Push adapters)
  registry.ts  # picks implementation from env: FLIGHT_PROVIDER=mock|amadeus …
```

Controllers and services depend only on the interfaces; `registry.ts` is the only place that knows concrete classes. Mock providers read from the seeded Postgres tables so dev search results are realistic and bookable. Map keys stay server-side; the browser uses a restricted, referrer-locked public key only for tile rendering.

> Train note: live IRCTC booking requires an authorised agent/partner integration. The architecture supports plugging one in; until then trains run on `MockTrainProvider`.

---

## 10. Admin architecture

- `/admin/*` routes, `AdminLayout` with the requested sidebar (Dashboard, Users, Bookings, Flights, Buses, Trains, Hotels, Cabs, Bikes, Holidays, Parcels, Corporate, Drivers, Partners, Payments, Refunds, Wallet, Offers, Coupons, Notifications, Support, Reports, Analytics, Settings).
- Every admin API is under `/api/admin/*` with `authenticate` + `authorize(<permission>)`; sidebar items are filtered by the user's permissions, but the **server** is the enforcement point.
- One reusable `DataTable` (server-side search, filter, sort, pagination, CSV export streamed from the API) powers all list screens.
- Dashboard KPIs come from `ReportsService` aggregate queries (cached 60 s in Redis); charts via Recharts.
- All admin mutations write `AuditLog` (actor, action, entity, before/after diff, IP).

---

## 11. UI page architecture

| Area               | Routes                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Public             | `/`, `/offers`, `/help`, `/contact`, `/holidays`, `/holidays/:id`, legal pages (`/terms`, `/privacy`, `/refund-policy`)            |
| Auth               | `/login`, `/signup`, `/verify-otp`, `/forgot-password`, `/reset-password`                                                          |
| Flights            | `/flights`, `/flights/results`, `/flights/:id`, `/flights/booking`, `/flights/review`, `/flights/payment`, `/flights/confirmation` |
| Buses              | `/buses`, `/buses/results`, `/buses/:id`, `/buses/:id/seats`                                                                       |
| Trains             | `/trains`, `/trains/results`                                                                                                       |
| Hotels             | `/hotels`, `/hotels/results`, `/hotels/:id`, `/hotels/:id/rooms`                                                                   |
| Mobility           | `/cabs`, `/cabs/booking`, `/rides/:id`, `/bikes`                                                                                   |
| Parcel / Corporate | `/parcel`, `/parcel/track/:id`, `/corporate`                                                                                       |
| Account (auth)     | `/wallet`, `/bookings`, `/bookings/:id`, `/profile`                                                                                |
| Admin (role)       | `/admin`, `/admin/<section>`                                                                                                       |

Shared booking steps (review → payment → confirmation) are generic components parameterised by service, so flights/buses/hotels/etc. reuse them. Every route is `React.lazy` code-split. Mobile (<768 px) gets app-style screens matching the reference flows: bottom nav (Home · Bookings · Wallet · Offers · Profile), full-screen step pages, sticky bottom CTA — not a shrunken desktop.

---

## 12. Design system

Derived from the supplied references (red header/splash, white cards, red pill CTAs, icon tiles with red line icons).

```css
:root {
  --primary: #d9141e; /* sampled from logo in references (~#D40408–#E0080F); finalise from original logo file */
  --primary-hover: #b80f18;
  --primary-light: #fdecec;
  --background: #f8fafc;
  --foreground: #111827;
  --muted: #6b7280;
  --border: #e5e7eb;
  --card: #ffffff;
  --success: #16a34a;
  --warning: #f59e0b;
  --danger: #dc2626;
  --radius: 0.875rem;
}
```

- Typography: **Plus Jakarta Sans** (headings/UI) — self-hosted via `@fontsource`, no third-party request.
- Components: shadcn/ui primitives themed with the tokens; pill buttons, 14 px radius cards, soft `shadow-sm/md`, service icon tiles (Lucide icons in red on light-red tiles), segmented tabs (One Way / Round Trip / Multi City).
- Motion: 150–250 ms ease-out on hover/press/step transitions; `prefers-reduced-motion` respected.
- Accessibility: WCAG AA contrast (white on `--primary` passes), visible focus rings, labelled form fields, semantic landmarks.
- Breakpoints: 360 / 480 / 768 / 1024 / 1280 / 1440.

**Logo usage:** a single `<Logo variant="color|white" />` component renders the official file at fixed height with `width:auto` (never stretched), with `alt="ZPROO GO"`. Used everywhere the brief lists (header, auth screens, splash/loader, footer, admin, confirmation, PDFs, emails, favicon).

---

## 13. Development phases

| #     | Phase                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Exit criteria                                                                                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Foundation** — monorepo, Turborepo, shared tsconfig/eslint/prettier, `apps/web` (Vite, Tailwind, shadcn/ui, tokens, Logo, layouts, router skeleton, 404), `apps/api` (Express, config/env validation, Pino, request ID, Helmet, CORS, rate-limit, error classes, envelope, `/api/health`, Swagger shell), Prisma + Postgres connection + identity/platform models + first migration, `packages/*`, docker-compose for Postgres/Redis, `.env.example`, basic CI (lint/typecheck/test/build) | `npm run build`, `typecheck`, `lint`, `test` all green; `docker compose up postgres redis` + `prisma migrate dev` works; web renders branded shell; `/api/health` reports DB+Redis |
| 2     | Auth (OTP, password, JWT, refresh rotation, RBAC, auth pages)                                                                                                                                                                                                                                                                                                                                                                                                                                | Auth test suite green                                                                                                                                                              |
| 3     | Home page (header, hero, search widget, services, deals, destinations, wallet/app promos, footer, SEO)                                                                                                                                                                                                                                                                                                                                                                                       | Lighthouse ≥ 90 perf/a11y on home                                                                                                                                                  |
| 4–11  | Flights → Buses → Trains → Hotels → Cabs → Bikes → Holidays → Parcel (each: schema + migration, provider, API, UI, seed, tests)                                                                                                                                                                                                                                                                                                                                                              | Search→book works end-to-end on mock payment                                                                                                                                       |
| 12    | Corporate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Approval workflow tested                                                                                                                                                           |
| 13–15 | Wallet → Payments (Razorpay) → Booking engine hardening (cancellation/refunds/PDFs)                                                                                                                                                                                                                                                                                                                                                                                                          | Payment + refund integration tests green                                                                                                                                           |
| 16–17 | Notifications (email/SMS/in-app, templates) → Support                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                                                                                    |
| 18–19 | Admin dashboard → Reports & analytics                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Admin authz tests green                                                                                                                                                            |
| 20    | Full test pass (unit, integration, Playwright E2E for flight/bus/train/hotel/cab/wallet)                                                                                                                                                                                                                                                                                                                                                                                                     |                                                                                                                                                                                    |
| 21–23 | Docker images → CI/CD with E2E → production deployment docs                                                                                                                                                                                                                                                                                                                                                                                                                                  |                                                                                                                                                                                    |

After every phase: build web, build api, typecheck, lint, test, verify routes & DB, fix, then stop for approval.

> Payments/booking-engine core (state machine, `PricingService`, `MockPaymentProvider`) is introduced minimally in Phase 4 so flights can be booked end-to-end; Phases 13–15 harden and extend it. This avoids building flights against a stub that later has to be rewritten.

---

## 14. Environment variables

```bash
# ---------- API ----------
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://zproo:zproo@localhost:5432/zproo_go   # pooled URL for Supabase/Neon
DIRECT_DATABASE_URL=postgresql://zproo:zproo@localhost:5432/zproo_go  # direct URL for migrations
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
COOKIE_DOMAIN=
ENCRYPTION_KEY=                # 32-byte base64, for partner API credentials
PAYMENT_PROVIDER=mock          # mock | razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
MAP_PROVIDER=mock              # mock | google | mapbox
GOOGLE_MAPS_API_KEY=
MAPBOX_ACCESS_TOKEN=
EMAIL_PROVIDER=console         # console | smtp | resend
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
RESEND_API_KEY=
EMAIL_FROM="ZPROO GO <no-reply@zproogo.com>"
SMS_PROVIDER=console
SMS_API_KEY=
FLIGHT_PROVIDER=mock
BUS_PROVIDER=mock
TRAIN_PROVIDER=mock
HOTEL_PROVIDER=mock
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
LOG_LEVEL=info

# ---------- Web (public — never put secrets here) ----------
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_MAPS_KEY=          # browser key, HTTP-referrer restricted
VITE_RAZORPAY_KEY_ID=          # public key id only
```

The API validates all variables with Zod at boot and refuses to start with missing/weak secrets in production. `.env` is git-ignored.

---

## 15. Deployment architecture

```
            ┌──────── CDN / static hosting (web) ────────┐
 Users ───▶ │ apps/web build (Nginx container or Vercel/  │
            │ Cloudflare Pages) · SPA fallback · caching  │
            └──────────────┬──────────────────────────────┘
                           │ /api, /socket.io
            ┌──────────────▼──────────────┐     ┌───────────────────┐
            │ API containers (N replicas) │────▶│ Managed Postgres   │
            │ Express + Socket.IO         │     │ (Neon/Supabase/RDS)│
            │ + BullMQ worker process     │     └───────────────────┘
            └──────────────┬──────────────┘     ┌───────────────────┐
                           └───────────────────▶│ Managed Redis      │
                                                │ (Upstash/ElastiCache)
                                                └───────────────────┘
```

- **Images:** `docker/Dockerfile.web` (multi-stage → Nginx), `docker/Dockerfile.api` (multi-stage → `node:20-alpine`, non-root user). Worker runs the same API image with a different command.
- **Release:** CI builds & tests → images pushed → `prisma migrate deploy` as a release step → rolling deploy. Socket.IO uses the Redis adapter + sticky sessions so it scales horizontally.
- **Local:** `docker-compose.yml` with `web`, `api`, `postgres`, `redis`.
- **CI (`.github/workflows/ci.yml`):** install → lint → typecheck → test → build → Playwright E2E (Postgres + Redis service containers). Required status check on PRs.
- **Observability:** Pino JSON logs → platform log sink; `/api/health` (liveness) and `/api/health/ready` (DB + Redis).

---

## 16. Open items needing the product owner

1. **Official logo file.** Still needed. Phase 1 uses the logo extracted, unmodified, from the supplied reference image (see [BRAND.md](BRAND.md)). Replace the PNGs at the same paths when the original file is available.
2. **Brand red.** `#D9141E`, sampled from the references. Re-check against the original logo file.
3. **Imagery.** Still needed. The image pipeline and all 26 photo slots exist (illustrations shown meanwhile). This environment's network policy blocks stock-photo hosts, so either allow them or supply your own licensed photos (see `apps/web/assets-src/images/README.md`).
4. **Admin placement.** Implemented as `/admin` inside `apps/web` (separate lazy chunk). It can move to a standalone `apps/admin` later if you want.
