# Cab booking module (demo)
Frontend-only, simulated data. Code: `apps/web/src/features/cabs` (types, data, fare, validation, bookingLogic, store, tests, components) and `apps/web/src/pages/cabs` (screens). Routes added in `routes/routes.tsx`.
Flow: /cabs → /cabs/results → /cabs/route → /cabs/pickup → /cabs/details → /cabs/passenger → /cabs/payment → /cabs/confirmation/:ref → /rides/:id → /rides/:id/completed; history at /cabs/bookings.
Coupons: ZPROO10, CAB50 (min ₹150), FIRST20. Bookings persist in localStorage key `zproo-cabs-demo`.
Run: npm install && npm run typecheck|lint|test|build --workspace @zproo/web ; npm run dev --workspace @zproo/web

## v2 changes
- Real OpenStreetMap (Leaflet, tiles from tile.openstreetmap.org) with road routes from the public OSRM server and place lookup via Nominatim. Needs internet in the browser. Run `npm install` (adds `leaflet` and `@types/leaflet` to apps/web).
- Measured road distance feeds the fare calculation (falls back to a local estimate if OSRM is unreachable).
- New "Finding your driver" loading page (/cabs/finding/:ref) after payment, then confirmation with a 4-digit ride OTP (also on tracking and booking details).
- New SVG vehicle illustrations (sedan, SUV, mini, premium, auto, bike) and hover/entrance animations (respect reduced motion).

## v3 changes
- Cab page hero is now the Zproo Go car banner (`public/assets/banners/cab-1920.webp`, `cab-1024.webp`); the SUV illustration was removed from the hero.
- Passenger details: name accepts letters only, mobile accepts digits only (max 10, a pasted +91/91 is stripped and shown as a fixed +91 prefix), stricter email check. See `features/cabs/validation.ts`.
- UPI payment shows a scannable QR (amount pre-filled) generated in-browser by `features/cabs/qr.ts` (no dependency). Receiver VPA is set in `features/cabs/upi.ts`. Payment confirmation is still simulated.

## v4 changes
- Offers redesigned: shared data in `features/offers/offers.ts`, card in `features/offers/OfferCard.tsx`, styles in `offers.css`. Home section is an animated carousel; `/offers` has service filter tabs (`?service=BUS` etc.). Codes tagged `Live` work in checkout; others are display-only until coupon rules are added.

## v5 changes
- Offer cards are plain gradients (no patterns, lines or circles); filter bar on /offers sits in normal flow so it can no longer be covered by the header.
- Cab banner image: logo reduced in size inside the image (`public/assets/banners/cab-*.webp`).
- Cab search: defaults for date/time are repaired on load, failed searches focus the first invalid field with a summary message, and pickup/drop now show live suggestions for any place in India (OpenStreetMap Nominatim, needs internet) in addition to the saved places.

## v6 changes
- Ride-mode tabs now work: Round trip (return date/time, billed both ways + 1 h waiting), Outstation (optional return), Airport transfer (To/From airport toggle, airport required on the right side), Hourly rental (2/4/8/12 h packages, 12 km/h included, no drop). Mode flows into results, route, payment and the booking record.
- Swap button between pickup and drop uses horizontal arrows and flips on hover (`.cab-swap` in cabs.css).


## Admin coupons
Coupons made in Admin → Marketing → Coupons for Cabs (or all services) now appear in the "Offers & coupons" card on the Ride details and Payment steps, and their use is recorded on payment. See `CHANGES_CAB_COUPONS.md`.
