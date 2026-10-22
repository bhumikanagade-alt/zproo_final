import type { AuthSession } from '@zproo/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/store';
import { routes } from '@/routes/routes';
import { http } from '@/services/http';
import { resetStaticDb } from '@/static/core';
import { resetAdminDb } from '@/static/admin/db';
import { staticAdapter } from '@/static/server';

/**
 * The admin panel end to end against the in-browser engine (the same one the demo website uses),
 * signed in as the demo super admin.
 */
async function signInAsAdmin() {
  http.defaults.adapter = staticAdapter;
  const res = await http.post<{ data: AuthSession }>('/auth/login', { identifier: 'admin@zproogo.com', password: 'Admin@1234' });
  const session = res.data.data;
  useAuthStore.setState({ status: 'authenticated', user: session.user, accessToken: session.accessToken });
}

function renderAdmin(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(async () => {
  resetStaticDb();
  resetAdminDb();
  await signInAsAdmin();
});

describe('admin panel', () => {
  it('shows the dashboard with KPIs, charts and latest bookings', async () => {
    renderAdmin('/admin');
    expect(await screen.findByRole('heading', { level: 1, name: /good (morning|afternoon|evening), super/i })).toBeInTheDocument();
    expect(await screen.findByText('Net revenue')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Net revenue per day' })).toBeInTheDocument();
    expect((await screen.findAllByRole('button', { name: /^Open booking ZP-/ })).length).toBeGreaterThan(3);
    const nav = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(nav).getByRole('link', { name: 'Audit log' })).toBeInTheDocument();
  });

  it('filters bookings and opens one', async () => {
    const user = userEvent.setup();
    const router = renderAdmin('/admin/bookings?status=CONFIRMED');
    const rows = await screen.findAllByRole('button', { name: /^Open booking ZP-/ });
    await user.click(rows[0] as HTMLElement);
    expect(router.state.location.search).toMatch(/ref=ZP-/);
    expect(await screen.findByRole('button', { name: /cancel booking/i })).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
  });

  it('creates a coupon from the form', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin/coupons');
    expect(await screen.findByText('ZPFLY')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /new coupon/i }));
    await user.type(screen.getByLabelText('Code'), 'festive15');
    await user.type(screen.getByLabelText('Description'), 'Festive season discount');
    await user.clear(screen.getByLabelText('Percent off'));
    await user.type(screen.getByLabelText('Percent off'), '15');
    await user.click(screen.getByRole('button', { name: 'Create coupon' }));
    expect(await screen.findByText('FESTIVE15')).toBeInTheDocument();
  });
});
