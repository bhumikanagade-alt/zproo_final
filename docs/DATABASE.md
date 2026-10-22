# Database

PostgreSQL 16 via Prisma 6. Works with local Postgres, Supabase and Neon.

## Conventions

- Tables and columns are `snake_case` in SQL (`@@map`/`@map`); models and fields are camelCase in code.
- Primary keys: `cuid` strings (not guessable or enumerable).
- Money: integer minor units (paise), never floating point.
- Timestamps: `created_at`, `updated_at`; `deleted_at` for soft deletion (users, addresses, and
  later bookings and inventory). Queries must filter `deleted_at IS NULL`.
- Every foreign key and every column used for filtering or sorting is indexed.
- Secrets are never stored in plain text: refresh tokens and OTPs are stored as hashes; partner API
  credentials will be encrypted (AES-GCM).

## Connection strings

| Provider | `DATABASE_URL`                                         | `DIRECT_DATABASE_URL`             |
| -------- | ------------------------------------------------------ | --------------------------------- |
| Local    | `postgresql://…@localhost:5432/zproo_go`               | same as `DATABASE_URL`            |
| Supabase | Transaction pooler URL (port 6543) + `?pgbouncer=true` | Direct connection URL (port 5432) |
| Neon     | Pooled URL (`-pooler` host)                            | Direct (non-pooled) URL           |

Prisma uses `DIRECT_DATABASE_URL` for migrations and `DATABASE_URL` at runtime.

## Phase 1 schema (identity & platform)

| Table              | Purpose                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------- |
| `users`            | Customers, staff, drivers, partners. Unique `phone` (E.164) and `email` (lower-cased).  |
| `roles`            | The nine system roles (`USER` … `CORPORATE_ADMIN`)                                      |
| `permissions`      | `resource:action[:scope]` keys, e.g. `booking:read:any`                                 |
| `user_roles`       | User ↔ role, with who assigned it                                                       |
| `role_permissions` | Role ↔ permission                                                                       |
| `refresh_tokens`   | Hashed refresh tokens with rotation chain (`family_id`, `replaced_by_id`)               |
| `otp_codes`        | Hashed OTPs with purpose, channel, attempts and expiry                                  |
| `auth_identities`  | Linked Google / Apple accounts                                                          |
| `addresses`        | Saved addresses with optional coordinates                                               |
| `audit_logs`       | Append-only log of security and admin actions (actor, entity, before/after, request ID) |
| `system_settings`  | Admin-editable runtime settings (JSON values)                                           |

The roles and permissions come from `@zproo/types` (`Permission`, `ROLE_PERMISSIONS`), the same
constants the API checks against. `npm run db:seed` syncs them, so code and database cannot drift.
A test in `apps/api` asserts the shared enums equal the Prisma enums.

Soft-deleted users keep their unique `phone`/`email`. Account deletion (Phase 2) anonymises
those fields so the number can be registered again.

## Phase 4 schema (flights, bookings, payments)

| Table                | Purpose                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `airports`           | IATA code, city, country and IANA time zone (all flight times are stored as UTC instants)                                             |
| `airlines`           | Two-letter code and name                                                                                                              |
| `flights`            | A scheduled service: route, days of week (`1`=Mon … `7`=Sun), aircraft, base fare, seats per cabin                                    |
| `flight_segments`    | Legs of a service (non-stop = 1) with local departure time, day offset and duration                                                   |
| `flight_inventory`   | Seats sold per service, date and cabin. Holds use `sold = sold + n WHERE sold + n <= capacity` (atomic)                               |
| `bookings`           | One per purchase, any service: reference `ZP-YYYY-XXXXXX`, status, amounts in paise, hold expiry, `(user_id, idempotency_key)` unique |
| `booking_passengers` | Travellers on a booking                                                                                                               |
| `flight_bookings`    | One per flight leg: offer snapshot (JSON, what the customer saw), PNR, ticket numbers, seats held                                     |
| `payments`           | Gateway orders and results; unique `provider_order_id` / `provider_payment_id`                                                        |

## Phase 5 schema (buses)

| Table               | Purpose                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `bus_operators`     | Operator code, name and rating                                                                                            |
| `buses`             | A coach: type (seater, sleeper, seater/sleeper), A/C, electric, amenities                                                 |
| `bus_seats`         | Seat layout: number, deck, row, column, kind, seat premium (`fare_percent`), ladies-only                                  |
| `bus_routes`        | City pair (city codes from `@zproo/config`) and distance                                                                  |
| `bus_route_points`  | Boarding points (minutes after departure) and dropping points (minutes before arrival)                                    |
| `bus_schedules`     | A regular service: coach × route × departure time × weekdays, base fare                                                   |
| `bus_trips`         | One departure of a schedule on a date, created on first booking                                                           |
| `bus_seat_bookings` | Seats held or sold. **Unique `(trip_id, seat_id)`** makes double-booking impossible; rows are deleted when a hold expires |
| `bus_bookings`      | The bus journey of a booking: trip snapshot, chosen points, seat numbers, operator PNR                                    |

`booking_passengers` gains `age` and `seat_number` (buses ask for age and assign a seat per traveller).

