# Bike coupons (admin panel → bike booking)

Create a coupon in **Admin → Marketing → Coupons** with *Valid on* = Bikes (or leave it empty for all services) and it
shows in the bike booking for every customer straight away. Bikes now work the same way as buses, hotels, trains,
flights and cabs.

## Website (bike booking)
- New **"Offers & coupons"** card (`BikeCouponCard`) on the **Review** page and the **Payment** page (above the price
  breakdown). A coupon applied on one step stays applied on the other.
  - **View offers** lists the live admin coupons valid on bikes.
  - **Apply** asks the server (`POST /api/coupons/validate`, service `BIKE`); **Remove** clears it.
  - If the server refuses a code the real reason is shown ("This coupon has expired", "Spend at least ₹500…",
    "This coupon does not apply to this service", "You have already used this coupon…").
  - Coupons need a signed-in customer (same as hotels, trains and cabs). Signed-out visitors see a "Sign in" link.
- The discount is worked out on the **rental total**: rental + add-ons + one-way fee + GST. The refundable security
  deposit is never discounted. The price breakdown shows a "Coupon CODE" line after GST, and the total, "Payable now"
  and the Pay button all use the discounted total. The total can never go below ₹1.
- The coupon is re-checked against the current total (`useBikeCoupon`): if the dates, add-ons or hubs change so the
  minimum order is no longer met, or the coupon expired / was switched off / was used up, it is removed and the reason is shown.
- **On Pay / Confirm** the server checks the coupon again and records its use (`POST /api/coupons/redeem`, service
  `BIKE`, inside `createBooking` in `features/bikes/api.ts`). The admin **Used** column moves and the total-use and
  per-customer limits hold. If it was just used up or refused, nothing is booked, the coupon is removed and the rider
  sees the new total before paying again. Pay-at-pickup rentals use the coupon too (the amount to pay at pickup is the discounted total).
- The saved booking keeps `couponCode`, `couponDiscount` and `grossTotal` in its quote, so the confirmation page,
  "My bike bookings" and the admin Bookings drawer (a "Coupon CODE" price line and the coupon column) show the right amounts.

## API
No API or database change was needed: `GET /coupons/public?service=BIKE`, `POST /coupons/validate` and
`POST /coupons/redeem` already accept service `BIKE` (it was already in the admin "Valid on" list).

## Demo (static) mode
Works through the existing static coupon engine. The demo admin data now includes **BIKE10** (10% off bike rentals,
up to ₹300, on rentals of ₹500 or more).

## Changed / new files
- `apps/web/src/features/bikes/components/BikeCouponCard.tsx` (new)
- `apps/web/src/features/bikes/useBikeCoupon.ts` (new)
- `apps/web/src/features/bikes/pricing.ts` (`computeQuote` takes an optional `coupon`), `types.ts`, `store.ts`, `api.ts`
- `apps/web/src/features/bikes/components/PriceBreakdown.tsx`
- `apps/web/src/pages/bikes/BikeReviewPage.tsx`, `BikePaymentPage.tsx`
- `apps/web/src/static/admin/sources.ts` (coupon shown in the admin booking drawer), `static/admin/demo.ts` (BIKE10)

## Tests added
- API (`apps/api/test/adminPanel.test.ts`, "lets a bike rental use an admin coupon…").
- Demo engine (`staticEngine.test.ts`): BIKE10 end to end.
- Pricing (`features/bikes/bikes.test.ts`, "computeQuote with an admin coupon").

## Not run here
No network access to install dependencies, so the tests and `typecheck` were **not executed**; the changed files were
only syntax-checked. Please run: `npm install && npm run typecheck && npm test` (API tests need the Postgres from `docker-compose.yml`).
