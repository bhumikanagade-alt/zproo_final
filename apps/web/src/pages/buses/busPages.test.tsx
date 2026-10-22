import type { BookingDetails, BusSearchResult } from '@zproo/types';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBusDraft } from '@/features/buses/draft';
import { makeSeatMap, makeTrip, TRIPS } from '@/features/buses/test/fixtures';
import type * as httpModule from '@/services/http';
import { apiGet, apiPost, ApiClientError } from '@/services/http';
import { makeUser, renderRoute } from '@/test/render';

vi.mock('@/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof httpModule>()),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

const get = vi.mocked(apiGet);
const post = vi.mocked(apiPost);
const RESULTS = '/buses/results?from=pune&to=mumbai&date=2026-10-25';
const TRIP = TRIPS[0] as (typeof TRIPS)[number];

function serve(routes: (url: string) => unknown) {
  get.mockImplementation(async (url: string) => {
    const found = routes(url);
    if (found === undefined) throw new ApiClientError('Not found', 404, 'NOT_FOUND');
    return found;
  });
}

const busRoutes = (url: string): unknown => {
  if (url === '/buses/search') {
    return {
      from: 'pune',
      to: 'mumbai',
      date: '2026-10-25',
      trips: TRIPS,
      demo: true,
    } satisfies BusSearchResult;
  }
  if (url === `/buses/${TRIP.id}`) return TRIP;
  if (url === `/buses/${TRIP.id}/seats`) return makeSeatMap(TRIP.id);
  return undefined;
};

function busBooking(overrides: Partial<BookingDetails> = {}): BookingDetails {
  const trip = makeTrip();
  return {
    reference: 'ZP-2026-BUS123',
    serviceType: 'BUS',
    status: 'PENDING_PAYMENT',
    paymentStatus: 'CREATED',
    createdAt: '2026-09-26T10:00:00.000Z',
    holdExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    confirmedAt: null,
    cancelledAt: null,
    travelDate: '2026-10-25',
    price: {
      lines: [
        { label: 'Base fare — 2 seats', amountPaise: 90_000 },
        { label: 'GST', amountPaise: 4_600 },
      ],
      basePaise: 90_000,
      taxesPaise: 4_600,
      feesPaise: 0,
      discountPaise: 0,
      totalPaise: 94_600,
      currency: 'INR',
    },
    contact: { email: 'amit@example.com', phone: '+919876543210' },
    passengers: [
      {
        id: 'p1',
        type: 'ADULT',
        title: 'MR',
        firstName: 'Amit',
        lastName: 'Sharma',
        dateOfBirth: null,
        age: 34,
        gender: 'MALE',
        seatNumber: 'L1',
      },
    ],
    flights: [],
    bus: {
      offer: trip,
      seatNumbers: ['L1', 'L4'],
      boardingPoint: trip.boardingPoints[0] as (typeof trip.boardingPoints)[number],
      droppingPoint: trip.droppingPoints[1] as (typeof trip.droppingPoints)[number],
      pnr: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  useBusDraft.getState().clear();
});

describe('bus results', () => {
  it('lists buses, filters them and sorts them', async () => {
    serve(busRoutes);
    const user = userEvent.setup();
    renderRoute(RESULTS);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pune → Mumbai' }),
    ).toBeInTheDocument();
    expect(await screen.findAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('note')).toHaveTextContent(/buses, operators and payments/i);
    expect(get).toHaveBeenCalledWith('/buses/search', {
      params: { from: 'pune', to: 'mumbai', date: '2026-10-25' },
    });

    // Departure order by default.
    expect(screen.getAllByRole('article')[0]).toHaveAccessibleName(/Pune Pravas/);

    const type = screen.getAllByRole('group', { name: 'Bus type' })[0] as HTMLElement;
    await user.click(within(type).getByRole('button', { name: 'Sleeper' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('1 of 3 buses')).toBeInTheDocument();

    await user.click(within(type).getByRole('button', { name: 'Sleeper' }));
    await user.click(screen.getByRole('radio', { name: 'Top rated' }));
    expect(screen.getAllByRole('article')[0]).toHaveAccessibleName(/Ecoline Electric/);
  });

  it('explains an invalid search', async () => {
    renderRoute('/buses/results?from=pune&to=pune');
    expect(await screen.findByText(/that search isn't complete/i)).toBeInTheDocument();
  });
});

describe('seat selection', () => {
  it('picks seats and points, then asks guests to sign in', async () => {
    serve(busRoutes);
    const user = userEvent.setup();
    const { router } = renderRoute(`/buses/${TRIP.id}/seats`);
    await screen.findByRole('heading', { level: 1, name: 'Choose your seats', hidden: true });
    // The page first suggests the app; carry on in the browser.
    await user.click(await screen.findByRole('button', { name: 'Continue on web' }));

    const booked = await screen.findByRole('button', { name: /Sleeper L2, .*booked/ });
    expect(booked).toBeDisabled();
    expect(screen.getByRole('button', { name: /Sleeper L3, .*reserved for women/ })).toBeEnabled();

    const [continueButton] = screen.getAllByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Sleeper L1,/ }));
    await user.click(screen.getByRole('button', { name: /Sleeper U1,/ }));
    expect(screen.getByRole('button', { name: /Sleeper L1,.*selected/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getAllByText('₹904')[0]).toBeInTheDocument(); // 473 + 431

    await user.click(screen.getAllByRole('radio', { name: /Wakad/ })[0] as HTMLElement);
    await user.click(screen.getAllByRole('button', { name: /continue/i })[0] as HTMLElement);

    await screen.findByRole('heading', { name: /welcome back/i });
    expect(router.state.location.search).toBe('?next=%2Fbuses%2Fbooking');
    expect(useBusDraft.getState().selection).toMatchObject({
      tripId: TRIP.id,
      seats: [
        { number: 'L1', pricePaise: 47_300 },
        { number: 'U1', pricePaise: 43_100 },
      ],
      boardingPointId: 'b2',
      droppingPointId: 'd2',
      expectedTotalPaise: 90_400,
    });
  });
});

describe('bus checkout', () => {
  beforeEach(() => {
    useBusDraft.getState().start({
      tripId: TRIP.id,
      seats: [
        { number: 'L1', pricePaise: 47_300, ladiesOnly: false },
        { number: 'L3', pricePaise: 47_300, ladiesOnly: true },
      ],
      boardingPointId: 'b1',
      droppingPointId: 'd2',
      expectedTotalPaise: 94_600,
      seatsUrl: `/buses/${TRIP.id}/seats`,
    });
  });

  it('asks for a bus when none is selected', async () => {
    useBusDraft.getState().clear();
    renderRoute('/buses/booking', makeUser());
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No bus selected' }),
    ).toBeInTheDocument();
  });

  it('collects one traveller per seat, keeps the ladies seat for women, and books', async () => {
    serve(busRoutes);
    const user = userEvent.setup();
    const { router } = renderRoute('/buses/booking', makeUser());
    await screen.findByRole('heading', { level: 1, name: 'Traveller details' });
    expect(await screen.findByText('Reserved for women')).toBeInTheDocument();

    const first = await screen.findAllByLabelText('First & middle name');
    const last = screen.getAllByLabelText('Last name');
    const age = screen.getAllByLabelText('Age');
    await user.type(first[0] as HTMLElement, 'Amit');
    await user.type(last[0] as HTMLElement, 'Sharma');
    await user.type(age[0] as HTMLElement, '34');
    await user.type(first[1] as HTMLElement, 'Priya');
    await user.type(last[1] as HTMLElement, 'Sharma');
    await user.type(age[1] as HTMLElement, '31');
    await user.selectOptions(screen.getAllByLabelText('Gender')[1] as HTMLElement, 'MALE');
    await user.click(screen.getByRole('button', { name: /continue to review/i }));
    expect(await screen.findByText('Seat L3 is reserved for women')).toBeInTheDocument();

    await user.selectOptions(screen.getAllByLabelText('Gender')[1] as HTMLElement, 'FEMALE');
    await user.click(screen.getByRole('button', { name: /continue to review/i }));
    await screen.findByRole('heading', { level: 1, name: 'Review your booking' });
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();

    post.mockResolvedValueOnce(busBooking());
    post.mockResolvedValueOnce({
      paymentId: 'pay1',
      provider: 'mock',
      providerOrderId: 'mockorder_1',
      amountPaise: 94_600,
      currency: 'INR',
      publicKey: null,
      bookingReference: 'ZP-2026-BUS123',
      holdExpiresAt: null,
    });
    serve((url) => (url.startsWith('/bookings/') ? busBooking() : busRoutes(url)));
    await user.click(await screen.findByRole('button', { name: /continue to payment/i }));

    await screen.findByRole('heading', { level: 1, name: 'Payment' });
    expect(router.state.location.pathname).toBe('/buses/payment');
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/buses/book',
      {
        tripId: TRIP.id,
        boardingPointId: 'b1',
        droppingPointId: 'd2',
        passengers: [
          { seatNumber: 'L1', firstName: 'Amit', lastName: 'Sharma', age: 34, gender: 'MALE' },
          { seatNumber: 'L3', firstName: 'Priya', lastName: 'Sharma', age: 31, gender: 'FEMALE' },
        ],
        contact: { email: 'amit@example.com', phone: '+919876543210' },
        expectedTotalPaise: 94_600,
      },
      { headers: { 'Idempotency-Key': useBusDraft.getState().idempotencyKey } },
    );
    expect(await screen.findByRole('button', { name: 'Pay ₹946' })).toBeInTheDocument();
    expect(screen.getByText('Seats L1, L4')).toBeInTheDocument();
  });

  it('warns when a chosen seat was taken meanwhile', async () => {
    const map = makeSeatMap(TRIP.id);
    const l3 = map.decks[0]?.seats.find((s) => s.number === 'L3');
    if (l3) l3.available = false;
    serve((url) => (url === `/buses/${TRIP.id}/seats` ? map : busRoutes(url)));
    useBusDraft.getState().setTravellers(
      [
        { seatNumber: 'L1', firstName: 'Amit', lastName: 'Sharma', age: 34, gender: 'MALE' },
        { seatNumber: 'L3', firstName: 'Priya', lastName: 'Sharma', age: 31, gender: 'FEMALE' },
      ],
      { email: 'amit@example.com', phone: '+919876543210' },
    );
    renderRoute('/buses/review', makeUser());
    expect(await screen.findByText(/Seat L3 was just booked by someone else/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Choose other seats' })).toHaveAttribute(
      'href',
      `/buses/${TRIP.id}/seats`,
    );
    expect(screen.queryByRole('button', { name: /continue to payment/i })).not.toBeInTheDocument();
  });

  it('shows the confirmation with the operator PNR and seats', async () => {
    const confirmed = busBooking({
      status: 'CONFIRMED',
      paymentStatus: 'SUCCESS',
      holdExpiresAt: null,
    });
    if (confirmed.bus) confirmed.bus.pnr = 'SSK1234567';
    serve((url) => (url === '/bookings/ZP-2026-BUS123' ? confirmed : undefined));
    renderRoute('/buses/confirmation?ref=ZP-2026-BUS123', makeUser());
    expect(await screen.findByText('Your trip is booked!')).toBeInTheDocument();
    expect(screen.getByText('Operator PNR')).toBeInTheDocument();
    expect(screen.getByText('SSK1234567')).toBeInTheDocument();
    expect(screen.getByText('Seat L1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download e-ticket/i })).toBeEnabled();
  });
});