Booking lifecycle: `PENDING_PAYMENT` (seats held) → `CONFIRMED` on verified payment, or `CANCELLED`
(`HOLD_EXPIRED`) when the hold runs out and the seats are released. Every transition is a
conditional update on the current status, so concurrent requests and API instances cannot apply
the same change twice.

## Railway schema (trains) — migration `20261012082509_railway_bookings`

Additive only (no existing table or column changed). `BookingStatus` gains `PROCESSING`.

| Table                 | Purpose                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `train_bookings`      | The train journey of a booking: offer snapshot, class/quota (checked codes), confirm-only flag, reservation status, PNR (unique per provider), provider reference, chart status, attempts, per-passenger fare |
| `train_passengers`    | Railway details per `booking_passengers` row: berth preference, food choice, status (CONFIRMED/RAC/WAITLIST/CANCELLED), booking and current status, coach/berth, fare |
| `train_cancellations` | Cancellation requests; **unique `(train_booking_id, idempotency_key)`**; charges and refund as confirmed by the provider        |
| `refunds`             | Gateway refunds for any booking; **unique `idempotency_key`** per cause (`train-failed:<id>`, `train-cancel:<id>`), so nothing is refunded twice |
| `train_inventory`     | Development provider only: places sold per train run, class and quota, updated with a conditional increment                    |

Stations and timetables come from the provider (the mock uses `TRAIN_STATIONS` in `@zproo/config`
and the demo network in `@zproo/catalog`); search results are cached in Redis for 60 seconds.
Train bookings need no seed data. Audit events: `BOOKING_CREATED`, `PAYMENT_CAPTURED`,
`TRAIN_RESERVATION_CONFIRMED`, `TRAIN_RESERVATION_FAILED`, `TRAIN_CANCELLATION_REQUESTED`,
`TRAIN_CANCELLED`, `REFUND_COMPLETED`.

## Seed data

`npm run db:seed` loads, idempotently:

- **Reference data** (every environment): 9 roles, 28 permissions, default system settings.
- **Flight timetable** (development/test; the mock provider only): 58 airports (12 in
  Maharashtra), 6 fictional airlines (Saffron Air, Monsoon Airways, Deccan Blue, Coral Wings,
  Himalaya Air, Gulf Star) and 222 services on 40 routes, including 9 one-stop connections. Half the
  routes serve Maharashtra (Pune, Mumbai, Navi Mumbai, Nagpur, Chhatrapati Sambhajinagar, Kolhapur,
  Shirdi, Nashik, Nanded, Sindhudurg). Fictional names keep demo inventory from being mistaken for
  real airline fares.

Search places (`packages/config/src/places.ts`) are listed Maharashtra first, starting with Pune,
then the rest of India, then international: 58 airports, 102 cities (55 in Maharashtra, including
every district headquarters and popular hill stations, beaches and pilgrimage towns) and 76 railway
stations (38 in Maharashtra). Former names (Aurangabad, Ahmednagar, Osmanabad, Bombay…) are
searchable.

- **Bus network** (development/test; the mock provider only): 8 fictional operators (Sahyadri
  Skyline, Deccan Dhruv Tours, Konkan Kinara Travels, …), 6 coach types (Volvo A/C sleeper, A/C
  seater/sleeper, Volvo semi-sleeper, electric A/C seater, non-A/C sleeper and seater) and 458
  services on 80 routes. Maharashtra first: Pune and Mumbai to Nashik, Kolhapur, Satara, Shirdi,
  Sambhajinagar, Solapur, Nagpur, Konkan, Mahabaleshwar and more, plus Nagpur–Amravati,
  Kolhapur–Goa and the main interstate corridors. Boarding points are real localities (Swargate,
  Shivajinagar, Wakad, Dadar, Vashi, Panvel…).
- **Demo users** (skipped when `NODE_ENV=production`): 100 users with deterministic Indian names,
  one account per staff role, customers, and some saved addresses. **No passwords are stored.**
  Sign in with mobile OTP; in development the code is shown on screen.

| Role             | Mobile number           |
| ---------------- | ----------------------- |
| SUPER_ADMIN      | 9000000001              |
| ADMIN            | 9000000002              |
| SUPPORT          | 9000000003              |
| OPERATOR         | 9000000004              |
| DRIVER           | 9000000005, 9000000006  |
| HOTEL_PARTNER    | 9000000007              |
| TRAVEL_PARTNER   | 9000000008              |
| CORPORATE_ADMIN  | 9000000009              |
| Customers (USER) | 9000000010 – 9000000100 |

## Workflow

```bash
npm run db:migrate -- --name add_flights   # create + apply a migration in development
npm run db:deploy                          # apply pending migrations (CI / production)
npm run db:seed                            # idempotent seed
npm run db:studio                          # browse data
```

CI applies all migrations to a fresh database, checks that the result matches
`schema.prisma` exactly, and runs the seed.

## Upcoming models

Each phase adds its models in its own migration. The full model plan (bookings, flights, buses,
trains, hotels, rides, parcels, holidays, corporate, wallet, payments, refunds, offers,
notifications, support, partners) is in
[IMPLEMENTATION_PLAN.md §3–4](IMPLEMENTATION_PLAN.md#3-database-erd-plan). The large demo
dataset (100 users, 30 flights, …) grows with those phases.
