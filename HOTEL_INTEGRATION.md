# Hotel section replacement

- Hotel section (features/hotels, pages/hotels, HotelSearchForm, hotel banners/flags, TravelHero/PageBanner,
  routes) replaced with the friend's version, as is.
- Home, Flight and Bus code is unchanged. Home HotelsSection/DestinationsSection only gained optional props.
- Hotel bookings now push a "Hotel Booking Confirmed" item to the notification bell
  (features/hotels/notifications.ts, written by HotelPaymentPage, read by NotificationBell).
- Your original HotelMap (embedded Google map, Open map, Directions) is back on the hotel details page, Location section; hotelMapLinks added to features/hotels/data.ts.
- Test fix: hotelLogic.test.ts expected a trailing space in a name; corrected to match the trimmed value.
- Lint fix: CountryCodeSelect used aria-invalid on a button; now data-invalid.

Run: npm install && npm run typecheck && npm test
