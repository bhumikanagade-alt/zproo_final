import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS } from '@zproo/types';
import { skipAppPopupForTests } from '@/components/promotions/AppDiscountPopup';
import { makeUser, renderRoute, supportUser } from '@/test/render';

describe('routing', () => {
  it('renders the home page inside the public layout', async () => {
    renderRoute('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: /travel smarter/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ZPROO GO home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    const services = screen.getByRole('region', { name: /our travel services/i });
    expect(within(services).getAllByRole('link')).toHaveLength(8);
  });

  it.each([['/holidays/goa-beach-bliss', 'Holiday details', 10]])('renders the planned page for %s', async (path, title, phase) => {
    renderRoute(path);
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(phase).toBeGreaterThan(5);
  });

  it('renders auth routes in the auth layout without the site header', async () => {
    renderRoute('/login');
    expect(
      await screen.findByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Travel services' })).not.toBeInTheDocument();
  });

  it('renders the admin shell with the sections the role may use', async () => {
    renderRoute('/admin/refunds', makeUser({ roles: ['SUPPORT'], permissions: ROLE_PERMISSIONS.SUPPORT }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Refunds' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(nav).getByRole('link', { name: 'Refunds' })).toHaveAttribute('aria-current', 'page');
    for (const name of ['Dashboard', 'Bookings', 'Support', 'Payments', 'Users', 'Settings']) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument();
    }
    // Marketing, catalogue and audit sections need permissions support agents do not have.
    for (const name of ['Coupons', 'Flights', 'Audit log', 'Wallet']) {
      expect(within(nav).queryByRole('link', { name })).not.toBeInTheDocument();
    }
  });

  it('renders 404 for unknown paths, including unknown admin sections', async () => {
    renderRoute('/no-such-page');
    expect(await screen.findByRole('heading', { name: /wrong turn/i })).toBeInTheDocument();
  });

  it('renders 404 for unknown admin sections', async () => {
    renderRoute('/admin/nope', supportUser());
    expect(await screen.findByRole('heading', { name: /wrong turn/i })).toBeInTheDocument();
  });

  it('opens quick search from the header and navigates to a service', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/');
    await screen.findByRole('heading', { level: 1, name: /travel smarter/i });
    await user.click(screen.getByRole('button', { name: /search flights, buses/i }));
    await user.type(
      // The dialog's code loads on first open.
      await screen.findByRole('textbox', { name: /search services and pages/i }),
      'bus{Enter}',
    );
    await screen.findByRole('heading', { level: 1, name: 'Book bus tickets' });
    expect(router.state.location.pathname).toBe('/buses');
  });
});

describe('route guards', () => {
  it('sends signed-out visitors to login and remembers where they were going', async () => {
    const { router } = renderRoute('/bookings?tab=upcoming');
    expect(
      await screen.findByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=%2Fbookings%3Ftab%3Dupcoming');
  });

  it.each(['/wallet', '/bookings', '/bookings/ZP-2026-7K3QX9', '/profile'])(
    'protects the account page %s',
    async (path) => {
      const { router } = renderRoute(path);
      await screen.findByRole('heading', { name: /welcome back/i });
      expect(router.state.location.pathname).toBe('/login');
    },
  );

  it('shows account pages to signed-in users', async () => {
    renderRoute('/wallet', makeUser());
    expect(
      await screen.findByRole('heading', { level: 1, name: 'ZPROO Wallet' }),
    ).toBeInTheDocument();
  });

  it('waits for the session check instead of redirecting too early', async () => {
    renderRoute('/profile', 'loading');
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument();
  });

  it('shows 403 to signed-in users without admin access', async () => {
    renderRoute('/admin', makeUser());
    expect(
      await screen.findByRole('heading', { name: "You don't have access to this page" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('sends signed-out visitors from admin to login', async () => {
    const { router } = renderRoute('/admin/users');
    await screen.findByRole('heading', { name: /welcome back/i });
    expect(router.state.location.search).toBe('?next=%2Fadmin%2Fusers');
  });

  it('moves signed-in users away from the login page', async () => {
    const { router } = renderRoute('/login?next=/wallet', makeUser());
    await screen.findByRole('heading', { level: 1, name: 'ZPROO Wallet' });
    expect(router.state.location.pathname).toBe('/wallet');
  });

  it('shows the account menu instead of the login button when signed in', async () => {
    skipAppPopupForTests();
    const user = userEvent.setup();
    renderRoute('/', supportUser());
    await screen.findByRole('heading', { level: 1, name: /travel smarter/i });
    expect(screen.queryByRole('link', { name: 'Login / Sign up' })).not.toBeInTheDocument();
    // The menu's code loads once the page is idle (it is kept out of the initial download).
    await waitFor(() => expect(screen.getByRole('button', { name: /account menu/i })).toHaveAttribute('aria-haspopup', 'menu'), { timeout: 8000 });
    await user.click(screen.getByRole('button', { name: /account menu/i }));
    expect(await screen.findByRole('menuitem', { name: /admin panel/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
  }, 15_000);
});
