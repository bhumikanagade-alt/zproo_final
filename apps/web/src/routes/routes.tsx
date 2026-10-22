import type { Permission } from '@zproo/types';
import { redirect, type RouteObject } from 'react-router';
import { PageLoader } from '@/components/feedback/PageLoader';
import { RouteError } from '@/components/feedback/RouteError';
import { RedirectIfAuthenticated, RequireAuth, RequirePermission } from '@/features/auth/guards';
import { PublicLayout } from '@/layouts/PublicLayout';
import HomePage from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PUBLIC_ROUTES } from './routeMap';

/** Route-level code splitting: each page (and the whole admin area) loads on demand. */
const page = (loader: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await loader()).default,
});

const plannedPage = page(() => import('@/pages/PlannedPage'));

/** Shown while the first route's code loads (continues the index.html boot splash). */
const splash = <PageLoader fullscreen />;

const HOTEL_PUBLIC_PATHS = new Set(['/hotels', '/hotels/results', '/hotels/:id', '/hotels/:id/rooms']);
const CAB_PATHS = new Set(['/cabs', '/cabs/booking', '/rides/:id']);
/** Pages that are now real (not "coming soon" placeholders). */
const LIVE_PATHS = new Set(['/contact', '/help', '/install-app']);
const HOLIDAY_PUBLIC_PATHS = new Set(['/holidays']);
const PARCEL_PATHS = new Set(['/parcel', '/parcel/track/:id']);
const BIKE_PATHS = new Set(['/bikes']); // other /bikes/* routes are registered explicitly below
const publicPlanned = PUBLIC_ROUTES.filter(
  (r) => !r.requiresAuth && !HOTEL_PUBLIC_PATHS.has(r.path) && !CAB_PATHS.has(r.path) && !LIVE_PATHS.has(r.path) &&
    !HOLIDAY_PUBLIC_PATHS.has(r.path) && !PARCEL_PATHS.has(r.path) && !BIKE_PATHS.has(r.path),
);
const accountPlanned = PUBLIC_ROUTES.filter((r) => r.requiresAuth);


/**
 * An admin page that needs its own permission (the same one the menu uses to show the link), so
 * typing its address does not open a screen full of errors for staff who may not use it.
 */
