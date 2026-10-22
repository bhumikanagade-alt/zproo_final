# API

- Base URL: `/api` (development: `http://localhost:5000/api`)
- Interactive docs: `/api/docs` (Swagger UI) and `/api/docs/openapi.json`. Enabled by default
  outside production (`ENABLE_API_DOCS`).
- The OpenAPI document is generated from the same Zod schemas the API validates with.

## Response envelope

```json
{ "success": true, "message": "Success", "data": {} }
```

```json
{
  "success": false,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "details": [{ "path": "body.phone", "message": "Enter a valid 10-digit mobile number" }],
  "requestId": "0538849f-36e1-4e3d-ba46-dc6a47022590"
}
```

`requestId` matches the `X-Request-Id` response header and the server logs. Clients may send a
well-formed `X-Request-Id` (8–128 chars of `A-Z a-z 0-9 . _ -`) to correlate across services.

## Error codes

| HTTP | `errorCode`               | When                                                            |
| ---- | ------------------------- | --------------------------------------------------------------- |
| 400  | `BAD_REQUEST`             | Malformed JSON or request                                       |
| 400  | `VALIDATION_ERROR`        | Input failed validation (`details` lists each field)            |
| 401  | `UNAUTHENTICATED`         | Not signed in, or session expired                               |
| 401  | `INVALID_CREDENTIALS`     | Wrong mobile number/email or password                           |
| 400  | `INVALID_OTP`             | Wrong code (message says how many attempts are left)            |
| 400  | `OTP_EXPIRED`             | Code expired, already used, or too many attempts                |
| 403  | `ACCOUNT_DISABLED`        | Account suspended or deactivated                                |
| 400  | `PROVIDER_NOT_CONFIGURED` | That social sign-in is not enabled                              |
| 403  | `FORBIDDEN`               | Authenticated but lacking permission                            |
| 404  | `NOT_FOUND`               | Unknown route or record                                         |
| 409  | `CONFLICT`                | Unique constraint (e.g. phone already registered)               |
| 409  | `OFFER_EXPIRED`           | The fare is no longer sold; search again                        |
| 409  | `PRICE_CHANGED`           | Fare differs from `expectedTotalPaise` (new total in `details`) |
| 409  | `SOLD_OUT`                | Not enough seats left to hold                                   |
| 409  | `SEAT_UNAVAILABLE`        | A chosen bus seat was taken by someone else                     |
| 409  | `BOOKING_EXPIRED`         | Seat hold ran out before payment completed                      |
| 409  | `INVALID_STATE`           | Action not allowed in the booking's current status              |
| 402  | `PAYMENT_ERROR`           | Payment failed or could not be verified                         |
| 413  | `PAYLOAD_TOO_LARGE`       | Body over 100 kB                                                |
| 429  | `RATE_LIMITED`            | Too many requests (see `RateLimit` headers)                     |
| 500  | `DATABASE_ERROR`          | Unexpected database error                                       |
| 500  | `INTERNAL_ERROR`          | Anything unexpected (details are logged, never returned)        |
| 502  | `PROVIDER_ERROR`          | An upstream supplier (airline, payment…) failed                 |
| 503  | `SERVICE_UNAVAILABLE`     | A dependency is down                                            |

## Endpoints

### System

| Method | Path                | Description                                                            |
| ------ | ------------------- | ---------------------------------------------------------------------- |
| GET    | `/api/health`       | Health report: version, uptime, database and Redis status (always 200) |
| GET    | `/api/health/ready` | Readiness probe: 200 when all dependencies are up, else 503            |
| GET    | `/api/health/live`  | Liveness probe: 200 while the process serves requests                  |

Health endpoints are exempt from rate limiting.

### Authentication

| Method | Path                              | Auth           | Description                                                                         |
| ------ | --------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| POST   | `/api/auth/send-otp`              | —              | Send a 6-digit code to a mobile number (same response for new and existing numbers) |
| POST   | `/api/auth/verify-otp`            | —              | Existing user → signed in. New number → `SIGNUP_REQUIRED` + 15-minute `signupToken` |
| POST   | `/api/auth/register`              | signup token   | Create the account (name, optional email and password) and sign in                  |
| POST   | `/api/auth/login`                 | —              | Mobile number or email + password                                                   |
| POST   | `/api/auth/social/{google,apple}` | —              | Sign in with a provider ID token (enabled when its client ID is configured)         |
| POST   | `/api/auth/refresh`               | refresh cookie | Rotate the refresh cookie, return a new access token                                |
| POST   | `/api/auth/logout`                | refresh cookie | End this device's session (idempotent)                                              |
| POST   | `/api/auth/logout-all`            | bearer         | End every session on every device                                                   |
| POST   | `/api/auth/forgot-password`       | —              | Send a reset code by SMS or email (always the same response)                        |
| POST   | `/api/auth/reset-password`        | —              | Code + new password; signs out all sessions                                         |

