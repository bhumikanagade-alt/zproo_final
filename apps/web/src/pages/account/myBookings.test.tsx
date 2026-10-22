import type { BookingListItem } from '@zproo/types';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as httpModule from '@/services/http';
import { apiGet, ApiClientError } from '@/services/http';
import { makeUser, renderRoute } from '@/test/render';

vi.mock('@/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof httpModule>()),
  apiGet: vi.fn(),
}));

const get = vi.mocked(apiGet);
const future = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);

const item = (overrides: Partial<BookingListItem>): BookingListItem => ({
  reference: 'ZP-2026-AAAAAA',
  serviceType: 'FLIGHT',
  status: 'CONFIRMED',
  paymentStatus: 'SUCCESS',
  title: 'PNQ → DEL',
  subtitle: '1 traveller · 1 flight',
  travelDate: future,
  totalPaise: 480_000,
  createdAt: '2026-09-26T10:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  get.mockReset();
  get.mockImplementation(async (url: string) => {
    if (url === '/bookings') {
      return [
        item({}),
        item({
          reference: 'ZP-2026-BBBBBB',
          serviceType: 'BUS',
          status: 'PENDING_PAYMENT',
          title: 'Pune → Mumbai',
          subtitle: 'Sahyadri Skyline · Seats L1, L4',
          totalPaise: 94_600,
        }),
        item({ reference: 'ZP-2026-CCCCCC', status: 'CANCELLED', title: 'BOM → GOI' }),
        item({
          reference: 'ZP-2026-DDDDDD',
          serviceType: 'TRAIN',
          status: 'CONFIRMED',
          title: 'Pune Junction → New Delhi',
          subtitle: 'Z2101 Deccan Breeze Superfast · Sleeper (SL) · 2 passengers · PNR ZD12345678',
          statusLabel: 'Booked · GNWL 4',
        }),
        item({
          reference: 'ZP-2026-EEEEEE',
          serviceType: 'TRAIN',
          status: 'PROCESSING',
          title: 'Mumbai CSMT → Pune Junction',
          statusLabel: 'Payment received · reserving',
        }),
      ] satisfies BookingListItem[];
    }
    throw new ApiClientError('Not found', 404, 'NOT_FOUND');
  });
});

describe('My bookings', () => {
  it('lists upcoming flight and bus bookings with links to each ticket or payment', async () => {
    const user = userEvent.setup();
    renderRoute('/bookings', makeUser());
    expect(await screen.findByRole('link', { name: /PNQ → DEL/ })).toHaveAttribute(
      'href',
      '/flights/confirmation?ref=ZP-2026-AAAAAA',
    );
    expect(screen.getByRole('link', { name: /Pune → Mumbai.*Awaiting payment/ })).toHaveAttribute(
      'href',
      '/buses/payment?ref=ZP-2026-BBBBBB',
    );
    expect(screen.queryByText('BOM → GOI')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Cancelled' }));
    expect(screen.getByText('BOM → GOI')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Past' }));
    expect(screen.getByText('No past bookings')).toBeInTheDocument();
  });

  it('shows train bookings with their railway status, and pending ones in their own tab', async () => {
    const user = userEvent.setup();
    renderRoute('/bookings', makeUser());
    const train = await screen.findByRole('link', { name: /Pune Junction → New Delhi/ });
    expect(train).toHaveAttribute('href', '/trains/bookings/ZP-2026-DDDDDD');
    // A waitlisted ticket is never labelled "Confirmed".
    expect(train).toHaveTextContent('Booked · GNWL 4');
    expect(train).not.toHaveTextContent('Confirmed');

    await user.click(screen.getByRole('tab', { name: 'Pending' }));
    expect(screen.getByRole('link', { name: /Mumbai CSMT → Pune Junction.*Payment received/ })).toHaveAttribute(
      'href',
      '/trains/bookings/ZP-2026-EEEEEE',
    );
    expect(screen.getByRole('link', { name: /Pune → Mumbai.*Awaiting payment/ })).toBeInTheDocument();
    expect(screen.queryByText('PNQ → DEL')).not.toBeInTheDocument();
  });
});
