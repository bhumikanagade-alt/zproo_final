import type { Permission, PublicUser, RoleName } from '@zproo/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { useAuthStore } from '@/features/auth/store';
import { routes } from '@/routes/routes';

export function makeUser(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    id: 'user-1',
    fullName: 'Amit Sharma',
    phone: '+919876543210',
    email: 'amit@example.com',
    avatarUrl: null,
    dateOfBirth: null,
    gender: null,
    state: null,
    phoneVerified: true,
    emailVerified: false,
    hasPassword: false,
    roles: ['USER'] as RoleName[],
    permissions: ['profile:read:own', 'booking:create'] as Permission[],
    createdAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

export const supportUser = () =>
  makeUser({
    fullName: 'Support Agent',
    roles: ['SUPPORT'],
    permissions: ['admin:access', 'user:read:any', 'profile:read:own'],
  });

/**
 * Renders the real route tree at `path`, with an isolated query client.
 * `auth` sets the session: 'anonymous' (default), 'loading', or a signed-in user.
 */
export function renderRoute(
  path: string,
  auth: 'anonymous' | 'loading' | PublicUser = 'anonymous',
) {
  if (auth === 'anonymous' || auth === 'loading') {
    useAuthStore.setState({ status: auth, user: null, accessToken: null });
  } else {
    useAuthStore.setState({ status: 'authenticated', user: auth, accessToken: 'test-token' });
  }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, enabled: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utils, router };
}