Every sign-in response has the shape `{ user, accessToken, expiresIn }` and sets the refresh cookie.

- **Access token**: JWT (HS256), 15 minutes, sent as `Authorization: Bearer <token>`. The web app
  keeps it in memory only.
- **Refresh token**: random 256-bit value in an `HttpOnly`, `SameSite=Lax` cookie `zp_rt` scoped to
  `/api/auth` (`Secure` in production), valid 30 days. Each use returns a new one. Replaying an old
  one is treated as theft and ends that session everywhere.
- **Development**: with `SMS_PROVIDER=console`, `send-otp` and `forgot-password` responses include
  `devCode`, and the code is printed in the API terminal. The console provider is refused in
  production.

Mobile OTP sign-up flow:

```
POST /auth/send-otp { phone }                   → { expiresIn: 300, resendIn: 60 }
POST /auth/verify-otp { phone, otp }            → { status: "SIGNUP_REQUIRED", signupToken, phone }
POST /auth/register { signupToken, fullName, email?, password? } → 201 { user, accessToken, expiresIn } + cookie
```

### Account

| Method | Path      | Auth   | Description                                       |
| ------ | --------- | ------ | ------------------------------------------------- |
| GET    | `/api/me` | bearer | The signed-in user with roles and permissions     |
| PATCH  | `/api/me` | bearer | Update profile (`fullName`); other fields ignored |

### Admin

Every `/api/admin/*` route requires `admin:access` plus its own permission.

| Method | Path               | Permission      | Description                                                                       |
| ------ | ------------------ | --------------- | --------------------------------------------------------------------------------- |
| GET    | `/api/admin/users` | `user:read:any` | Paginated users; `search` (name, phone, email), `role`, `status`, `page`, `limit` |

### Flights (Phase 4)

| Method | Path                     | Auth             | Description                                                                                                                  |
| ------ | ------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/flights/search`    | —                | `trip`, `from`, `to`, `date`, `return` or `legs=PNQ.DEL.2026-10-25,…`; `adults`, `children`, `infants`, `cabin`. Cached 60 s |
| GET    | `/api/flights/{offerId}` | —                | Current price and seats for one offer; `adults`, `children`, `infants`                                                       |
| POST   | `/api/flights/book`      | `booking:create` | Holds seats and creates a `PENDING_PAYMENT` booking. **Requires `Idempotency-Key`**                                          |

`POST /api/flights/book` body: `{ offerIds, passengers[], contact: { email, phone }, expectedTotalPaise }`.
The server re-prices every offer; if the total differs it answers `409 PRICE_CHANGED` and nothing is
held. Retrying with the same `Idempotency-Key` returns the original booking. Seats are held for
`BOOKING_HOLD_MINUTES`; unpaid bookings are then cancelled and the seats released (a job runs every
minute on each API instance; the state change is conditional, so instances never double-release).

### Buses (Phase 5)

| Method | Path                        | Auth             | Description                                                                                     |
| ------ | --------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| GET    | `/api/buses/search`         | —                | `from`, `to` (city codes, e.g. `pune`, `mumbai`), `date`. Departures in time order. Cached 60 s |
| GET    | `/api/buses/{tripId}`       | —                | Operator, coach, amenities, boarding/dropping points with times, cancellation policy            |
| GET    | `/api/buses/{tripId}/seats` | —                | Seat layout per deck with live availability and per-seat price incl. GST (never cached)         |
| POST   | `/api/buses/book`           | `booking:create` | Holds the seats and creates a `PENDING_PAYMENT` booking. **Requires `Idempotency-Key`**         |

`POST /api/buses/book` body: `{ tripId, boardingPointId, droppingPointId, passengers: [{ seatNumber, firstName, lastName, age, gender }], contact, expectedTotalPaise }`.
One traveller per seat, up to 6. Ladies-only seats need a female traveller (`400` otherwise). The
server re-prices the seats (`409 PRICE_CHANGED`) and holds them atomically (`409 SEAT_UNAVAILABLE`
if any was taken). Payment, tickets (`/bookings/{reference}/ticket.pdf`) and hold expiry work exactly
as for flights; booking details carry a `bus` object instead of `flights`.

### Trains

Railway reservations go through the provider selected by `TRAIN_PROVIDER` (development: `mock`,
invented trains, `demo: true` on every result). See [RAILWAY_PROVIDER.md](RAILWAY_PROVIDER.md).

| Method | Path                                                 | Auth                 | Description                                                                                                  |
| ------ | ---------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/trains/capabilities`                           | —                    | Quotas, classes, passenger limits, berth/food/confirm-only options, cancellation, live status support        |
| GET    | `/api/trains/stations?q=`                            | —                    | Station autocomplete by code, name or city                                                                   |
| GET    | `/api/trains/search`                                 | —                    | `from`, `to` (station codes), `date`, `class`, `quota`, `passengers`. Class-wise AVL/RAC/WL and fares. 60 s cache |
| GET    | `/api/trains/offers/{offerId}?quota=`                | —                    | Live availability for one train ("refresh availability"). Never cached                                       |
| POST   | `/api/trains/quote`                                  | —                    | `{ offerId, travelClass, quota, passengers }` → server-calculated fare, live availability, RAC/WL warnings   |
| POST   | `/api/trains/book`                                   | `booking:create`     | Creates a `PENDING_PAYMENT` booking. **Requires `Idempotency-Key`**. `409 PRICE_CHANGED / SOLD_OUT / OFFER_EXPIRED` |
| POST   | `/api/trains/bookings/{reference}/refresh`           | `booking:read:own`   | Reconciles a pending reservation, or fetches the latest PNR / chart status                                   |
| POST   | `/api/trains/bookings/{reference}/cancellation-quote`| `booking:cancel:own` | `{ passengerIds }` → eligibility, charges and refund under the provider's rules                              |
| POST   | `/api/trains/bookings/{reference}/cancel`            | `booking:cancel:own` | `{ passengerIds }`. **Requires `Idempotency-Key`**; a retry returns or resumes the same cancellation         |
| GET    | `/api/trains/{trainNumber}/live-status?date=`        | —                    | Running status, or `supported: false` (no data is invented)                                                  |

