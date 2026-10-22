import type { BookingDetails } from '@zproo/types';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { couponsApi } from '@/features/coupons/api';
import { useFlightDraft } from '@/features/flights/draft';
import { useFareSelection } from '@/features/flights/fareSelection';
import { OFFERS, searchResult } from '@/features/flights/test/fixtures';
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
const RESULTS =
  '/flights/results?trip=ONE_WAY&from=PNQ&to=DEL&date=2026-10-25&adults=1&cabin=ECONOMY';

/** Answers GETs from `routes` (URL → response); anything else is a 404. */
function serve(routes: (url: string) => unknown) {
  get.mockImplementation(async (url: string) => {
    const found = routes(url);
    if (found === undefined) throw new ApiClientError('Not found', 404, 'NOT_FOUND');
    return found;
  });
}

/** Search and offers, like the API would answer them from the fixtures. */
const flightRoutes = (url: string) =>
  url === '/flights/search' ? searchResult() : OFFERS.find((o) => url === `/flights/${o.id}`);

const serveFlights = () => serve(flightRoutes);

function booking(overrides: Partial<BookingDetails> = {}): BookingDetails {
  const offer = OFFERS[0] as (typeof OFFERS)[number];
  return {
    reference: 'ZP-2026-ABC123',
    serviceType: 'FLIGHT',
    status: 'PENDING_PAYMENT',
    paymentStatus: 'CREATED',
    createdAt: '2026-09-26T10:00:00.000Z',
    holdExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    confirmedAt: null,
    cancelledAt: null,
    travelDate: '2026-10-25',
    price: {
      lines: [
        { label: 'Base fare — Adult × 1', amountPaise: 400_000 },
        { label: 'Taxes & airport fees', amountPaise: 80_000 },
      ],
      basePaise: 400_000,
      taxesPaise: 80_000,
      feesPaise: 0,
      discountPaise: 0,
      totalPaise: 480_000,
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
        age: null,
        gender: 'MALE',
        seatNumber: null,
      },
    ],
    flights: [{ sequence: 1, offer, pnr: null, tickets: [] }],
    bus: null,
    ...overrides,
  };
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  useFlightDraft.getState().clear();
  useFareSelection.getState().clear();
});

