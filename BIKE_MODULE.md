# Bike Booking module (frontend, mock data)

Route map (all public, no payment step):

| Route                              | Page                                  |
| ---------------------------------- | ------------------------------------- |
| `/bikes`                           | Listing, search, filters              |
| `/bikes/:id`                       | Bike details                          |
| `/bikes/:id/book`                  | Booking form + summary                |
| `/bikes/confirmation/:reference`   | Mock confirmation                     |

The **Bikes** entry already existed in the header / home services (`config/services.ts`); `/bikes`
used to render the "Coming soon" placeholder and now renders the real page (`routes.tsx`).

## Files (all new, except `routes.tsx`)

```
apps/web/src/features/bikes/
  types.ts            domain types (shape expected from the future API) + BikeApiError
  rules.ts            pricing / policy constants (business rules pending: edit here only)
  mock/               bikes.mock.ts, locations.mock.ts  ← the ONLY place mock data lives
  api.ts              listBikes / getBike / listLocations / createBooking (mock-backed)
  hooks.ts            react-query hooks over api.ts
  store.ts            zustand: schedule draft, customer draft, mock bookings (localStorage)
  pricing.ts          computeQuote()
  validation.ts       validateSchedule(), validateCustomer()
  filters.ts          applyFilters()
  dates.ts, links.ts
  components/         BikeCard, BikeFilterPanel, ScheduleFields, PriceBreakdown, BikeGallery, …
  bikes.test.ts       unit tests (pricing, validation, filters, mock data integrity)
apps/web/src/pages/bikes/   BikesPage, BikeDetailsPage, BikeBookingPage, BikeConfirmationPage
apps/web/public/assets/bikes/   generated SVG illustrations (3 per bike + banner)
apps/web/scripts/generate-bike-art.mjs   regenerates the illustrations
```

## Connecting the backend later

Only `features/bikes/api.ts` changes. Each function documents its endpoint; swap the body for
`apiGet` / `apiPost` from `@/services/http` and keep the signatures. UI, hooks and store stay as is.
Mock bike `images[].src` can become real photo URLs with no component change.

## Testing UI states

- Loading: automatic (mock calls have a short delay).
- Empty results: search `zzz`.
- Errors: add `?mockError=1` (network) or `?mockError=notfound` to any `/bikes` URL.
- Validation: submit the booking form empty; try a past pickup or a 1-hour rental.
- Unavailable bike: KTM Duke 200 (Book Now disabled). Limited stock: Yamaha R15 V4.
- Mock confirmation: complete the form. Nothing is sent anywhere; payment is not implemented.

## Business rules used (placeholders, see `rules.ts`)

Billed per started hour (min 4h). Each 24h costs the daily rate; leftover hours cost hourly, capped
at one day. 5% off from 3 days, 10% from 7 days. Add-ons charged per day. ₹150 one-way fee.
18% GST. Security deposit shown separately. Max rental 30 days, pickup ≥ 2h from now.


## Admin coupons
Coupons made in Admin → Marketing → Coupons for Bikes (or all services) appear in the "Offers & coupons" card on the Review and Payment pages, and their use is recorded when the rental is booked. See `CHANGES_BIKE_COUPONS.md`.