Lifecycle: `PENDING_PAYMENT` → (gateway signature verified) `PROCESSING` → the provider is asked to
reserve → `CONFIRMED` with a PNR (passengers may be CNF, RAC or WL; never shown as confirmed unless
they are) **or** `REFUND_PENDING` → `REFUNDED` if the provider refuses. An unknown outcome (timeout)
keeps the booking `PROCESSING`; a background job (every minute) and the refresh endpoint reconcile
it. Cancelling every passenger moves the booking to `REFUND_PENDING` → `REFUNDED` (or `CANCELLED`
when nothing is refundable); a partial cancellation keeps it `CONFIRMED` with
`paymentStatus: PARTIALLY_REFUNDED`. Booking details carry a `train` object (offer snapshot, class,
quota, PNR, reservation and chart status, passenger statuses, cancellations, refunds).

### Bookings

| Method | Path                                   | Permission         | Description                                                        |
| ------ | -------------------------------------- | ------------------ | ------------------------------------------------------------------ |
| GET    | `/api/bookings`                        | `booking:read:own` | The signed-in user's bookings, newest first                        |
| GET    | `/api/bookings/{reference}`            | `booking:read:own` | Details. Other users' bookings are `404` unless `booking:read:any` |
| GET    | `/api/bookings/{reference}/ticket.pdf` | `booking:read:own` | E-ticket PDF; `409` until the booking is confirmed                 |

### Payments

| Method | Path                             | Permission       | Description                                                                                                 |
| ------ | -------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| POST   | `/api/payments/create`           | `booking:create` | `{ bookingReference }` → order for the booking's amount (reuses an open order)                              |
| POST   | `/api/payments/verify`           | `booking:create` | `{ paymentId, providerPaymentId, signature }`; signature checked server-side, then the booking is confirmed |
| POST   | `/api/payments/{paymentId}/fail` | `booking:create` | Record a failed/abandoned attempt; the booking stays payable until the hold ends                            |
| POST   | `/api/payments/mock/complete`    | `booking:create` | **Development only** (not mounted in production): simulates the gateway returning `success` or `failure`    |

The amount always comes from the booking on the server; the client's view of the payment is never
trusted. If a payment is captured after the hold expired, the booking stays cancelled and the
payment is recorded as `FAILED` with "refund due" for finance (audit `PAYMENT_REFUND_DUE`).

The full endpoint plan (flights, buses, trains, hotels, rides, holidays, parcels, wallet, bookings,
payments, offers, support, admin) is in
[IMPLEMENTATION_PLAN.md §5](IMPLEMENTATION_PLAN.md#5-api-architecture); each is documented here as
its phase ships.

### Rate limits

| Scope                                  | Limit                             | Key                      |
| -------------------------------------- | --------------------------------- | ------------------------ |
| All `/api` routes                      | 300 / minute (configurable)       | IP                       |
| `/api/auth/*` (except refresh, logout) | 60 / 10 minutes                   | IP (generous: CGNAT)     |
| Sending a code (per flow)              | 1 / minute                        | phone or email           |
| Sending a code (all flows)             | 5 / hour                          | phone or email           |
| Verifying a code                       | 20 / 15 minutes, 5 tries per code | phone or email           |
| Password login                         | 10 / 15 minutes                   | account (phone or email) |

Limits are shared across API instances through Redis. If Redis is down, requests are allowed
through; the per-code attempt limit in PostgreSQL still applies.

## Conventions

- JSON only; request bodies up to 100 kB.
- Pagination: `?page=1&limit=20` (max 100) → `data: { items, page, limit, total }`.
- Money: integer minor units (paise) with an explicit currency.
- Mutations that move money require an `Idempotency-Key` header (from Phase 4).
