# ZPROO GO — Updated Local Setup

## What was fixed

The web app was configured with `VITE_DATA_SOURCE=api`, so Login and Bus Results were calling `http://localhost:5000/api`. Because PostgreSQL was not running, the API returned `Database unavailable`.

The built-in **static/demo data source** is now opt-in: set `VITE_DATA_SOURCE=static` in your local `.env` to use it. Login/OTP, bus search, seats, booking demo, payments demo and tickets can then run in the browser without Docker, PostgreSQL or Redis. If `VITE_DATA_SOURCE` is missing the app uses the real API.

## Run it

Requirements:
- Node.js 20.11+ (Node 22 recommended)
- npm 10+

From this `zproo-go` folder:

```cmd
npm install
npm run dev -w @zproo/web
```

Open:

```text
http://localhost:5173
```

## Important

The root `.env` now contains:

```env
VITE_DATA_SOURCE=static
VITE_API_URL=/api
```

Do **not** change `VITE_DATA_SOURCE` to `api` unless PostgreSQL and Redis are running and the Prisma migrations/seed have been applied.

## Admin panel

In local demo mode, the demo staff sign-in is described in `docs/LOCAL_DEMO.md`. With the real API, staff sign in with their own accounts; see `docs/ADMIN_PANEL.md`.

## Demo OTP

In static mode, enter any valid Indian mobile number. The OTP is generated locally and displayed by the existing login/verification flow.

## If you later want the real API

Set:

```env
VITE_DATA_SOURCE=api
VITE_API_URL=/api
```

Then start PostgreSQL + Redis, run migrations/seed, and start the API.
