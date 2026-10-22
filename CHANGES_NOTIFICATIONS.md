# Notifications fix

Problem: the admin "Notifications" page only saved campaign records. Nothing delivered them and the
customer's bell showed hard-coded placeholder items, so sent campaigns never reached users.

Changes
- packages/types/src/admin.ts: new `UserNotification` type.
- apps/api/src/services/admin.service.ts: `notificationsFor(userId)` (audience matching for
  ALL_USERS / RECENT_CUSTOMERS / INACTIVE_USERS / STAFF, IN_APP + PUSH channels only) and
  `dispatchDueNotifications()` (scheduled campaigns become SENT once their time passes).
- apps/api/src/controllers/admin.controller.ts + routes/index.ts: new `GET /api/notifications` (signed-in users).
- apps/web/src/static/server.ts + static/admin/publicNotifications.ts (+ routes.ts): same behaviour in static/demo mode.
- apps/web/src/components/layout/NotificationBell.tsx: shows real campaigns, confirmed bookings (last 3 days)
  and hotel bookings, newest first, with persistent per-user read/unread state and an empty state.
- apps/web/src/features/notifications/readState.ts: read-state store.
- apps/web/src/pages/admin/AdminNotificationsPage.tsx: wording now matches real behaviour.

Not delivered: EMAIL and SMS channels are still only recorded (no provider wired up for bulk sending).
No database migration is needed (campaigns stay in admin_records).


# Bus booking cancellation (customer)

Customers can now cancel their own confirmed bus booking (before it departs).

Flow: My bookings (or the booking confirmation page) → **Cancel booking** → `/buses/bookings/:reference/cancel`
shows the refund for cancelling right now (from the operator's refund rules sold with the trip: e.g. 90% more
than 24h before departure, 75% > 12h, 50% > 4h, then 0%) → pick a reason → confirm.

What happens on confirm
- Booking becomes `REFUND_PENDING` (or `CANCELLED` when no refund applies); seats go back on sale.
- A refund is raised through the existing refund queue, so it shows on Admin → Refunds, is retried if the
  gateway fails and settles the booking to `REFUNDED`. A cancellation email is sent and the action is audit-logged.
- An unpaid booking is simply released (no charge, no refund). A departed bus cannot be cancelled.
- The bell shows "Booking Cancelled" for a cancelled paid booking.
- Safe against double clicks (Idempotency-Key + status-guarded update).

Files
- packages/utils/src/busCancellation.ts (+ test): shared refund rules (API and demo mode use the same code).
- packages/types/src/buses.ts `BusCancellationQuote`; packages/validation/src/booking.ts `cancelBusSchema`.
- apps/api/src/services/busCancellation.service.ts; controller, routes (`POST /api/buses/bookings/:reference/cancellation-quote`
  and `/cancel`) and container wiring. Requires the existing `booking:cancel:own` permission.
- apps/web: `pages/buses/BusCancelPage.tsx`, route, `features/buses/api.ts`, buttons in MyBookingsPage and ConfirmationPage,
  static (demo) endpoints in `static/bookings.ts`.
- `BookingListItem.cancelledAt` added (list endpoint + demo).

Not changed: flights (still admin/support only), and a partial-seat cancellation (the whole ticket is cancelled).
