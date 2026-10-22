# Holiday coupons (admin panel → holiday booking)

Create a coupon in **Admin → Marketing → Coupons** with *Valid on* = Holidays (or leave it empty for all services) and it
shows in the holiday booking for every customer straight away. Holidays now work the same way as buses, hotels, trains,
flights, cabs and bikes.

## Website (Holidays)
The Holidays page is a self-contained page (`public/holiday-explorer.html`) shown in an iframe, so it cannot call the API
itself. It now asks the ZPROO GO page around it (`postMessage`), and that page uses the normal coupon API.

- **Package page**: the booking box lists up to 3 live holiday coupons with a COPY button (the old fixed ZPROO500 / WELCOME10
  codes are gone, so only coupons made in the admin panel exist).
- **Review and pay step** (booking drawer): new **"Offers & coupons"** card.
  - Live holiday coupons are listed with their discount, minimum booking amount, validity date and an APPLY button.
    A coupon whose minimum is not met shows "Add ₹X more to use this".
  - Or type a code and press Apply / Enter. **Remove** clears it.
  - The server's real reason is shown when a code is refused ("This coupon has expired", "Spend at least ₹10,000…",
    "This coupon does not apply to this service", "You have already used this coupon…").
  - Coupons need a signed-in customer (same as hotels, trains and cabs). Signed-out visitors see "Sign in to use a coupon"
    with a Sign in button (it returns them to /holidays).
- The discount is worked out on the package total (adults + children). The price box, "Total payable", the Pay button and the
  voucher all use the discounted total, and the total never goes below ₹1.
- The coupon is checked again when the pay step opens (so a changed date or traveller count, an expired, switched-off or
  used-up coupon is handled) and **again when you pay**: the use is recorded with the booking ID
  (`POST /api/coupons/redeem`, service `HOLIDAY`). The admin **Used** column moves and the total-use and per-customer limits
  hold. If it was just used up or refused, nothing is booked, the coupon is removed and the new total is shown.
- The FAQ text and the "Exclusive offers" line no longer mention the old fixed codes.

## API
No API or database change was needed: `GET /coupons/public?service=HOLIDAY`, `POST /coupons/validate` and
`POST /coupons/redeem` already accept service `HOLIDAY` (it was already in the admin "Valid on" list).

## Demo (static) mode
Works through the existing static coupon engine. The demo admin data now includes **HOLIDAY10** (10% off holiday packages,
up to ₹3,000, on bookings of ₹10,000 or more).

## Changed / new files
- `apps/web/public/holiday-explorer.html` (coupon card, offers list, bridge, apply / remove / re-check / redeem on pay)
- `apps/web/src/pages/HolidayExplorerPage.tsx` (answers the iframe's coupon requests; same-origin and same-window only)
- `apps/web/src/features/holidays/couponBridge.ts` (new) and `couponBridge.test.ts` (new)
- `apps/web/src/features/coupons/api.ts` (`couponsApi.live`)
- `apps/web/src/static/admin/demo.ts` (HOLIDAY10)

## Tests added
- API (`apps/api/test/adminPanel.test.ts`, "lets a holiday booking use an admin coupon…").
- Demo engine (`staticEngine.test.ts`): HOLIDAY10 end to end.
- Bridge (`features/holidays/couponBridge.test.ts`).

## Not run here
No network access to install dependencies, so `typecheck` and the test suites were **not executed**; the changed TypeScript
was only syntax-checked. The holiday page itself was run in a headless browser against a fake parent page: offers list,
wrong code, apply, discounted total, pay, voucher and the redeem call with the booking ID, plus the signed-out message.
Please run: `npm install && npm run typecheck && npm test` (API tests need the Postgres from `docker-compose.yml`).
