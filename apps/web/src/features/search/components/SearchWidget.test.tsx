import type { ServiceType } from '@zproo/types';
import { addDays, todayIso } from '@zproo/validation';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SearchWidget } from './SearchWidget';

function renderWidget(service?: ServiceType) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <SearchWidget service={service} /> },
      { path: '*', element: <p>results page</p> },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
  const location = () => `${router.state.location.pathname}${router.state.location.search}`;
  return { router, location };
}

const inDays = (n: number) => addDays(todayIso(), n);

describe('SearchWidget — flights', () => {
  it('submits the default Pune → Delhi one-way search', async () => {
    const user = userEvent.setup();
    const { location } = renderWidget();
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));
    expect(await screen.findByText('results page')).toBeInTheDocument();
    expect(location()).toBe(
      `/flights/results?trip=ONE_WAY&from=PNQ&to=DEL&date=${inDays(7)}&adults=1&cabin=ECONOMY`,
    );
  });

  it('chooses an airport with the keyboard', async () => {
    const user = userEvent.setup();
    const { location } = renderWidget();
    const to = screen.getByRole('combobox', { name: 'To' });
    await user.click(to);
    await user.type(to, 'goi');
    expect(to).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(screen.getByRole('listbox', { name: 'To' })).getAllByRole('option')[0],
    ).toHaveTextContent('Goa');
    await user.keyboard('{Enter}');
    expect(to).toHaveValue('Goa');
    expect(to).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));
    await screen.findByText('results page');
    expect(location()).toContain('from=PNQ&to=GOI');
  });

  it('swaps origin and destination', async () => {
    const user = userEvent.setup();
    const { location } = renderWidget();
    await user.click(screen.getByRole('button', { name: 'Swap origin and destination' }));
    expect(screen.getByRole('combobox', { name: 'From' })).toHaveValue('New Delhi');
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));
    await screen.findByText('results page');
    expect(location()).toContain('from=DEL&to=PNQ');
  });

  it('shows validation errors instead of searching', async () => {
    const user = userEvent.setup();
    const { location } = renderWidget();
    const to = screen.getByRole('combobox', { name: 'To' });
    await user.click(to);
    await user.type(to, 'pnq{Enter}');
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));
    expect(await screen.findByText('From and To must be different')).toBeInTheDocument();
    expect(to).toHaveAttribute('aria-invalid', 'true');
    expect(location()).toBe('/');
  });

  it('shows Return only for a round trip', async () => {
    const user = userEvent.setup();
    renderWidget();
    expect(screen.queryByLabelText('Return')).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Round Trip' }));
    expect(screen.getByLabelText('Return')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'One Way' }));
    expect(screen.queryByLabelText('Return')).not.toBeInTheDocument();
  });

  it('searches a round trip with a return date', async () => {
    const user = userEvent.setup();
    const { location } = renderWidget();
    await user.click(screen.getByRole('radio', { name: 'Round Trip' }));
    fireEvent.change(screen.getByLabelText('Return'), { target: { value: inDays(12) } });
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));
    await screen.findByText('results page');
    expect(location()).toContain(`trip=ROUND_TRIP`);
    expect(location()).toContain(`return=${inDays(12)}`);
  });

  it('adds travellers and cabin class', async () => {
    const user = userEvent.setup();
    const { location } = renderWidget();
    await user.click(screen.getByRole('button', { name: /Travellers \+ Cabin/ }));
    await user.click(screen.getByRole('button', { name: 'More adults' }));
    await user.click(screen.getByRole('button', { name: 'More infants' }));
    await user.click(screen.getByRole('radio', { name: 'Business' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: /Travellers \+ Cabin/ })).toHaveTextContent(
      '3 Travellers',
    );
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));
    await screen.findByText('results page');
    expect(location()).toContain('adults=2&infants=1&cabin=BUSINESS');
  });

  it('keeps the chosen baggage in the search', async () => {
    const user = userEvent.setup();
    const { location } = renderWidget();
    await user.click(screen.getByRole('button', { name: /Baggage/ }));
    await user.click(screen.getByRole('radio', { name: '7 Kg' }));
    await user.click(screen.getByRole('radio', { name: '15 Kg' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: /Baggage/ })).toHaveTextContent(
      '7 Kg Cabin + 15 Kg Checked',
    );
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));
    await screen.findByText('results page');
    expect(location()).toContain('cabinBag=7&checkedBag=15');
  });

  it('builds a multi-city trip', async () => {
    const user = userEvent.setup();
    const { location } = renderWidget();
    await user.click(screen.getByRole('radio', { name: 'Multi City' }));
    expect(screen.getAllByRole('group', { name: /Flight \d/ })).toHaveLength(2);
    const secondTo = screen.getAllByRole('combobox', { name: 'To' })[1] as HTMLElement;
    await user.click(secondTo);
    await user.type(secondTo, 'goi{Enter}');
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));
    await screen.findByText('results page');
    expect(decodeURIComponent(location())).toContain(
      `legs=PNQ.DEL.${inDays(7)},DEL.GOI.${inDays(10)}`,
    );
  });
});

describe('SearchWidget — other services', () => {
  it('shows the bus search bar and searches buses', async () => {
    const user = userEvent.setup();
    const { location } = renderWidget('BUS');
    await user.click(await screen.findByRole('button', { name: 'Search Buses' }));
    await screen.findByText('results page');
    expect(location()).toBe(`/buses/results?from=pune&to=mumbai&date=${inDays(1)}`);
  });

  it('keeps hotel check-out after check-in', async () => {
    const user = userEvent.setup();
    const { location } = renderWidget('HOTEL');
    const checkIn = await screen.findByLabelText('Check-in');
    fireEvent.change(checkIn, { target: { value: inDays(20) } });
    await user.click(screen.getByRole('button', { name: 'Search Hotels' }));
    await screen.findByText('results page');
    expect(location()).toContain(`checkIn=${inDays(20)}&checkOut=${inDays(21)}`);
  });

  it('validates cab addresses', async () => {
    const user = userEvent.setup();
    renderWidget('CAB');
    await user.click(await screen.findByRole('button', { name: 'See Cab Fares' }));
    expect(await screen.findByText('Enter a pickup location')).toBeInTheDocument();
  });

  it('validates parcel PIN codes', async () => {
    const user = userEvent.setup();
    renderWidget('PARCEL');
    await user.type(await screen.findByLabelText('Pickup PIN code'), '0123');
    await user.click(screen.getByRole('button', { name: 'Get Quote' }));
    expect(await screen.findByText('Enter a valid 6-digit pickup PIN code')).toBeInTheDocument();
  });
});