describe('flight results', () => {
  it('lists offers with filters, and filters them', async () => {
    serveFlights();
    const user = userEvent.setup();
    renderRoute(RESULTS);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pune → New Delhi' }),
    ).toBeInTheDocument();
    expect(await screen.findAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('note')).toHaveTextContent(/demo inventory/i);
    expect(get).toHaveBeenCalledWith('/flights/search', {
      params: expect.objectContaining({ from: 'PNQ', to: 'DEL', date: '2026-10-25', adults: '1' }),
    });

    const sidebar = screen.getAllByRole('group', { name: 'Stops' })[0] as HTMLElement;
    await user.click(within(sidebar).getByRole('checkbox', { name: /non stop/i }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('2 of 3 flights · Pune to New Delhi')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Cheapest' }));
    const [first] = screen.getAllByRole('article');
    expect(first).toHaveAccessibleName(/Saffron Air SF 201/);
  });

  it('explains an invalid search', async () => {
    renderRoute('/flights/results?from=PNQ&to=PNQ');
    expect(await screen.findByText(/that search isn't complete/i)).toBeInTheDocument();
    expect(get).not.toHaveBeenCalledWith('/flights/search', expect.anything());
  });

  it('opens fare options and saves the selected fare, then stops', async () => {
    serveFlights();
    const user = userEvent.setup();
    const { router } = renderRoute(RESULTS);
    const cards = await screen.findAllByRole('article');
    await user.click(within(cards[0] as HTMLElement).getByRole('button', { name: /view prices/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Fare options' });
    expect(within(dialog).getByText('Saver')).toBeInTheDocument();
    expect(within(dialog).getByText('7 Kg')).toBeInTheDocument();
    expect(within(dialog).getByText('15 Kg')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Non-refundable').length).toBeGreaterThan(0);
    await user.click(within(dialog).getByRole('button', { name: 'Select Fare' }));

    expect(useFareSelection.getState().selection).toMatchObject({
      tripType: 'ONE_WAY',
      cabin: 'ECONOMY',
      pax: { adults: 1, children: 0, infants: 0 },
      selected: {
        '0': {
          route: { from: 'PNQ', to: 'DEL', date: '2026-10-25' },
          offer: { id: 'mk_f1_20261025_E' },
          fare: { name: 'Saver', cabinBaggageKg: 7, checkedBaggageKg: 15, pricePaise: 480_000 },
        },
      },
    });
    // The flow ends here: no navigation, no booking started.
    expect(router.state.location.pathname).toBe('/flights/results');
    expect(useFlightDraft.getState().itinerary).toBeNull();
    expect(await screen.findByRole('status')).toHaveTextContent(/fare saved/i);
  });

  it('Book starts a booking and asks guests to sign in first', async () => {
    serveFlights();
    const user = userEvent.setup();
    const { router } = renderRoute(RESULTS);
    const cards = await screen.findAllByRole('article');
    const card = within(cards[0] as HTMLElement);
    const buttons = card.getAllByRole('button').map((b) => b.textContent);
    expect(buttons.indexOf('View Prices')).toBeLessThan(buttons.indexOf('Book'));
    await user.click(card.getByRole('button', { name: /^Book/ }));
    await screen.findByRole('heading', { name: /welcome back/i });
    expect(router.state.location.search).toBe('?next=%2Fflights%2Fbooking');
    expect(useFlightDraft.getState().itinerary).toMatchObject({
      offerIds: ['mk_f1_20261025_E'],
      pax: { adults: 1, children: 0, infants: 0 },
      searchUrl: RESULTS,
    });
  });

  it('Book opens the traveller details for a signed-in user', async () => {
    serveFlights();
    const user = userEvent.setup();
    const { router } = renderRoute(RESULTS, makeUser());
    const cards = await screen.findAllByRole('article');
    await user.click(within(cards[0] as HTMLElement).getByRole('button', { name: /^Book/ }));
    expect(router.state.location.pathname).toBe('/flights/booking');
  });

  it('sorts by latest departure', async () => {
    serveFlights();
    const user = userEvent.setup();
    renderRoute(RESULTS);
    await screen.findAllByRole('article');
    await user.click(screen.getByRole('radio', { name: 'Latest Departure' }));
    expect(screen.getAllByRole('article')[0]).toHaveAccessibleName(/Monsoon Airways MN 455/);
  });

  it('moves to another date from the date price strip', async () => {
    serveFlights();
    const user = userEvent.setup();
    const { router } = renderRoute(RESULTS);
    await screen.findAllByRole('article');
    const strip = screen.getByRole('region', { name: 'Fares by date' });
    await user.click(within(strip).getByRole('button', { name: /26 Oct/ }));
    expect(router.state.location.search).toContain('date=2026-10-26');
  });

  it('shows the baggage from the search in the summary and keeps it in the URL', async () => {
    serveFlights();
    renderRoute(`${RESULTS}&cabinBag=7&checkedBag=15`);
    expect(await screen.findByText(/7 Kg Cabin \+ 15 Kg Checked/)).toBeInTheDocument();
  });
});

describe('flight checkout', () => {
  it('asks for a flight when none is selected', async () => {
    renderRoute('/flights/booking', makeUser());
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No flight selected' }),
    ).toBeInTheDocument();
  });

  it('validates travellers, then reviews and creates the booking with an idempotency key', async () => {
    serveFlights();
    const offer = OFFERS[0] as (typeof OFFERS)[number];
    useFlightDraft.getState().start({
      offerIds: [offer.id],
      pax: { adults: 1, children: 0, infants: 0 },
      expectedTotalPaise: offer.totalPaise,
      searchUrl: RESULTS,
    });
    const user = userEvent.setup();
    const { router } = renderRoute('/flights/booking', makeUser());
    await screen.findByRole('heading', { level: 1, name: 'Traveller details' });

    const submit = await screen.findByRole('button', { name: /continue to seats/i });
    await user.click(submit);
    expect(await screen.findAllByText('Enter first name')).toHaveLength(1);

    await user.type(screen.getByLabelText('First & middle name'), 'Amit');
    await user.type(screen.getByLabelText('Last name'), 'Sharma');
    // Domestic adults give a government photo ID and confirm it matches the original.
    await user.click(submit);
    expect(await screen.findByText('Enter ID number')).toBeInTheDocument();
    await user.type(screen.getByLabelText('ID number'), '234567890124');
    await user.click(screen.getByLabelText(/match the original government id/i));
    await user.click(submit);

    // Seats are compulsory (Continue stays disabled until one is picked); meals and baggage can be skipped.
    await screen.findByRole('heading', { level: 1, name: 'Choose your seats' });
    expect(screen.queryByRole('link', { name: /skip seats/i })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /continue to meals/i })).toBeDisabled();
    const [freeSeat] = await screen.findAllByRole('button', { name: /, available$/ });
    await user.click(freeSeat as HTMLElement);
    await user.click(await screen.findByRole('link', { name: /continue to meals/i }));
    await screen.findByRole('heading', { level: 1, name: 'Pre-book your meals' });
    await user.click(await screen.findByRole('link', { name: /skip meals/i }));
    await screen.findByRole('heading', { level: 1, name: 'Add extra baggage' });
    await user.click(await screen.findByRole('link', { name: /skip & review/i }));

    await screen.findByRole('heading', { level: 1, name: 'Review your booking' });
    expect(screen.getAllByText('Mr Amit Sharma').length).toBeGreaterThan(0);
    expect(screen.getByText('amit@example.com')).toBeInTheDocument();

    post.mockResolvedValueOnce(booking());
    serve((url) => (url.startsWith('/bookings/') ? booking() : flightRoutes(url)));
    post.mockResolvedValueOnce({
      paymentId: 'pay1',
      provider: 'mock',
      providerOrderId: 'mockorder_1',
      amountPaise: 480_000,
      currency: 'INR',
      publicKey: null,
      bookingReference: 'ZP-2026-ABC123',
      holdExpiresAt: null,
    });
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    await screen.findByRole('heading', { level: 1, name: 'Payment' });
    expect(router.state.location.search).toBe('?ref=ZP-2026-ABC123');
    const key = useFlightDraft.getState().idempotencyKey;
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/flights/book',
      expect.objectContaining({
        offerIds: [offer.id],
        passengers: [
          expect.objectContaining({ firstName: 'Amit', lastName: 'Sharma', type: 'ADULT' }),
        ],
        contact: { email: 'amit@example.com', phone: '+919876543210' },
        // The chosen seat is booked with the flight, and its price is part of the expected total.
        addOns: expect.objectContaining({ seats: expect.any(Object) }),
      }),
      { headers: { 'Idempotency-Key': key } },
    );
    const body = post.mock.calls[0]?.[1] as { expectedTotalPaise: number };
    expect(body.expectedTotalPaise).toBeGreaterThanOrEqual(offer.totalPaise);
    expect(await screen.findByRole('button', { name: 'Pay ₹4,800' })).toBeInTheDocument();
  });

  it('offers the new fare when the price changed', async () => {
    const offer = { ...(OFFERS[0] as (typeof OFFERS)[number]), totalPaise: 500_000 };
    serve((url) => (url === `/flights/${offer.id}` ? offer : undefined));
    const draft = useFlightDraft.getState();
    draft.start({
      offerIds: [offer.id],
      pax: { adults: 1, children: 0, infants: 0 },
      expectedTotalPaise: 480_000,
      searchUrl: RESULTS,
    });
    draft.setTravellers(
      [{ type: 'ADULT', title: 'MR', firstName: 'Amit', lastName: 'Sharma', gender: 'MALE' }],
      { email: 'amit@example.com', phone: '+919876543210' },
    );
    const user = userEvent.setup();
    renderRoute('/flights/review', makeUser());
    const alert = await screen.findByText(/the fare has changed/i);
    expect(alert.parentElement).toHaveTextContent('from ₹4,800 to ₹5,000');
    await user.click(screen.getByRole('button', { name: 'Continue with ₹5,000' }));
    expect(useFlightDraft.getState().itinerary?.expectedTotalPaise).toBe(500_000);
    expect(await screen.findByRole('button', { name: /continue to payment/i })).toBeEnabled();
  });

  it('applies a coupon made in the admin panel on the review page and books with the discounted total', async () => {
    serveFlights();
    const offer = OFFERS[0] as (typeof OFFERS)[number];
    const draft = useFlightDraft.getState();
    draft.start({
      offerIds: [offer.id],
      pax: { adults: 1, children: 0, infants: 0 },
      expectedTotalPaise: offer.totalPaise,
      searchUrl: RESULTS,
    });
    draft.setTravellers(
      [{ type: 'ADULT', title: 'MR', firstName: 'Amit', lastName: 'Sharma', gender: 'MALE' }],
      { email: 'amit@example.com', phone: '+919876543210' },
    );
    const refused = new ApiClientError('Validation failed', 400, 'VALIDATION_ERROR', [
      { path: 'body.code', message: 'This coupon has expired' },
    ]);
    const check = vi.spyOn(couponsApi, 'check').mockImplementation(async (input) => {
      if (input.code === 'OLD1') throw refused;
      return { code: input.code, description: '₹100 off flights', discountPaise: 10_000 };
    });
    const user = userEvent.setup();
    renderRoute('/flights/review', makeUser());
    await screen.findByRole('heading', { level: 1, name: 'Review your booking' });

    // A refused code says why and is not kept.
    const field = await screen.findByLabelText('Coupon code');
    await user.type(field, 'old1');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('This coupon has expired')).toBeInTheDocument();
    expect(useFlightDraft.getState().promoCode).toBeNull();
    expect(check).toHaveBeenCalledWith({ code: 'OLD1', service: 'FLIGHT', orderPaise: offer.totalPaise });

    // A good code shows the saving and the new total.
    await user.clear(field);
    await user.type(field, 'fly100');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText(/FLY100 applied — you save ₹100/)).toBeInTheDocument();
    expect(useFlightDraft.getState().promoCode).toBe('FLY100');
    expect(await screen.findByText(/You saved ₹100 on this booking/)).toBeInTheDocument();

    // The booking carries the code and the total after the coupon.
    post.mockResolvedValueOnce(
      booking({
        price: { ...booking().price, discountPaise: 10_000, totalPaise: offer.totalPaise - 10_000 },
      }),
    );
    serve((url) => (url.startsWith('/bookings/') ? booking() : flightRoutes(url)));
    post.mockResolvedValueOnce({
      paymentId: 'pay1',
      provider: 'mock',
      providerOrderId: 'mockorder_1',
      amountPaise: offer.totalPaise - 10_000,
      currency: 'INR',
      publicKey: null,
      bookingReference: 'ZP-2026-ABC123',
      holdExpiresAt: null,
    });
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));
    await screen.findByRole('heading', { level: 1, name: 'Payment' });
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/flights/book',
      expect.objectContaining({ promoCode: 'FLY100', expectedTotalPaise: offer.totalPaise - 10_000 }),
      expect.anything(),
    );
    check.mockRestore();
  });

  it('shows the confirmation with PNR and ticket numbers', async () => {
    const confirmed = booking({
      status: 'CONFIRMED',
      paymentStatus: 'SUCCESS',
      holdExpiresAt: null,
      flights: [
        {
          sequence: 1,
          offer: OFFERS[0] as (typeof OFFERS)[number],
          pnr: 'Q7X2KD',
          tickets: [{ passengerId: 'p1', ticketNumber: '0981234567890' }],
        },
      ],
    });
    serve((url) => (url === '/bookings/ZP-2026-ABC123' ? confirmed : undefined));
    renderRoute('/flights/confirmation?ref=ZP-2026-ABC123', makeUser());
    expect(await screen.findByText('Your trip is booked!')).toBeInTheDocument();
    expect(screen.getByText('Q7X2KD')).toBeInTheDocument();
    expect(screen.getByText('0981234567890')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download e-ticket/i })).toBeEnabled();
  });
});