const guarded = (permission: Permission, route: RouteObject): RouteObject => ({
  element: <RequirePermission permission={permission} />,
  children: [route],
});

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: splash,
    children: [
      // Eager: the landing page must paint without waiting for a second chunk.
      { index: true, Component: HomePage },
      { path: '/blog', lazy: page(() => import('@/features/blog/BlogPage')) },
      { path: '/blog/:post', lazy: page(() => import('@/features/blog/BlogPostPage')) },
      { path: '/info/:slug', lazy: page(() => import('@/pages/info/InfoPage')) },
      { path: '/about', lazy: page(() => import('@/pages/company/AboutPage')) },
      { path: '/terms', lazy: page(() => import('@/pages/company/TermsPage')) },
      { path: '/privacy', lazy: page(() => import('@/pages/company/PrivacyPage')) },
      { path: '/refund-policy', lazy: page(() => import('@/pages/company/RefundPolicyPage')) },
      { path: '/flights', lazy: page(() => import('@/pages/flights/FlightsPage')) },
      { path: '/flights/results', lazy: page(() => import('@/pages/flights/FlightResultsPage')) },
      { path: '/flights/:id', lazy: page(() => import('@/pages/flights/FlightDetailsPage')) },
      { path: '/buses', lazy: page(() => import('@/pages/buses/BusesPage')) },
      { path: '/buses/results', lazy: page(() => import('@/pages/buses/BusResultsPage')) },
      { path: '/buses/:id', lazy: page(() => import('@/pages/buses/BusDetailsPage')) },
      { path: '/buses/:id/seats', lazy: page(() => import('@/pages/buses/BusSeatsPage')) },
      // Hotels: complete search → results → details → rooms flow.
      { path: '/hotels', lazy: page(() => import('@/pages/hotels/HotelsPage')) },
      { path: '/hotels/results', lazy: page(() => import('@/pages/hotels/HotelResultsPage')) },
      { path: '/hotels/:id', lazy: page(() => import('@/pages/hotels/HotelDetailsPage')) },
      { path: '/hotels/:id/rooms', lazy: page(() => import('@/pages/hotels/HotelRoomsPage')) },
      { path: '/hotels/saved', lazy: page(() => import('@/pages/hotels/SavedHotelsPage')) },
      { path: '/hotels/compare', lazy: page(() => import('@/pages/hotels/ComparePage')) },
      { path: '/hotels/deals', lazy: page(() => import('@/pages/hotels/DealsPage')) },
      { path: '/hotels/in/:city', lazy: page(() => import('@/pages/hotels/DestinationPage')) },
      { path: '/hotels/collections/:slug', lazy: page(() => import('@/pages/hotels/CollectionPage')) },
      // Trains: search → results → train & class → passengers → review → payment → status.
      { path: '/trains', lazy: page(() => import('@/pages/trains/TrainsPage')) },
      { path: '/trains/results', lazy: page(() => import('@/pages/trains/TrainResultsPage')) },
      { path: '/trains/selection', lazy: page(() => import('@/pages/trains/TrainSelectionPage')) },
      { path: '/trains/live-status', lazy: page(() => import('@/pages/trains/TrainLiveStatusPage')) },
      // Cabs: complete demo journey (search → results → route → pickup → details → passenger → payment → tracking).
      { path: '/cabs', lazy: page(() => import('@/pages/cabs/CabsPage')) },
      { path: '/cabs/booking', loader: () => redirect('/cabs') },
      { path: '/cabs/results', lazy: page(() => import('@/pages/cabs/CabResultsPage')) },
      { path: '/cabs/route', lazy: page(() => import('@/pages/cabs/CabRoutePage')) },
      { path: '/cabs/pickup', lazy: page(() => import('@/pages/cabs/CabPickupPage')) },
      { path: '/cabs/details', lazy: page(() => import('@/pages/cabs/CabDetailsPage')) },
      { path: '/cabs/passenger', lazy: page(() => import('@/pages/cabs/CabPassengerPage')) },
      { path: '/cabs/payment', lazy: page(() => import('@/pages/cabs/CabPaymentPage')) },
      { path: '/cabs/finding/:ref', lazy: page(() => import('@/pages/cabs/CabFindingPage')) },
      { path: '/cabs/confirmation/:ref', lazy: page(() => import('@/pages/cabs/CabConfirmationPage')) },
      { path: '/cabs/bookings', lazy: page(() => import('@/pages/cabs/CabBookingsPage')) },
      { path: '/rides/:id', lazy: page(() => import('@/pages/cabs/CabTrackPage')) },
      { path: '/rides/:id/completed', lazy: page(() => import('@/pages/cabs/CabCompletedPage')) },
      // Holidays: complete standalone explorer flow (mock data until the API is available).
      { path: '/holidays', lazy: page(() => import('@/pages/HolidayExplorerPage')) },
      // Bikes: landing (search) → results (filters) → details → book (rider details) → review → demo payment → confirmation.
      { path: '/bikes', lazy: page(() => import('@/pages/bikes/BikesPage')) },
      { path: '/bikes/results', lazy: page(() => import('@/pages/bikes/BikeResultsPage')) },
      { path: '/bikes/locations', lazy: page(() => import('@/pages/bikes/BikeLocationsPage')) },
      { path: '/bikes/bookings', lazy: page(() => import('@/pages/bikes/BikeBookingsPage')) },
      { path: '/bikes/confirmation/:ref', lazy: page(() => import('@/pages/bikes/BikeConfirmationPage')) },
      { path: '/bikes/:id', lazy: page(() => import('@/pages/bikes/BikeDetailsPage')) },
      { path: '/bikes/:id/book', lazy: page(() => import('@/pages/bikes/BikeBookingPage')) },
      { path: '/bikes/:id/review', lazy: page(() => import('@/pages/bikes/BikeReviewPage')) },
      { path: '/bikes/:id/payment', lazy: page(() => import('@/pages/bikes/BikePaymentPage')) },
      // Parcel: book (route → sender & receiver → parcel details → review → payment → confirmation), plus tracking.
      { path: '/parcel', lazy: page(() => import('@/pages/parcels/ParcelsPage')) },
      { path: '/parcel/sender', lazy: page(() => import('@/pages/parcels/ParcelSenderPage')) },
      { path: '/parcel/details', lazy: page(() => import('@/pages/parcels/ParcelDetailsPage')) },
      { path: '/parcel/review', lazy: page(() => import('@/pages/parcels/ParcelReviewPage')) },
      { path: '/parcel/payment', lazy: page(() => import('@/pages/parcels/ParcelPaymentPage')) },
      { path: '/parcel/confirmation/:id', lazy: page(() => import('@/pages/parcels/ParcelConfirmationPage')) },
      { path: '/parcel/bookings', lazy: page(() => import('@/pages/parcels/ParcelBookingsPage')) },
      { path: '/parcel/track', lazy: page(() => import('@/pages/parcels/ParcelTrackPage')) },
      { path: '/parcel/track/:id', lazy: page(() => import('@/pages/parcels/ParcelTrackPage')) },
      { path: '/parcel/help', lazy: page(() => import('@/pages/parcels/ParcelHelpPage')) },
      { path: '/offers', lazy: page(() => import('@/pages/OffersPage')) },
      { path: '/faq', lazy: page(() => import('@/pages/support/FaqPage')) },
      { path: '/contact', lazy: page(() => import('@/pages/support/ContactPage')) },
      { path: '/help', lazy: page(() => import('@/pages/support/ContactPage')) },
      { path: '/install-app', lazy: page(() => import('@/pages/support/InstallAppPage')) },
      { path: '/bus-booking-guide', lazy: page(() => import('@/pages/seo/BusSeoPage')) },
      ...publicPlanned.map((meta) => ({ path: meta.path, handle: meta, lazy: plannedPage })),
      {
        element: <RequireAuth />,
        children: [
          { path: '/profile', lazy: page(() => import('@/pages/account/ProfilePage')) },
          { path: '/wallet', lazy: page(() => import('@/pages/account/WalletPage')) },
          { path: '/bookings', lazy: page(() => import('@/pages/account/MyBookingsPage')) },
          {
            path: '/bookings/:id',
            lazy: page(() => import('@/pages/account/BookingRedirectPage')),
          },
          // Checkout: booking needs an account (tickets and payments belong to a user).
          {
            path: '/flights/booking',
            lazy: page(() => import('@/pages/flights/FlightTravellersPage')),
          },
          { path: '/flights/seats', lazy: page(() => import('@/pages/flights/FlightSeatsPage')) },
          { path: '/flights/meals', lazy: page(() => import('@/pages/flights/FlightMealsPage')) },
          {
            path: '/flights/baggage',
            lazy: page(() => import('@/pages/flights/FlightBaggagePage')),
          },
          { path: '/flights/review', lazy: page(() => import('@/pages/flights/FlightReviewPage')) },
          {
            path: '/flights/payment',
            lazy: page(() => import('@/pages/checkout/PaymentPage')),
          },
          {
            path: '/flights/confirmation',
            lazy: page(() => import('@/pages/checkout/ConfirmationPage')),
          },
          { path: '/buses/booking', lazy: page(() => import('@/pages/buses/BusTravellersPage')) },
          { path: '/buses/bookings/:reference/cancel', lazy: page(() => import('@/pages/buses/BusCancelPage')) },
          { path: '/buses/review', lazy: page(() => import('@/pages/buses/BusReviewPage')) },
          { path: '/buses/payment', lazy: page(() => import('@/pages/checkout/PaymentPage')) },
          {
            path: '/buses/confirmation',
            lazy: page(() => import('@/pages/checkout/ConfirmationPage')),
          },
          { path: '/trains/booking', lazy: page(() => import('@/pages/trains/TrainPassengersPage')) },
          { path: '/trains/review', lazy: page(() => import('@/pages/trains/TrainReviewPage')) },
          { path: '/trains/payment', lazy: page(() => import('@/pages/checkout/PaymentPage')) },
          {
            path: '/trains/confirmation',
            lazy: page(() => import('@/pages/trains/TrainBookingPage')),
          },
          {
            path: '/trains/bookings/:reference',
            lazy: page(() => import('@/pages/trains/TrainBookingPage')),
          },
          {
            path: '/trains/bookings/:reference/cancel',
            lazy: page(() => import('@/pages/trains/TrainCancelPage')),
          },
          // Hotels: authenticated booking → review → payment → confirmation.
          { path: '/hotels/booking', lazy: page(() => import('@/pages/hotels/HotelBookingPage')) },
          { path: '/hotels/review', lazy: page(() => import('@/pages/hotels/HotelReviewPage')) },
          { path: '/hotels/payment', lazy: page(() => import('@/pages/hotels/HotelPaymentPage')) },
          { path: '/hotels/booked', lazy: page(() => import('@/pages/hotels/HotelBookedPage')) },
          { path: '/hotels/bookings', lazy: page(() => import('@/pages/hotels/HotelBookingsPage')) },
          { path: '/hotels/bookings/:reference', lazy: page(() => import('@/pages/hotels/HotelManagePage')) },
          ...accountPlanned.map((meta) => ({ path: meta.path, handle: meta, lazy: plannedPage })),
        ],
      },
      // Eager: also used by the error boundary, so it is already in the main bundle.
      { path: '*', Component: NotFoundPage },
    ],
  },
  {
    lazy: async () => ({ Component: (await import('@/layouts/AuthLayout')).AuthLayout }),
    errorElement: <RouteError />,
    hydrateFallbackElement: splash,
    children: [
      {
        element: <RedirectIfAuthenticated />,
        children: [
          { path: '/login', lazy: page(() => import('@/pages/auth/LoginSignupPage')) },
          { path: '/signup', lazy: page(() => import('@/pages/auth/LoginSignupPage')) },
          { path: '/verify-otp', lazy: page(() => import('@/pages/auth/VerifyOtpPage')) },
          { path: '/forgot-password', lazy: page(() => import('@/pages/auth/ForgotPasswordPage')) },
          { path: '/reset-password', lazy: page(() => import('@/pages/auth/ResetPasswordPage')) },
        ],
      },
    ],
  },
  // Printable e-ticket / e-voucher: own pages (no site header/footer) so they print cleanly.
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    hydrateFallbackElement: splash,
    children: [
      { path: '/tickets/:reference', lazy: page(() => import('@/pages/account/TicketPage')) },
      // Hotel e-voucher: same idea — no site header/footer, so Print / Save as PDF shows only the voucher.
      { path: '/hotels/confirmation', lazy: page(() => import('@/pages/hotels/HotelConfirmationPage')) },
    ],
  },
  {
    path: '/admin',
    element: <RequirePermission permission="admin:access" />,
    errorElement: <RouteError />,
    hydrateFallbackElement: splash,
    children: [
      {
        lazy: async () => ({ Component: (await import('@/layouts/AdminLayout')).AdminLayout }),
        children: [
          guarded('booking:read:any', { index: true, lazy: page(() => import('@/pages/admin/AdminDashboardPage')) }),
          guarded('report:read', { path: 'analytics', lazy: page(() => import('@/pages/admin/AdminAnalyticsPage')) }),
          guarded('booking:read:any', { path: 'bookings', lazy: page(() => import('@/pages/admin/AdminBookingsPage')) }),
          guarded('support:ticket:manage', { path: 'support', lazy: page(() => import('@/pages/admin/AdminSupportPage')) }),
          guarded('driver:manage', { path: 'drivers', lazy: page(() => import('@/pages/admin/AdminDriversPage')) }),
          guarded('payment:read:any', { path: 'payments', lazy: page(() => import('@/pages/admin/AdminPaymentsPage')) }),
          guarded('payment:read:any', { path: 'refunds', lazy: page(() => import('@/pages/admin/AdminRefundsPage')) }),
          guarded('wallet:manage', { path: 'wallet', lazy: page(() => import('@/pages/admin/AdminWalletPage')) }),
          guarded('report:read', { path: 'reports', lazy: page(() => import('@/pages/admin/AdminReportsPage')) }),
          guarded('offer:manage', { path: 'offers', lazy: page(() => import('@/pages/admin/AdminOffersPage')) }),
          guarded('offer:manage', { path: 'coupons', lazy: page(() => import('@/pages/admin/AdminCouponsPage')) }),
          guarded('offer:manage', { path: 'notifications', lazy: page(() => import('@/pages/admin/AdminNotificationsPage')) }),
          guarded('user:read:any', { path: 'users', lazy: page(() => import('@/pages/admin/AdminUsersPage')) }),
          guarded('partner:manage', { path: 'partners', lazy: page(() => import('@/pages/admin/AdminPartnersPage')) }),
          guarded('audit:read', { path: 'audit', lazy: page(() => import('@/pages/admin/AdminAuditPage')) }),
          guarded('report:read', { path: 'settings', lazy: page(() => import('@/pages/admin/AdminSettingsPage')) }),
          // Catalogue sections: /admin/flights, /admin/buses, … (unknown segments render Not found).
          guarded('inventory:manage', { path: ':section', lazy: page(() => import('@/pages/admin/AdminInventoryPage')) }),
        ],
      },
    ],
  },
];
