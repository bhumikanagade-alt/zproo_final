# Environment variables

One `.env` file at the repository root is read by the API, Prisma and Vite. Copy
`.env.example` to start. `.env` is git-ignored. Never commit it.

- The API validates its variables at startup (`apps/api/src/config/env.ts`) and exits with a
  list of the invalid **names** (never values).
- `KEY=` with nothing after it means "not set".
- Only variables prefixed `VITE_` reach the browser. **Never put a secret in a `VITE_` variable.**

## API

| Variable                 | Required | Default                 | Notes                                                                                                                                |
| ------------------------ | -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV`               | no       | `development`           | Set by the deployment environment, **not** in `.env`: Vite would otherwise build development React. `test` is set by the test runner |
| `PORT`                   | no       | `5000`                  |                                                                                                                                      |
| `LOG_LEVEL`              | no       | `info`                  | `fatal`…`trace`, `silent`                                                                                                            |
| `APP_VERSION`            | no       | `0.1.0`                 | Reported by `/api/health`; set from the release tag                                                                                  |
| `DATABASE_URL`           | **yes**  |                         | `postgres://` or `postgresql://` (pooled URL on Supabase/Neon)                                                                       |
| `DIRECT_DATABASE_URL`    | no       |                         | Direct URL for migrations (Supabase/Neon)                                                                                            |
| `REDIS_URL`              | **yes**  |                         | `redis://` or `rediss://` (TLS)                                                                                                      |
| `FRONTEND_URL`           | no       | `http://localhost:5173` | Used in links and as the default CORS origin                                                                                         |
| `CORS_ORIGINS`           | no       | `FRONTEND_URL`          | Comma-separated allowlist                                                                                                            |
| `TRUST_PROXY`            | no       | `0`                     | Proxy hops in front of the API (for correct client IPs)                                                                              |
| `RATE_LIMIT_WINDOW_MS`   | no       | `60000`                 |                                                                                                                                      |
| `RATE_LIMIT_MAX`         | no       | `300`                   | Requests per IP per window                                                                                                           |
| `ENABLE_API_DOCS`        | no       | on outside production   | Swagger UI at `/api/docs`                                                                                                            |
| `JWT_SECRET`             | prod     | random in dev           | ≥ 32 chars. Signs access tokens; keys OTP hashes. Development generates a throwaway one (sessions reset on restart)                  |
| `JWT_REFRESH_SECRET`     | prod     | random in dev           | ≥ 32 chars, must differ from `JWT_SECRET`. Keys refresh-token hashes                                                                 |
| `JWT_ACCESS_TTL`         | no       | `15m`                   | Access token lifetime: number + `s`, `m` or `h`                                                                                      |
| `REFRESH_TOKEN_TTL_DAYS` | no       | `30`                    | 1–90                                                                                                                                 |
| `COOKIE_DOMAIN`          | no       |                         | Set when web and API use different subdomains (e.g. `.zproogo.com`)                                                                  |
| `GOOGLE_OAUTH_CLIENT_ID` | no       |                         | Enables Google sign-in (ID tokens must have this audience)                                                                           |
| `APPLE_CLIENT_ID`        | no       |                         | Enables Apple sign-in (Services ID)                                                                                                  |
| `SMS_PROVIDER`           | no       | `console`               | `console` prints codes (development only; refused in production)                                                                     |
| `EMAIL_PROVIDER`         | no       | `console`               | `console` prints emails (development only; refused in production)                                                                    |
| `FLIGHT_PROVIDER`        | no       | `mock`                  | `mock` = built-in timetable with fictional airlines (development only; refused in production)                                        |
| `BUS_PROVIDER`           | no       | `mock`                  | `mock` = built-in network with fictional operators (development only; refused in production)                                         |
| `TRAIN_PROVIDER`         | no       | `mock`                  | `mock` = demo railway with invented trains, simulated availability and demo PNRs (development only; refused in production). See [RAILWAY_PROVIDER.md](RAILWAY_PROVIDER.md) |
| `TRAIN_PROVIDER_TIMEOUT_MS` | no    | `15000`                 | 1000–120000. Per-call timeout for the railway provider                                                                               |
| `TRAIN_PROVIDER_RETRIES` | no       | `2`                     | 0–5. Extra attempts for read-only railway calls (search, availability, status). Booking and cancellation are never retried blindly   |
| `TRAIN_SERVICE_FEE_PAISE`| no       | `0`                     | Platform fee per train booking in paise, added to the server-calculated total and shown as "Service fee"                            |
| `PAYMENT_PROVIDER`       | no       | `mock`                  | `mock` = simulated gateway with signed results (development only; refused in production)                                             |
| `BOOKING_HOLD_MINUTES`   | no       | `15`                    | 5–60. How long seats are held for an unpaid booking                                                                                  |
| `BRAND_LOGO_PATH`        | no       |                         | Logo PNG for PDF tickets; defaults to `apps/web/public/assets/brand/zproo-go-logo.png`                                               |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

## API: reserved for later phases

These appear in `.env.example` so the full configuration surface is visible. Each is validated
from the phase that starts using it.

| Phase         | Variables                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| Before launch | `SMS_API_KEY` with a real SMS provider adapter                                                           |
| 7 Suppliers   | `HOTEL_PROVIDER` (`mock` until a real adapter exists). Live railway credentials: see RAILWAY_PROVIDER.md |
| 8 Maps        | `MAP_PROVIDER`, `GOOGLE_MAPS_API_KEY`, `MAPBOX_ACCESS_TOKEN`                                             |
| 14 Payments   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (with `PAYMENT_PROVIDER=razorpay`)   |
| 16 Email      | `EMAIL_PROVIDER`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `RESEND_API_KEY` |
| 18 Partners   | `ENCRYPTION_KEY`                                                                                         |

## Web (public)

| Variable                | Default        | Notes                                                                                    |
| ----------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `VITE_DATA_SOURCE`      | `static`       | `static`: the site runs alone with demo data in the browser. `api`: use the ZPROO GO API |
| `VITE_API_URL`          | `/api`         | Empty in development → Vite proxies `/api` to the API                                    |
| `VITE_SITE_URL`         | current origin | Absolute URL for canonical links and social cards                                        |
| `VITE_GOOGLE_CLIENT_ID` |                | Same as `GOOGLE_OAUTH_CLIENT_ID`; shows "Continue with Google"                           |
| `VITE_GOOGLE_MAPS_KEY`  |                | Phase 8. Browser key **restricted by HTTP referrer**                                     |
| `VITE_RAZORPAY_KEY_ID`  |                | Phase 14. Public key ID only, never the secret                                           |
