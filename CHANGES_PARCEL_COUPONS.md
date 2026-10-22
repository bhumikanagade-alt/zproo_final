# Parcel coupons (admin panel → parcel booking)

Create a coupon in **Admin → Marketing → Coupons** with *Valid on* = Parcels (or leave it empty for all services) and it
shows in the parcel booking for every customer straight away. Parcels now work the same way as buses, hotels, trains,
flights, cabs, bikes and holidays.

## Website (parcel booking)
- New **"Offers & coupons"** card (`ParcelCouponCard`) on the **Review** step and the **Payment** step. A coupon applied
  on one step stays applied on the other.
  - **View offers** lists the live admin coupons valid on parcels, with the discount, the minimum amount and an
    "Add ₹X more to use this" hint when the parcel is below the minimum.
  - Type a code and press **Apply** (or Enter). **Remove** clears it.
  - The server's real reason is shown when a code is refused ("This coupon has expired", "Spend at least ₹200…",
    "This coupon does not apply to this service", "You have already used this coupon…").
  - Coupons need a signed-in customer (same as hotels, trains, cabs and bikes). Signed-out visitors see a "Sign in" link.
- The discount is worked out on the **gross amount: delivery + handling + GST**. The charges box shows a
  "Coupon CODE −₹…" line, and the total and Pay button use the discounted total (never below ₹1).
- The coupon is re-checked against the current amount (`useParcelCoupon`): if the weight, service or handling changes so the
  minimum is no longer met, or the coupon expired / was switched off / was used up, it is removed and the reason is shown.
- **On Pay now** the server checks the coupon again and records its use (`POST /api/coupons/redeem`, service `PARCEL`).
  The admin **Used** column moves and the total-use and per-customer limits hold. If it was just used up or refused,
  nothing is booked, the coupon is removed and the customer sees the new total before paying again. One booking ID is made
  per payment attempt, so a retry counts once.
- The saved booking keeps `coupon` and `disc`; the receipt shows a "Coupon CODE: -₹…" line.

## Coupon given back (failed payment or cancellation)
- **Wallet payment refused after the coupon was used:** the coupon use is released straight away (`POST /api/coupons/release`),
  so the customer does not lose the coupon. The same happens if the booking could not be created, or if the server's
  amount changed during payment.
- **Cancelling a parcel:** the refund goes to the wallet as before, and the coupon use is released: the admin **Used** count
  goes down by one and the customer can use the coupon again. The cancel dialog and the toast say so. If the server cannot be
  reached at that moment, the refund still happens and the toast says the coupon could not be given back right now.
- Only the customer who used the coupon can release it, and releasing twice (or a never-used reference) does nothing.
- API: new `POST /coupons/release { code, bookingRef }` (signed in) → `{ released }`; `CouponService.releaseForReference()`;
  `couponReleaseSchema`. Demo mode has the same route (`static/admin/publicCoupons.ts`, `static/server.ts`).
- Tests: API (parcel coupon test), demo engine (parcel coupon test).
- Not covered: closing the browser in the middle of a payment (after the coupon use is recorded and before the booking exists)
  leaves the use counted until the same booking is paid again or released.

## What changed from before
The old hard-coded codes (`PARCEL10` 10% and `SHIP20` 20%) and the "Apply with an empty box → Offers page" round trip are gone:
only coupons made in the admin panel exist now. The promo box in the side summary was replaced by the card above
(the side summary only shows the deduction). In demo mode `PARCEL10` and `SHIP20` exist as ordinary admin coupons.

## API
No API or database change was needed: `GET /coupons/public?service=PARCEL`, `POST /coupons/validate` and
`POST /coupons/redeem` already accept service `PARCEL` (it was already in the admin "Valid on" list).

## Demo (static) mode
Works through the existing static coupon engine. The demo admin data already had **PARCEL10** and now also **SHIP20**
(20% off, up to ₹150, on ₹200 or more, one use per customer).

## Changed / new files
- `apps/web/src/features/parcels/components/CouponCard.tsx` (new), `useParcelCoupon.ts` (new)
- `apps/web/src/features/parcels/logic.ts` (`computeCharges` takes a server-checked coupon; `gross`, booking `coupon`/`disc`, receipt line),
  `store.ts` (`coupon` / `setCoupon`, `confirm(bookingId)`), `data.ts` (hard-coded promo table removed)
- `apps/web/src/features/parcels/components/ui.tsx` (`ChargesCard` shows the deduction only)
- `apps/web/src/pages/parcels/ParcelReviewPage.tsx`, `ParcelPaymentPage.tsx` (card; redeem on pay; release on failure), `ParcelBookingsPage.tsx` (release on cancel)
- `apps/api/src/services/coupon.service.ts`, `apps/api/src/routes/index.ts`, `packages/validation/src/admin.ts`, `apps/web/src/features/coupons/api.ts`, `static/server.ts`, `static/admin/publicCoupons.ts` (release route)
- `apps/web/src/static/admin/demo.ts` (SHIP20), `sources.ts` (coupon and discount line in the admin booking drawer)

## Tests added / updated
- API (`apps/api/test/adminPanel.test.ts`, "lets a parcel booking use an admin coupon…").
- Demo engine (`staticEngine.test.ts`): PARCEL10 / SHIP20 end to end.
- Parcel logic (`features/parcels/parcels.test.ts`): coupon in `computeCharges`, ₹1 floor, booking and receipt.

## Good to know
- Parcel bookings are created in the browser. In demo (static) mode the admin Bookings page reads them from the same browser, so booked and cancelled parcels (with the coupon and the refund) show there. With a real API there is no parcel booking route yet, so parcels do not reach the admin panel; the coupon's **Used** count still moves.
- The static Offers page (`/offers`) still lists `PARCEL10` / `SHIP20` text; they only work while a coupon with that code is live in the admin panel.

## Not run here
No network access to install dependencies, so `typecheck` and the test suites were **not executed**; the changed TypeScript
was only syntax-checked. Please run: `npm install && npm run typecheck && npm test` (API tests need the Postgres from `docker-compose.yml`).
