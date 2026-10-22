# Flight coupons (admin panel → flight checkout)

Create a coupon in **Admin → Marketing → Coupons** with *Valid on* = Flights (or leave it empty for all services)
and it shows on the flight **Review** page for every customer straight away. Flights now work the same way as
buses, hotels and trains.

## Website (flight review page)
- New **"Offers & coupons"** card (`FlightCouponCard`), below "Seats, meals & baggage":
  - **View offers** lists the live admin coupons valid on flights.
  - **Apply** asks the server (`POST /api/coupons/validate`); **Remove** clears it.
  - If the server refuses a code, the real reason is shown ("This coupon has expired", "Spend at least ₹3,000…",
    "This coupon does not apply to this service", "You have already used this coupon…").
- The fare summary shows the **Discount** line and "You saved ₹…"; the total is the discounted total.
- The discount is worked out on the **whole total**: fare + taxes + any paid seats, meals and baggage.
- The coupon is re-checked against the current total (`useFlightCoupon`), so one that expired, was switched off
  or used up stops applying and says why. Choosing a different flight clears the coupon.
- Changing the coupon (or any seat/meal/baggage choice) makes a fresh booking request, so the booking always
  carries the right total. Retrying the same request is still safe (idempotency key).

## API (`POST /api/flights/book`)
- New optional `promoCode` (max 20 characters, same limit as bus and train).
- The server checks it (service FLIGHT, dates, active switch, minimum order, total limit, per-customer limit,
  percent cap) against the full total and `expectedTotalPaise` must be the total **after** the coupon,
  otherwise `PRICE_CHANGED`. An unknown or refused code is a 400 on `body.promoCode`.
- A coupon that would cover the **entire** fare is refused (a booking cannot be paid at ₹0).
- The use is recorded **inside the booking transaction**, so the admin **Used** column moves and the limits hold
  even if two customers check out at once. The booking stores `discountAmountPaise` and `metadata.promoCode`.
- Payment charges the discounted `totalAmountPaise`, and the ticket page already prints the "Promotion discount" line.
- No database migration is needed (the `discount_amount_paise` column and coupon tables already exist).
- Files: `packages/validation/src/booking.ts` (`promoCode`; `BUS_PROMO_MAX` moved above the flight schema),
  `apps/api/src/services/booking.service.ts`.

## Demo (static) mode
Mirrors all of the above (`apps/web/src/static/flights.ts`), using the same `publicCoupons` module as trains. The demo
admin data already has **ZPFLY** (10% off domestic flights, up to ₹1,000, on fares above ₹3,000).

## New / changed files
- `apps/web/src/features/flights/components/FlightCouponCard.tsx` (new)
- `apps/web/src/features/flights/useFlightCoupon.ts` (new)
- `apps/web/src/features/flights/draft.ts` (`promoCode`, `promoDiscountPaise`, `setPromo`)
- `apps/web/src/pages/flights/FlightReviewPage.tsx`

## Tests added
- API (`apps/api/test/flights.test.ts`, "flight coupons made in the admin panel"): customers see the coupon, apply
  it, the booking and payment use the discounted total, the Used count moves, one use per customer, wrong
  service / unknown / expired / switched-off / minimum order / whole-fare refusals, and no coupon = plain fare.
- Demo engine (`staticEngine.test.ts`): ZPFLY end to end.
- Review page (`flightPages.test.tsx`): refused code shows the reason; accepted code shows the saving and the
  booking request carries `promoCode` and the discounted `expectedTotalPaise`.

## Not run here
No network access to install dependencies in this environment, so these were **not executed**. The changed files
were only syntax-checked. Please run: `npm install && npm run typecheck && npm test` (API tests need the Postgres
from `docker-compose.yml`).
