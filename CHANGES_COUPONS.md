# Coupons: admin panel → customer checkout, end to end

## What was wrong
Coupons made in **Admin → Marketing → Coupons** were saved and checked by the API at booking time, but the
customer side only knew two hard-coded codes (`ZPROO10`, `BUS100`). Customers could not see admin coupons, and
typing one in was rejected by the browser before the server was ever asked. Codes longer than 10 characters were
also refused although the admin form allows 20.

## What changed
**API**
- `GET /api/coupons/public?service=BUS` (no sign-in): live coupons only (active, in date, not used up, valid on the service). No usage counts are exposed.
- `POST /api/coupons/validate` (signed in) `{ code, service, orderPaise }`: the same checks as booking (dates, service, minimum order, total limit, per-customer limit, percent cap) and returns the discount, or says why not.
- `apps/api/src/services/coupon.service.ts`: `listPublic()` and `check()`; one shared `CouponService` is now exposed from the container.
- Bus bookings still redeem the coupon inside the booking transaction, so the admin panel's **Used** column moves and limits hold.

**Website (bus checkout)**
- Traveller page: "View offers" lists the live admin coupons for buses (plus the two built-in codes); **Apply** asks the server; **Remove** clears it; the real refusal reason is shown ("This coupon has expired", "Spend at least ₹999…").
- Review page: the discount is re-checked on the current fare instead of the hard-coded codes; if the server now refuses the coupon, the reason is shown and the booking goes ahead without it.
- Promo code limit raised from 10 to 20 characters (`BUS_PROMO_MAX`, shared with the API schema).

**Demo (static) mode** mirrors all of the above in the browser (`static/admin/publicCoupons.ts`), including usage counts and the per-customer limit.

**Admin form**: "Percent off" now steps by 1 (the API only accepts whole percentages).

**Tests**: new API test "lets customers see and use an admin coupon end to end" (create → list → validate → book → used count → per-customer limit); promo-length test updated.

## Notes
- Coupons are applied to **bus**, **hotel**, **train** and **flight** bookings (see `CHANGES_FLIGHT_COUPONS.md` for flights). Cabs are covered too (see `CHANGES_CAB_COUPONS.md`).
- Run: `npm install && npm run typecheck && npm test` (not run here: no network access to install dependencies).

## Customer bus cancellation shown in the admin panel
- **API mode:** the admin booking drawer now reads "Cancelled: by customer — <reason>" (it used to show a raw "CUSTOMER:" prefix). Status, refund and the Refunds page already followed the cancellation; a new API test checks this.
- **Demo mode:** a customer's bus cancellation now saves its reason and refund, so the admin Bookings drawer shows the reason, the refund amount and "Refund completed", and the refund appears on the admin Refunds page (before, demo mode showed only a bare "Booking cancelled" with no refund).

## Hotel coupons (admin panel → hotel checkout)
Create a coupon in **Admin → Marketing → Coupons** with *Valid on* = Hotels (or leave empty for all services) and it appears on the hotel Review page for every customer straight away.

**Website (hotel review page)**
- "Coupon / offer" card now matches the bus checkout: **View offers** lists the live admin coupons for hotels (plus the built-in ZPROO10 / STAY15), **Apply** asks the server, **Remove** clears it, and the server's reason is shown when refused ("This coupon has expired", "Spend at least ₹5,000…").
- The discount comes off the room price (taxes are not discounted), same as before. Percent cap, minimum order, dates, active switch, total limit and per-customer limit are all the admin's settings.
- The price is re-checked against the current room price on the Review and Payment pages (`useStayCoupon`), so a coupon that expired or was switched off meanwhile stops applying and says why.
- On **Pay / Confirm booking** the coupon use is recorded with the server (`POST /api/coupons/redeem`), so the admin panel's **Used** column moves and limits hold. If it was just used up or refused, the coupon is removed and the guest sees the new total before paying again.

**API**
- `POST /api/coupons/redeem` (signed in) `{ code, service, orderPaise, bookingRef }`: re-checks the coupon and records one use. The same `bookingRef` + code counts once, so a retry is safe. (Hotel stays finish in the browser, so unlike buses they cannot redeem inside a server booking transaction.)
- `CouponService.redeemForReference()`; shared `discountFor()` helper; new `couponRedeemSchema`.

**Demo (static) mode** has the same `/coupons/redeem` (`static/admin/publicCoupons.ts`).

**Tests added:** API (`lets a hotel stay use an admin coupon…`), demo engine, hotel pricing (`AppliedCoupon`), hotel review page (admin coupon applied / refused with reason). The hotel page tests now render inside a `QueryClientProvider`.

**Not run here** (no network to install dependencies): `npm install && npm run typecheck && npm test`.

## Train coupons (admin panel → train checkout)
Create a coupon in **Admin → Marketing → Coupons** with *Valid on* = Trains (or all services) and it shows on the train Review page for every customer.

**Website (train review page)**
- New "Offers & coupons" card (`TrainCouponCard`): **View offers** lists live train coupons, **Apply** asks the server, **Remove** clears it, and the server's reason is shown when refused.
- The fare summary shows the discount and the button shows the new total. The coupon is re-checked against the current railway quote (`useTrainCoupon`), so one that expired or was switched off stops applying and says why. A different train/class clears the coupon.

**API (`POST /api/trains/book`)**
- New optional `promoCode`. The server checks it (service TRAIN, dates, minimum order, limits) against the fare **including taxes and platform fee**, and `expectedTotalPaise` must be the fare **after** the coupon (otherwise `PRICE_CHANGED`). An unknown/refused code is a 400 on `body.promoCode`.
- The use is recorded inside the booking transaction, so the admin **Used** column moves and limits hold. The booking stores `discountAmountPaise` and `metadata.promoCode`.
- **Refunds stay within what was paid:** each passenger's stored fare is reduced by their share of the discount, so partial cancellations refund from the discounted amount. A failed reservation already refunded the booking total (which is the discounted total).

**Demo (static) mode** mirrors all of this (`static/trains.ts`).

**Tests added:** API (`applies a coupon made in the admin panel…` in trains.test.ts) and demo engine (trainEngine.test.ts).

Not run here (no network): `npm install && npm run typecheck && npm test`.
