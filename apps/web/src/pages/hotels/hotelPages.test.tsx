/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { couponsApi } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';
import { HOTEL_DATA } from '@/features/hotels/data';
import { useHotelBooking } from '@/features/hotels/store';
import HotelBookingPage from './HotelBookingPage';
import HotelConfirmationPage from './HotelConfirmationPage';
import HotelDetailsPage from './HotelDetailsPage';
import HotelPaymentPage from './HotelPaymentPage';
import HotelResultsPage from './HotelResultsPage';
import HotelsPage from './HotelsPage';
import HotelReviewPage from './HotelReviewPage';
import HotelRoomsPage from './HotelRoomsPage';

const RESULTS = '/hotels/results?city=Goa&checkIn=2026-10-10&checkOut=2026-10-12&rooms=1&adults=2&children=0';
const goa = HOTEL_DATA[0]!;
const deluxe = goa.rooms[0]!;

function seed(withGuests = true) {
  const s = useHotelBooking.getState();
  s.clear();
  s.setSearch({ city: 'Goa', checkIn: '2026-10-10', checkOut: '2026-10-12', rooms: 1, adults: 2, children: 0 });
  s.selectRoom(goa, deluxe);
  if (withGuests) {
    s.setGuests(
      [{ firstName: 'Asha', lastName: 'Patil', age: 30, type: 'ADULT' }, { firstName: 'Ravi', lastName: 'Patil', age: 32, type: 'ADULT' }],
      { email: 'asha@example.com', phone: '+919876543210', name: 'Asha Patil', country: 'India' },
    );
  }
}

