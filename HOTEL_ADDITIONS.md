# Hotel additions (front end only)

Everything outside the hotel section is unchanged, except: the landing page `HotelsPage` (new sections),
`MyBookingsPage` (one link), `routes.tsx` (new routes) and one line in `hotelPages.test.tsx`.

## Details page
- Guest reviews (score breakdown, most helpful / newest / highest / lowest, traveller-type tags, helpful votes)
- Policies, FAQ, similar hotels, sticky "Select room" bar
- Gallery tabs: All / Rooms / Pool / Food / Exterior (+ existing fullscreen viewer)
- Wishlist heart

## Results page
- Split list + map with price pins (OpenStreetMap tiles, updates with filters)
- Compare 2-3 hotels (`/hotels/compare`), wishlist heart (`/hotels/saved`)
- Urgency labels: only N rooms left, booked N times this week, price drop
- New filters: distance, distance from beach, bed type, couple friendly, 24-hour front desk
- Price histogram behind the price slider
- "Alert me when prices drop" (saved searches shown on `/hotels/saved`)

## Booking
- 15-minute price hold with countdown on the review and payment pages

## After booking
- `/hotels/bookings` My Hotel Bookings (upcoming / past / cancelled)
- `/hotels/bookings/:reference` Manage booking: refund-aware cancel, change dates, review after check-out
- Voucher: print / PDF, email a copy (mailto), add to calendar (.ics), directions, contact support
- Confirmation page: "Add a bus or flight" card, Manage booking link

## Home and discovery
- Trending destinations (`/hotels/in/:city`), collections (`/hotels/collections/:slug`), deals (`/hotels/deals`)

## Not real yet (needs the backend)
Reviews, wishlist, bookings, alerts and trending data are generated or stored in the browser (localStorage /
sessionStorage). The review-request EMAIL after check-out needs a server; in the meantime the manage page
asks for the review. New logic lives in `features/hotels/extras.ts` and the small stores next to it, so the
UI only has to switch its data source when the API exists.

Run: npm install && npm run typecheck && npm test
