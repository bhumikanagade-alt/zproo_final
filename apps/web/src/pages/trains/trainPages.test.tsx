import type { AuthSession, OtpSent, VerifyOtpResult } from '@zproo/types';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrainDraft } from '@/features/trains/draft';
import type * as httpModule from '@/services/http';
import { resetStaticDb } from '@/static/core';
import { staticAdapter } from '@/static/server';
import { renderRoute } from '@/test/render';

// These tests drive the real pages against the in-browser demo engine (the same API contract the
// server implements), end to end: the API client is routed to the static adapter.
const api = axios.create({ baseURL: '/api', adapter: staticAdapter });

vi.mock('@/services/http', async (importOriginal) => {
  const real = await importOriginal<typeof httpModule>();
  const engine = axios.create({
    baseURL: '/api',
    adapter: (await import('@/static/server')).staticAdapter,
  });
  const unwrap = async <T,>(p: Promise<{ data: { data: T } }>) => {
    try {
      return (await p).data.data;
    } catch (err) {
      throw real.toApiClientError(err);
    }
  };
  return {
    ...real,
    apiGet: (url: string, config?: object) => unwrap(engine.get(url, config)),
    apiPost: (url: string, body?: unknown, config?: object) =>
      unwrap(engine.post(url, body, config)),
  };
});
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

async function signUp() {
  const phone = '9876543210';
  const otp = (await api.post('/auth/send-otp', { phone })).data.data as OtpSent;
  const verified = (await api.post('/auth/verify-otp', { phone, otp: otp.devCode })).data
    .data as VerifyOtpResult;
  if (verified.status !== 'SIGNUP_REQUIRED') throw new Error('expected signup');
  const session = (
    await api.post('/auth/register', { signupToken: verified.signupToken, fullName: 'Amit Sharma' })
  ).data.data as AuthSession;
  return session.user;
}

beforeEach(() => {
  resetStaticDb();
  useTrainDraft.getState().clear();
  window.sessionStorage.clear();
});

describe('train results', () => {
  it('shows demo-labelled trains with class availability, filters and sorting', async () => {
    const user = userEvent.setup();
    renderRoute(`/trains/results?from=PUNE&to=NDLS&date=${day(12)}&passengers=2`);
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Pune Junction \(PUNE\) → New Delhi \(NDLS\)/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 passengers/)).toBeInTheDocument();
    const card = await screen.findByRole('article', { name: /Z2101 Deccan Breeze Superfast/ });
    expect(screen.getByRole('note')).toHaveTextContent(/Demo inventory/);
    const classes = within(card).getByRole('radiogroup', { name: /Classes on Z2101/ });
    expect(within(classes).getAllByRole('radio').length).toBeGreaterThan(1);
    // Availability text is shown, not colour alone.
    expect(within(classes).getAllByText(/^(AVL|RAC|GNWL) \d+$|^REGRET$/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('radio', { name: 'Lowest fare' }));
    expect(screen.getByRole('radio', { name: 'Lowest fare' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(within(card).getByRole('button', { name: 'Route & stops' }));
    expect(within(card).getByRole('list', { name: 'Route' })).toHaveTextContent('Bhopal Junction');
  });

  it('asks for a complete search when the URL is invalid', async () => {
    renderRoute('/trains/results?from=PUNE&to=PUNE');
    expect(await screen.findByRole('heading', { name: 'Search trains' })).toBeInTheDocument();
    expect(screen.getByText(/from and to must be different/i)).toBeInTheDocument();
  });
});

describe('train booking flow (demo engine)', () => {
  it('goes from a class to passengers, review, payment and a PNR', async () => {
    const user = userEvent.setup();
    const me = await signUp();
    const { router } = renderRoute(`/trains/results?from=PUNE&to=NDLS&date=${day(30)}`, me);
    const card = await screen.findByRole('article', { name: /Z2101/ });
    const avl = within(card)
      .getAllByRole('radio')
      .find((r) => /AVL \d+/.test(r.getAttribute('aria-label') ?? ''));
    if (!avl) throw new Error('no available class');
    await user.click(avl);
    await user.click(within(card).getByRole('link', { name: /Continue/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your train' }),
    ).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Continue to passengers/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Passenger details' }),
    ).toBeInTheDocument();
    // Validation errors appear next to the fields.
    await user.click(await screen.findByRole('button', { name: /Continue to review/ }));
    expect(await screen.findByText('Enter first name')).toBeInTheDocument();
    expect(screen.getByText('Enter age')).toBeInTheDocument();
    await user.type(screen.getByLabelText('First & middle name'), 'Amit');
    await user.type(screen.getByLabelText('Last name (optional)'), 'Sharma');
    await user.type(screen.getByLabelText('Age'), '3');
    await user.click(screen.getByRole('button', { name: /Continue to review/ }));
    expect(
      await screen.findByText(/Children under 5 travel without a ticket/, {
        selector: 'p.text-danger',
      }),
    ).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Age'));
    await user.type(screen.getByLabelText('Age'), '34');
    await user.type(screen.getByLabelText('Email'), 'amit@example.com');
    await user.click(screen.getByRole('button', { name: /Continue to review/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Review your booking' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1. Amit Sharma')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Continue to pay/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Payment' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/trains/payment');
    await user.click(await screen.findByRole('button', { name: /^Pay ₹/ }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/trains/confirmation'));
    expect(await screen.findByText(/Booked — berths confirmed/)).toBeInTheDocument();
    expect(screen.getByText(/^ZD\d{8}$/, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View in My Bookings/ })).toHaveAttribute(
      'href',
      '/bookings',
    );
  }, 30_000);

  it('warns clearly before booking a waitlisted class and never calls it confirmed', async () => {
    const me = await signUp();
    // Find a waitlisted class on a demo train close to the date (demand is highest then).
    type Found = {
      t: { id: string };
      c: { travelClass: string; availability: { status: string } };
    };
    let hit: Found | undefined;
    for (const d of [1, 2, 3, 4, 5, 6]) {
      for (const [from, to] of [
        ['CSMT', 'PUNE'],
        ['PUNE', 'CSMT'],
        ['PUNE', 'SBC'],
        ['PUNE', 'NDLS'],
      ]) {
        const res = (await api.get('/trains/search', { params: { from, to, date: day(d) } })).data
          .data as {
          trains: (Found['t'] & { classes: Found['c'][] })[];
        };
        hit ??= res.trains
          .flatMap((t) => t.classes.map((c) => ({ t, c })))
          .find((x) => x.c.availability.status === 'WAITLIST');
      }
    }
    if (!hit) throw new Error('expected a waitlisted class in the demo network');
    renderRoute(
      `/trains/selection?offer=${hit.t.id}&class=${hit.c.travelClass}&quota=GN&passengers=1`,
      me,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/NOT a confirmed berth/);
    expect(screen.getByText('Waiting list', { exact: false })).toBeInTheDocument();
  });
});
