# Bike booking: city -> area flow, confirmation page, bike name limit

- **Pickup city first.** The search (landing page, results "Modify rental", bike details card) now asks for a *Pickup city* (Pune, Mumbai, Bengaluru, Delhi, Hyderabad). Results are filtered to bikes stocked in that city.
- **Pickup area on the next page.** On the Rental details page (`/bikes/:id/book`) the *Pickup area* list shows only the hubs in the chosen city (areas the bike is not stocked at are disabled). Changing the city clears the areas. "Return to a different area" lists the other hubs in the same city (one-way fee).
- **City + area shown in rental details.** Review, payment-side summary and confirmation show `Area, City` for pickup and return.
- **Confirmation page.** Demo wording and the demo notice are removed; new header with an animated green check (`SuccessCheck`, CSS in `styles/globals.css`, respects reduced motion), booking reference, and pickup / time / total strip.
- **Bike name limit.** The bike name / model search boxes accept at most 20 characters (`BIKE_NAME_MAX`, `sanitizeBikeName`, `BikeNameField` with a live counter).
- Data: `PickupLocation.city`, `RentalSchedule.pickupCity`, `BikeFilters.pickupCity`; 15 new mock hubs in `mock/locations.mock.ts`; the saved schedule in `localStorage` is migrated (store version 2).
- Tests: `features/bikes/bikes.test.ts` covers city validation, city filter and the name limit.
