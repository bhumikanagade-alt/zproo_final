# Bike Booking (web) — frontend flow, mock data only

All code lives in `apps/web/src/features/bikes` and `apps/web/src/pages/bikes`. No backend, no fake endpoints, no payments.

## Flow
| Step | Route | Page |
|---|---|---|
| Landing + search (bike name max 20 chars, **pickup city**, dates) | `/bikes` | `BikesPage` |
| Results + filters | `/bikes/results` | `BikeResultsPage` |
| Bike details | `/bikes/:id` | `BikeDetailsPage` ("Book Now" goes to step 1) |
| 1. Rental details (city, **pickup area** in that city, dates, add-ons, rider) | `/bikes/:id/book` | `BikeBookingPage` |
| 2. Review + terms | `/bikes/:id/review` | `BikeReviewPage` |
| 3. Demo payment | `/bikes/:id/payment` | `BikePaymentPage` |
| 4. Confirmation (animated green check) | `/bikes/confirmation/:ref` | `BikeConfirmationPage` |
| My demo bookings | `/bikes/bookings` | `BikeBookingsPage` |
| Pickup hubs | `/bikes/locations` | `BikeLocationsPage` |

Opening `/review` or `/payment` without valid details (reload, new tab) redirects to step 1. Rider details are kept in memory only; the schedule and finished mock bookings persist in `localStorage` (`zproo-bikes-v1`).

## Reusable pieces
`BikeBookingSteps`, `CustomerForm`, `ExtrasPicker`, `RentalSummary` (`BikeMiniCard`, `RiderDetails`), `PriceBreakdown`, `ScheduleFields`, plus shared `ui.tsx` (Card, TextField, TextAreaField, SelectField, ErrorState, EmptyState, DemoNote).

## Backend integration later
Only `features/bikes/api.ts` changes: replace each function body with a call through `@/services/http` (see the header comment there). `createBooking` is wrapped by the `useCreateBooking` hook. Pricing currently comes from `pricing.ts` + `rules.ts` (placeholder business rules); when the API returns the quote, `computeQuote` becomes display-only.

## Testing UI states without a backend
- `?mockError=1` — every call fails (network error UI, Try again).
- `?mockError=notfound` — 404 state.
- `?mockError=payment` (or `booking`) — only the final pay/confirm call fails (payment-page error). The query string is carried from details → book → review → payment.
- Loading states come from the simulated latency in `api.ts`.

## Demo payment
Methods: UPI, card, net banking, pay at pickup (charges nothing now). Entered details are validated in the browser (Luhn check, expiry, CVV, UPI format) and kept only in the payment form's state: never stored, never put in the booking request, never sent. Only the chosen method and the amount are saved with the mock booking.
Test inputs: card `4242 4242 4242 4242` succeeds; card `4000 0000 0000 0002` or UPI `fail@upi` is declined (shows the failure state). Payment is simulated inside `api.createBooking`; swap it for the real gateway call when the backend is ready. The refundable security deposit is always collected at the hub, not online.
