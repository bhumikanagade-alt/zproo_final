# Cab coupons (admin panel → cab booking)

Create a coupon in **Admin → Marketing → Coupons** with *Valid on* = Cabs (or leave it empty for all services) and it
shows in the cab booking for every customer straight away. Cabs now work the same way as buses, hotels, trains and flights.

## Website (cab booking)
- New **"Offers & coupons"** card (`CabCouponCard`) on two steps of the cab flow: **Ride details** (under the fare
  breakdown) and **Payment**. A coupon applied on one step stays applied on the other.
  - **View offers** lists the live admin coupons valid on cabs, then the built-in codes (ZPROO10, CAB50, FIRST20, CAB150, RIDE15).
  - **Apply** asks the server (`POST /api/coupons/validate`, service `CAB`); **Remove** clears it.
  - If the server refuses a code the real reason is shown ("This coupon has expired", "Spend at least ₹150…",
    "This coupon does not apply to this service", "You have already used this coupon…").
  - Admin coupons need a signed-in customer (same as hotels and trains). Signed-out visitors see a "Sign in" link;
    the built-in codes still work for everyone.
- The discount is worked out on the fare the customer sees before the coupon (fare + platform fee + GST). The fare
  table shows the Discount line, and the Pay button shows the discounted total.
- The coupon is re-checked against the current fare (`useCabCoupon`), so one that expired, was switched off or used
  up is removed and the reason is shown. Changing pickup/drop or the vehicle clears the coupon, as before.
- **On Pay & confirm** the use is recorded with the server (`POST /api/coupons/redeem`, service `CAB`), so the
  admin **Used** column moves and the total limit and per-customer limit hold. If the coupon was just used up or refused,
  it is removed and the customer sees the new total before paying again. A retry of the same payment counts once
  (one booking reference per payment attempt).
- The booking keeps `couponCode` and the discounted fare, so tracking, receipts and "My rides" show the right amount.

## API
No API or database change was needed: `GET /coupons/public?service=CAB`, `POST /coupons/validate` and
`POST /coupons/redeem` already accept service `CAB` (it was already in the admin "Valid on" list).

## Demo (static) mode
Works the same through the existing static coupon engine. The demo admin data already has **FIRSTRIDE**
(50% off a first cab ride, up to ₹100), so it appears under "View offers" for cabs.

## Changed / new files
- `apps/web/src/features/cabs/components/CabCouponCard.tsx` (new)
- `apps/web/src/features/cabs/useCabCoupon.ts` (new)
- `apps/web/src/features/cabs/fare.ts` (`calcFare` takes an optional server-checked `adminDiscount`)
- `apps/web/src/features/cabs/bookingLogic.ts`, `store.ts` (`couponDiscount`, `newReference`, `confirmBooking(reference)`)
- `apps/web/src/pages/cabs/CabDetailsPage.tsx`, `CabPaymentPage.tsx`

## Tests added
- API (`apps/api/test/adminPanel.test.ts`, "lets a cab ride use an admin coupon…"): listed for cabs only, check, cap,
  minimum order, wrong service, redeem once, Used count moves, one use per customer.
- Demo engine (`staticEngine.test.ts`): FIRSTRIDE for cabs end to end.
- Fare logic (`features/cabs/cabs.test.ts`): admin discount in `calcFare` and in the booking.

## Not run here
No network access to install dependencies, so the tests and `typecheck` were **not executed**; the changed files were
only syntax-checked. Please run: `npm install && npm run typecheck && npm test` (API tests need the Postgres from `docker-compose.yml`).
