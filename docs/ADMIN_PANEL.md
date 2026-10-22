# Admin panel

The admin panel lives at **`/admin`** in the same web app. It works in both data modes:

| Mode | Where data comes from | Use it for |
| --- | --- | --- |
| **Static / demo** (local development only, `VITE_DATA_SOURCE=static`) | This browser: bookings made on the site plus ~6 months of generated sample data (switch off in **Settings → Demo data**) | Trying the panel with no server |
| **API** (default, `VITE_DATA_SOURCE=api`) | PostgreSQL through `/api/admin/*` | Production (production builds require it) |

Both modes use the same request/response contract (`packages/types/src/admin.ts`), the same validation
(`packages/validation/src/admin.ts`) and the same analytics code (`packages/utils/src/adminAnalytics.ts`),
so every screen behaves identically.

## Signing in

**Demo mode** (local development only) — the built-in staff accounts and their sign-in are listed in
[LOCAL_DEMO.md](LOCAL_DEMO.md). They are never part of a production build.

**API mode** — the database seed creates the same staff by mobile number (sign in with OTP, see
`docs/DATABASE.md`). In production there are no seeded accounts: the owner signs up on the website, then
on the server run

```bash
npm run admin:grant -- +919876543210 SUPER_ADMIN    # or an email address; any role name works
```

and signs in again. After that, roles are managed from **People → Users**.

## Sections

| Group | Section | What you can do | Permission |
| --- | --- | --- | --- |
| Overview | Dashboard | Net revenue, bookings, average order, new customers (vs previous period); revenue and bookings per day; revenue by service; top routes; refunds waiting; open tickets; latest bookings | `booking:read:any` |
| | Analytics | Same data over 7/30/90/365 days: service share, average order by service, status mix, payment methods | `report:read` |
| Operations | Bookings | Search (reference, name, mobile, route), filter by service / status / dates, sort, CSV export of every match; booking drawer with travellers, fare, payments, refunds, timeline; **cancel with or without a full refund** (frees held seats) | read `booking:read:any`, cancel `booking:manage` |
| | Support | Tickets sorted by urgency; conversation with replies and internal notes; status, priority; log new tickets | `support:ticket:manage` |
| | Drivers | KYC status, vehicle, licence, online status, rating | `driver:manage` |
| Inventory | Flights, Buses, Trains, Hotels, Cabs, Bikes, Holidays, Parcels | Browse each catalogue, see bookings and revenue, and **hide/show any item on the website** (hidden flights, buses and trains disappear from search) | `inventory:manage` |
| Finance | Payments | Every gateway attempt with success rate, failures, refunds | `payment:read:any` |
| | Refunds | Approve (sends to the gateway), mark refunded, mark failed, retry | read `payment:read:any`, act `refund:approve` |
| | Wallet | Wallet ledger and manual credits/debits | `wallet:manage` |
| | Reports | Revenue per day, by service, bookings, payments, refunds, sign-ups — preview and **download CSV** (opens in Excel with ₹ intact) | `report:read` |
| Marketing | Offers | Promotions shown on the **Offers page** ("Running now") | `offer:manage` |
| | Coupons | Percentage/flat codes, caps, minimum order, services, dates, usage limits | `offer:manage` |
| | Notifications | Campaigns by audience and channel — send now, schedule or draft | `offer:manage` |
| People | Users | Search, filter by role/status, user drawer with booking stats; **suspend / deactivate / reactivate** (signs them out everywhere); **edit roles** (super admin) | read `user:read:any`, status `user:manage`, roles `role:manage` |
| | Partners | Airlines, operators, hotels, fleets with GSTIN and commission | `partner:manage` |
| System | Audit log | Every change made in the panel, who made it and when | `audit:read` |
| | Settings | Announcement bar, **maintenance mode**, services on sale, support contacts, fees and policies | view `admin:access`, change `settings:manage` |

The sidebar only shows sections the signed-in person may use; the API (or the demo engine) checks the same
permission on every request, so hiding a link is never the only protection.

## What settings change on the website

* **Announcement bar** — shown above the header on every page, with an optional link.
* **Maintenance mode** — a notice on every page; new flight, bus and train bookings are refused (HTTP 503).
* **Services on sale** — switching a service off shows a notice on its pages and refuses new bookings for it.
* **Hidden catalogue items** — removed from flight, bus and train search results.
* **Offers** — active offers appear on the Offers page.

## API

All endpoints are under `/api/admin`, require a bearer token, and are listed in Swagger UI
(`/api/docs`, tag *Admin*). Public reads: `GET /api/settings/public`, `GET /api/offers/public`.

Panel-managed documents (coupons, offers, tickets, notifications, partners, drivers, wallet adjustments)
are stored in the `admin_records` table (migration `20261016090000_admin_panel`); settings and hidden
catalogue items are rows in `system_settings`. Bookings, payments, refunds, users and the audit log are
read from their own tables.

## Code map

```
apps/web/src/pages/admin/          one page per section
apps/web/src/features/admin/       api hooks, table/filter/drawer components, charts, generic CRUD page
apps/web/src/static/admin/         the in-browser admin engine (demo mode) and sample-data generator
apps/api/src/services/admin.service.ts, controllers/admin.controller.ts, routes/admin.routes.ts
apps/api/src/middleware/bookingGate.ts   maintenance mode, paused services, hidden items
apps/api/test/adminPanel.test.ts         integration tests against PostgreSQL
```


## Coupons at checkout

Coupons made in **Marketing → Coupons** are listed to customers by `GET /api/coupons/public?service=BUS` and checked by
`POST /api/coupons/validate`; see [CHANGES_COUPONS.md](../CHANGES_COUPONS.md). Bus checkout uses them today.
