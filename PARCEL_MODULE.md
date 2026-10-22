# Parcel module

The parcel booking prototype (`ZPROO GO - Parcel Booking v3.html`) is now part of the app, with the
same screens, flow, validation, pricing and animations. It runs in the browser like the cab module
(no API needed) and keeps data in `localStorage`.

## Pages

| Route                       | Page                | Prototype step        |
| --------------------------- | ------------------- | --------------------- |
| `/parcel`                   | `ParcelsPage`       | Home / book a parcel  |
| `/parcel/sender`            | `ParcelSenderPage`  | 1 · Sender & receiver |
| `/parcel/details`           | `ParcelDetailsPage` | 2 · Parcel details    |
| `/parcel/review`            | `ParcelReviewPage`  | 3 · Summary           |
| `/parcel/payment`           | `ParcelPaymentPage` | 4 · Payment           |
| `/parcel/confirmation/:id`  | `ParcelConfirmationPage` | 5 · Confirmed    |
| `/parcel/bookings`          | `ParcelBookingsPage`| My parcels            |
| `/parcel/track[/:id]`       | `ParcelTrackPage`   | Track a parcel        |
| `/parcel/help`              | `ParcelHelpPage`    | Help & support        |

The home-page **Parcel** search tab (`/parcel?from=411001&to=400001&weight=2`) pre-fills the
booking form (PIN codes are mapped to cities).

## Code layout

```
apps/web/src/
  features/parcels/
    data.ts          Cities, services, handling options, FAQ, tracking steps (sample data)
    logic.ts         Pure functions: quote, charges, validation, bookings (unit tested)
    store.ts         Zustand stores: persisted draft/bookings, non-persisted rate quote
    share.ts         Receipt download, tracking link
    parcels.css      Prototype styles, all scoped under `.pcl`
    parcels.test.ts  Vitest tests for logic.ts
    components/      Icon, Art (SVG illustrations), motion hooks, ui (shell, fields, charges card…)
  pages/parcels/     One file per route above
```

## Behaviour notes

- **Pricing** is the prototype's mock rate service: `40 + chargeable kg × 26 + zone × 14`, ×1 / ×1.5 / ×2.2
  for Standard / Express / Same-day, plus handling, 18% GST and the `PARCEL10` promo (10%).
  Chargeable weight is the larger of actual and volumetric (L×W×H ÷ 5000).
- Open any parcel page with `?fail` in the URL to see the "rate service unavailable" state; Retry recovers.
- **Wallet**: wallet payments and cancellation refunds use the shared `useWallet` store (paise), so the
  balance matches the `/wallet` page. `credit()` now accepts an optional transaction label.
- Demo only: payments are simulated, tracking is advanced with the "Demo: move to next status" button.

## Connecting a real backend

1. Replace `fetchQuote` in `logic.ts` with a call to a courier rate API.
2. Replace `confirm()` in `store.ts` with a `POST /parcels` call (the Prisma schema already has parcel enums).
3. Replace the demo status button with real tracking events.


## Update: banner, design-system alignment and form validation

- **Home banner**: `/parcel` now opens with the "Parcel Service – Your Package, Our Priority" banner
  (`public/assets/parcel/parcel-banner-{1024,1920}.webp`) instead of the red hero. The "Offers for you" block
  was removed; "Popular routes" now spans the full width.
- **Design system** (`ZPROO_GO_Web_Booking_Design.pdf`): parcel pages use Poppins (loaded in `parcels.css`),
  h1 28/36 · 700, h2 20/28 · 600, body 15/24, labels 12/16 · 500, price 22/28 · 700, 12px cards and buttons,
  8px inputs, 20px search card, pill chips, and the 2px ink focus ring with 2px offset on every control.
- **Sender & receiver validation** (`logic.ts`: `partyFieldError`, `sanitize*`):
  - Name: letters, spaces, `. ' -` only; digits/symbols are blocked while typing with an inline message.
  - Mobile: fixed `+91` prefix, digits only, exactly 10, must start with 7, 8 or 9, otherwise
    "Enter correct mobile number". A pasted `+91 …`, `91…` or `0…` number is trimmed automatically.
    The stored value stays the 10 digits (shown as `+91 …` on the summary).
  - Address: 8–150 characters and must contain letters (not only numbers).
  - Pincode: digits only, exactly 6, cannot start with 0 (city is still auto-detected).
  - Fields validate on blur and again on Continue (focus jumps to the first error).
  - The same mobile/name rules apply to the Help contact form.

## Update: sub-nav removed, promo codes go through the Offers page

- The "Parcel / My parcels / Track / Wallet / Help" strip is no longer shown on the parcel pages (`ParcelShell`).
- **Apply with an empty promo box** now opens `/offers?service=…&returnTo=…` (cab payment page and parcel charges card).
  The Offers page shows a "Back to payment / booking" bar; copying a code stores it for the trip back
  (`features/offers/offerReturn.ts`) and the coupon box is pre-filled with it, ready to tap **Apply**.
  Only same-site return paths are accepted.
- Offers page now lists the codes the checkouts accept: cabs `CAB50`, `FIRST20`, `CAB150`, `RIDE15`, `ZPROO10`;
  parcels `PARCEL10` (10%) and `SHIP20` (20%).
- The cab page uses the shared `TravelHero` (same height, fade and search-card overlap as Bus / Flights / Trains).
  `TravelHero` got a `cab` image and a `showText={false}` option because the cab photo carries its own logo.

## Update: cab hero blur + promo shown only as a deduction

- Cab hero (`TravelHero image="cab"`): taller banner (300 / 400 / 480 / 560px by breakpoint), image anchored so the logo and
  car both stay in frame, and a progressive blur + fade towards the bottom edge like the Flights banner.
- Once a promo / coupon is applied it no longer shows a code box: parcel pages (`ChargesCard`) and the cab payment page show
  an "applied" line with a **Remove** button, and the amount appears as a deduction in the summary
  ("Promo PARCEL10 −₹…", "Coupon CAB50 −₹…") and the total.


## Update: promo codes now come from the admin panel
Parcel coupons are created in **Admin → Marketing → Coupons** (Valid on = Parcels) and used in the "Offers & coupons" card on the
review and payment steps. The hard-coded `PARCEL10` / `SHIP20` table was removed. See `CHANGES_PARCEL_COUPONS.md`.