const at = (path: string, route: string, element: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="*" element={<p>elsewhere</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => useHotelBooking.getState().clear());
afterEach(() => vi.restoreAllMocks());

describe('hotels landing page', () => {
  it('shows the top-destination hotels and popular destinations sections with working links', () => {
    at('/hotels', '/hotels', <HotelsPage />);
    expect(screen.getByRole('heading', { name: 'Hotels in Top Destinations' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Popular Destinations' })).toBeInTheDocument();
    const goaLinks = screen.getAllByRole('link', { name: /goa/i }).map((a) => a.getAttribute('href'));
    expect(goaLinks.length).toBeGreaterThanOrEqual(2);
    // Search links go to results; the trending / hotel links go to the destination or hotel pages.
    expect(goaLinks.filter((href) => href?.startsWith('/hotels/results?')).length).toBeGreaterThanOrEqual(2);
    expect(goaLinks.every((href) => href?.startsWith('/hotels/'))).toBe(true);
    expect(screen.queryByRole('link', { name: /holiday packages/i })).not.toBeInTheDocument();
  });
});

describe('hotel results', () => {
  it('renders results with filters, sorting and full pricing', () => {
    at(RESULTS, '/hotels/results', <HotelResultsPage />);
    expect(screen.getByRole('heading', { name: /stays in goa/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /sort hotels/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /breakfast/i })).toBeInTheDocument();
    expect(screen.getAllByTestId('hotel-card')).toHaveLength(2);
    expect(screen.getAllByText(/taxes & fees/i).length).toBeGreaterThan(0);
  });

  it('applies a filter, shows a removable chip, and clears it', async () => {
    const user = userEvent.setup();
    at(RESULTS, '/hotels/results', <HotelResultsPage />);
    await user.click(screen.getByRole('checkbox', { name: '5 star' }));
    expect(screen.getAllByTestId('hotel-card')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /remove filter 5 star/i }));
    expect(screen.getAllByTestId('hotel-card')).toHaveLength(2);
  });

  it('sorts by price, high to low', async () => {
    const user = userEvent.setup();
    at(RESULTS, '/hotels/results', <HotelResultsPage />);
    await user.selectOptions(screen.getByRole('combobox', { name: /sort hotels/i }), 'price-desc');
    const first = within(screen.getAllByTestId('hotel-card')[0]!).getByRole('heading', { level: 2 });
    expect(first).toHaveTextContent('ZPROO Seaview Resort');
  });

  it('shows a helpful empty state', () => {
    at('/hotels/results?city=Atlantis&checkIn=2026-10-10&checkOut=2026-10-12&rooms=1&adults=2', '/hotels/results', <HotelResultsPage />);
    expect(screen.getByRole('status')).toHaveTextContent(/no stays match/i);
  });
});

describe('hotel details and rooms', () => {
  it('shows the gallery with a working next button and counter', async () => {
    const user = userEvent.setup();
    at(`/hotels/${goa.id}?checkIn=2026-10-10&checkOut=2026-10-12&rooms=1&adults=2`, '/hotels/:id', <HotelDetailsPage />);
    expect(screen.getByText(`1 / ${goa.gallery.length}`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByText(`2 / ${goa.gallery.length}`)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /nearby landmarks/i })).toBeInTheDocument();
  });

  it('blocks rooms that cannot host the group and selects one that can', async () => {
    const user = userEvent.setup();
    at(`/hotels/${goa.id}/rooms?checkIn=2026-10-10&checkOut=2026-10-12&rooms=1&adults=2&children=1&childAges=7`, '/hotels/:id/rooms', <HotelRoomsPage />);
    const cards = screen.getAllByTestId('room-card');
    expect(within(cards[0]!).getByRole('button', { name: /not available/i })).toBeDisabled();
    await user.click(within(cards[1]!).getByRole('button', { name: /select room/i }));
    expect(screen.getByText('elsewhere')).toBeInTheDocument();
    expect(useHotelBooking.getState().room?.id).toBe('sea-premium');
    expect(useHotelBooking.getState().childAges).toEqual([7]);
  });
});

describe('guest details', () => {
  it('shows field errors and does not continue with invalid data', async () => {
    const user = userEvent.setup();
    seed(false);
    at('/hotels/booking', '/hotels/booking', <HotelBookingPage />);
    await user.click(screen.getByRole('button', { name: /review booking/i }));
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(1);
    expect(screen.queryByText('elsewhere')).not.toBeInTheDocument();
  });

  it('blocks digits in names and letters in the mobile number', async () => {
    const user = userEvent.setup();
    seed(false);
    at('/hotels/booking', '/hotels/booking', <HotelBookingPage />);
    await user.type(screen.getByLabelText('Full name'), 'Asha 99 Patil!');
    expect(screen.getByLabelText('Full name')).toHaveValue('Asha Patil');
    await user.type(screen.getByLabelText('Mobile number'), '98ab76543210999');
    expect(screen.getByLabelText('Mobile number')).toHaveValue('9876543210');
    await user.type(document.getElementById('first-0')!, 'R2D2');
    expect(document.getElementById('first-0')).toHaveValue('RD');
  });

  it('switches the mobile prefix and rules with the country flag picker', async () => {
    const user = userEvent.setup();
    seed(false);
    at('/hotels/booking', '/hotels/booking', <HotelBookingPage />);
    await user.click(screen.getByRole('button', { name: /country code/i }));
    const [uae] = within(screen.getByRole('listbox', { name: 'Country codes' })).getAllByRole('option', { name: /united arab emirates/i });
    await user.click(within(uae as HTMLElement).getByRole('button'));
    expect(screen.getByRole('button', { name: /country code, united arab emirates \+971/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Mobile number'), '501234567890');
    expect(screen.getByLabelText('Mobile number')).toHaveValue('501234567');
    expect(screen.getByLabelText('Country')).toHaveValue('AE');
  });

  it('accepts valid details and moves to review', async () => {
    const user = userEvent.setup();
    seed(false);
    at('/hotels/booking', '/hotels/booking', <HotelBookingPage />);
    await user.type(screen.getByLabelText('Full name'), 'Asha Patil');
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Mobile number'), '9876543210');
    for (const [i, name] of [['0', 'Asha'], ['1', 'Ravi']] as const) {
      await user.type(document.getElementById(`first-${i}`)!, name);
      await user.type(document.getElementById(`last-${i}`)!, 'Patil');
    }
    await user.click(screen.getByRole('checkbox', { name: 'Late check-out' }));
    await user.click(screen.getByRole('button', { name: /review booking/i }));
    expect(screen.getByText('elsewhere')).toBeInTheDocument();
    expect(useHotelBooking.getState().guests).toHaveLength(2);
    expect(useHotelBooking.getState().specialRequests).toEqual(['late-check-out']);
  });
});

describe('review', () => {
  it('applies a coupon made in the admin panel and shows why a refused one was refused', async () => {
    const user = userEvent.setup();
    seed();
    const refused = new ApiClientError('Validation failed', 400, 'VALIDATION_ERROR', [{ path: 'body.code', message: 'This coupon has expired' }]);
    const check = vi.spyOn(couponsApi, 'check').mockImplementation((input) =>
      input.code === 'STAY12' ? Promise.resolve({ code: 'STAY12', description: '12% off', discountPaise: 156000 }) : Promise.reject(refused),
    );
    at('/hotels/review', '/hotels/review', <HotelReviewPage />);
    await user.type(screen.getByLabelText('Hotel coupon'), 'old1');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('This coupon has expired')).toBeInTheDocument();
    expect(useHotelBooking.getState().coupon).toBeNull();

    await user.clear(screen.getByLabelText('Hotel coupon'));
    await user.type(screen.getByLabelText('Hotel coupon'), 'stay12');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(useHotelBooking.getState().coupon).toBe('STAY12'));
    expect(useHotelBooking.getState().couponDiscountPaise).toBe(156000);
    // The server is asked for the HOTEL service against the room price.
    expect(check).toHaveBeenCalledWith({ code: 'STAY12', service: 'HOTEL', orderPaise: deluxe.pricePerNightPaise * 2 });
    expect(screen.getAllByRole('status').some((el) => /STAY12 applied/.test(el.textContent ?? ''))).toBe(true);
  });

  it('applies and rejects coupons and updates the total', async () => {
    const user = userEvent.setup();
    seed();
    // No admin coupon has these codes, so the built-in ones are used.
    vi.spyOn(couponsApi, 'check').mockRejectedValue(new ApiClientError('Validation failed', 400, 'VALIDATION_ERROR', [{ path: 'body.code', message: 'Invalid or expired coupon code' }]));
    at('/hotels/review', '/hotels/review', <HotelReviewPage />);
    await user.type(screen.getByLabelText('Hotel coupon'), 'bogus');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid hotel coupon/i);
    await user.clear(screen.getByLabelText('Hotel coupon'));
    await user.type(screen.getByLabelText('Hotel coupon'), 'zproo10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getAllByRole('status').some((el) => /ZPROO10 applied/.test(el.textContent ?? ''))).toBe(true);
    expect(useHotelBooking.getState().coupon).toBe('ZPROO10');
  });

  it('redirects to guest details when nothing is filled in', () => {
    seed(false);
    at('/hotels/review', '/hotels/review', <HotelReviewPage />);
    expect(screen.getByText('elsewhere')).toBeInTheDocument();
  });
});

describe('payment and confirmation', () => {
  it('validates payment input before confirming', () => {
    seed();
    at('/hotels/payment', '/hotels/payment', <HotelPaymentPage />);
    fireEvent.click(screen.getByRole('button', { name: /pay/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/valid upi/i);
  });

  it('shows a decline message for a failing payment and stays on the page', async () => {
    const user = userEvent.setup();
    seed();
    at('/hotels/payment', '/hotels/payment', <HotelPaymentPage />);
    await user.type(screen.getByLabelText('UPI ID'), 'fail@upi');
    await user.click(screen.getByRole('button', { name: /pay/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not approved/i);
    expect(useHotelBooking.getState().booking).toBeNull();
  });

  it('completes a payment and shows the confirmation', async () => {
    const user = userEvent.setup();
    seed();
    at('/hotels/payment', '/hotels/payment', <HotelPaymentPage />);
    await user.type(screen.getByLabelText('UPI ID'), 'asha@okbank');
    await user.click(screen.getByRole('button', { name: /pay/i }));
    await screen.findByText('elsewhere');
    const booking = useHotelBooking.getState().booking;
    expect(booking?.reference).toMatch(/^ZPH-\d{4}-[A-Z2-9]{6}$/);
    expect(booking?.price.totalPaise).toBe(Math.round(deluxe.pricePerNightPaise * 2 * 1.12));
  });

  it('renders the stored booking with download and print actions', () => {
    seed();
    const s = useHotelBooking.getState();
    s.complete({
      reference: 'ZPH-2026-ABC234', transactionId: 'TXN1', paidAt: new Date().toISOString(), method: 'upi', payAtProperty: false,
      hotelId: goa.id, hotelName: goa.name, hotelAddress: goa.address, city: 'Goa', stars: 5,
      checkIn: '2026-10-10', checkOut: '2026-10-12', checkInTime: '14:00', checkOutTime: '11:00', nights: 2, rooms: 1, adults: 2, children: 0, childAges: [],
      roomName: deluxe.name, beds: deluxe.beds, mealPlan: deluxe.mealPlan, cancellationHeadline: 'Non-refundable', cancellationRules: ['Non-refundable: no refund on cancellation or no-show.'],
      guests: [{ firstName: 'Asha', lastName: 'Patil', age: 30, type: 'ADULT' }],
      contact: { name: 'Asha Patil', email: 'asha@example.com', phone: '9876543210', country: 'India' },
      specialRequests: [], specialNote: '',
      price: { nights: 2, rooms: 1, perNightPaise: 650000, originalPerNightPaise: null, roomSubtotalPaise: 1300000, originalSubtotalPaise: 1300000, offerDiscountPaise: 0, taxesPaise: 156000, couponCode: null, couponPercent: 0, couponDiscountPaise: 0, totalPaise: 1456000, allInPerNightPaise: 728000 },
    });
    at('/hotels/confirmation?ref=ZPH-2026-ABC234', '/hotels/confirmation', <HotelConfirmationPage />);
    expect(screen.getAllByText(/ZPH-2026-ABC234/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /download confirmation/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /print/i })).toBeEnabled();
  });

  it('does not show a confirmation for an unknown reference', () => {
    seed();
    at('/hotels/confirmation?ref=ZPH-NOPE', '/hotels/confirmation', <HotelConfirmationPage />);
    expect(screen.getByText('elsewhere')).toBeInTheDocument();
  });
});
