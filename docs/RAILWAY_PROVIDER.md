# Railway (train) provider

ZPROO GO books trains through a **railway provider** selected with `TRAIN_PROVIDER`. The booking
engine (`apps/api/src/services/booking.service.ts`, `train.service.ts`,
`trainReservation.service.ts`) depends only on the `TrainProvider` interface
(`apps/api/src/providers/train/TrainProvider.ts`); provider HTTP, authentication and payloads stay
inside an adapter.

## What ships today: the development provider (`TRAIN_PROVIDER=mock`)

| Aspect       | Demo behaviour                                                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trains       | **Invented** names and numbers (all start with `Z`, which Indian Railways never uses) on real station codes (`TRAIN_STATIONS` in `@zproo/config`), defined in `packages/catalog/src/trains.ts`                             |
| Availability | Simulated demand per train/date/class/quota, moving AVL → RAC → WL → REGRET; places this deployment sells are counted in `train_inventory`                                                                                 |
| Fares        | Demo per-km fares with reservation, superfast, Tatkal and GST components (whole rupees)                                                                                                                                    |
| Rules        | 60-day booking window, Tatkal opens 10:00 (AC) / 11:00 (non-AC) the day before, booking closes 30 min before departure, Tatkal max 4 passengers, 6 otherwise, cancellation charges as listed in `TRAIN_CANCELLATION_RULES` |
| PNR          | `ZD` + 8 digits — clearly not a real PNR                                                                                                                                                                                   |
| Live status  | Not supported: the API answers `supported: false` and the UI says so                                                                                                                                                       |
| Labelling    | Every search/quote carries `demo: true`; the web app shows the "Demo inventory" banner; PDF and printable tickets are watermarked "not valid for travel"; emails are prefixed `[DEMO]`                                     |

Development test hooks: a contact email containing `+railfail` makes the reservation fail after
payment (full automatic refund); `+railpending` leaves it pending until a status refresh or the
reconciliation job.

**Production refuses to start with `TRAIN_PROVIDER=mock`** (env validation), so demo bookings can
never be sold or silently used as a fallback. The static website (`VITE_DATA_SOURCE=static`) runs
the same demo engine in the browser and is a demo by definition.

## Live booking: what is required

Investigated October 2026:

- Indian Railways e-tickets are sold only by **IRCTC** and its authorised partners. IRCTC appoints
  **Principal Service Providers (PSPs)**, which on-board **Retail Service Providers (RSPs)** with
  their own IRCTC IDs; integration involves IRCTC approval, an integration fee and an annual
  maintenance fee. In 2019 the Delhi High Court held that a platform that was "neither a PSP nor an
  RSP" and had "no privity of contract with IRCTC" could not book tickets by routing customers to
  agents' credentials.
- A public timetable / PNR-status / "live train" data API does **not** grant the right to book.
- Rules a live adapter must respect include Aadhaar-OTP authentication for Tatkal (from July
  2025), Aadhaar-authenticated users only for the first 15 minutes of general reservation opening
  (from 1 October 2025), and agents' blocked windows at opening time. These are enforced by IRCTC /
  the partner, not re-implemented here.
- Do **not** scrape irctc.co.in, automate its CAPTCHA, or share one agent ID across customers.

So live booking needs either (a) a commercial agreement with an authorised PSP/B2B aggregator
that exposes a booking API, or (b) ZPROO's own IRCTC partner approval. Until one is signed there
are no credentials, and the live adapter cannot be written against a real contract.

## Adding a live adapter

1. Implement `TrainProvider` in `apps/api/src/providers/train/<Partner>TrainProvider.ts`:
   - `capabilities()` — only what the partner really supports (quotas, classes, passenger limits,
     berth/food choice, confirm-only, whether passenger ID is required, cancellation, live status).
     The UI offers only these.
   - `search`, `getOffer` — map the partner's availability labels as reported (e.g. `GNWL 23`).
   - `book` — called **after** payment. Must be idempotent on `clientReference` (our booking
     reference). Return `BOOKED` (with PNR and per-passenger status), `FAILED` (refund follows) or
     `PENDING` (outcome unknown; reconciled later via `status`).
   - `status`, `cancellationQuote`, `cancel` (idempotent on `cancellationReference`), `liveStatus`.
   - Throw `TrainProviderError` with `retryable` / `rateLimited` for transient errors; never put
     passenger details or secrets in error messages.
2. Add the value to `TRAIN_PROVIDER` in `apps/api/src/config/env.ts`, its credentials as new env
   variables (validated, required in production) and wire it in `providers/train/index.ts`. The
   factory wraps every adapter in `resilientTrainProvider` (timeouts, bounded retries for reads
   only, 429 mapping, structured logs).
3. If the partner requires identity details per passenger, extend `trainPassengerSchema` behind
   `capabilities.idRequired` and store only what the partner needs (currently nothing is collected).
4. Configure a real payment gateway with refunds (`PaymentProvider.refund`) — failed reservations
   and cancellations refund through it.
5. Run the contract against the partner's sandbox; the API tests in `apps/api/test/trains.test.ts`
   show the expected behaviour for each outcome.

## Operations

- `PROCESSING` bookings (paid, no railway answer yet) are re-checked every minute; after 30 minutes
  without an answer the job logs `Paid train booking still has no railway outcome — needs manual
follow-up`. Money is refunded only when the provider says the reservation failed.
- Refunds that the gateway rejects stay `FAILED` and are retried every minute (`refunds.processPending`).
