import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/services/http';
import { makeUser, renderRoute } from '@/test/render';
import { authApi } from './api';
import { useAuthFlow } from './flowStore';
import { useAuthStore } from './store';

vi.mock('./api', () => ({
  authApi: {
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    refresh: vi.fn(),
    social: vi.fn(),
    me: vi.fn(),
    updateMe: vi.fn(),
  },
}));

const api = vi.mocked(authApi);
const session = (overrides = {}) => ({
  user: makeUser(overrides),
  accessToken: 'access-1',
  expiresIn: 900,
});

beforeEach(() => {
  vi.clearAllMocks();
  useAuthFlow.getState().clear();
});

/** The login/sign-up card's form (its tabs and the submit button share the label "Login"). */
const authForm = () => within(document.querySelector('form') as HTMLFormElement);

describe('mobile OTP sign-up', () => {
  it('goes from the sign-up form to OTP to signed in', async () => {
    const user = userEvent.setup();
    api.sendOtp.mockResolvedValue({ expiresIn: 300, resendIn: 60, devCode: '482913' });
    api.verifyOtp.mockResolvedValue({
      status: 'SIGNUP_REQUIRED',
      signupToken: 'signup-token',
      phone: '+919876543210',
    });
    api.register.mockResolvedValue(session({ fullName: 'Riya Nair' }));

    const { router } = renderRoute('/signup?next=/offers');
    await user.type(await screen.findByLabelText('Full name'), 'Riya Nair');
    await user.type(screen.getByLabelText('Mobile number'), '9876543210');
    await user.type(screen.getByLabelText('Email'), 'riya@example.com');
    await user.type(screen.getByLabelText('Password'), 'travel2026');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(api.sendOtp).toHaveBeenCalledWith('+919876543210'));

    expect(await screen.findByRole('heading', { name: 'Verify OTP' })).toBeInTheDocument();
    expect(screen.getByText('482913')).toBeInTheDocument(); // development code hint
    await user.type(screen.getByLabelText('One-time code'), '482913');
    expect(api.verifyOtp).toHaveBeenCalledWith('+919876543210', '482913');

    // The details typed on the sign-up form are carried over.
    expect(await screen.findByRole('heading', { name: 'Almost there' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Riya Nair');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/offers'));
    expect(api.register).toHaveBeenCalledWith(
      expect.objectContaining({ signupToken: 'signup-token', fullName: 'Riya Nair' }),
    );
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'access-1' });
  });

  it('signs existing users straight in after the code', async () => {
    const user = userEvent.setup();
    api.sendOtp.mockResolvedValue({ expiresIn: 300, resendIn: 60 });
    api.verifyOtp.mockResolvedValue({ status: 'AUTHENTICATED', ...session() });
    const { router } = renderRoute('/login');
    await user.click(await screen.findByRole('button', { name: 'Mobile' }));
    await user.type(screen.getByLabelText('Mobile number'), '9876543210');
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));
    await user.type(await screen.findByLabelText('One-time code'), '123456');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(api.register).not.toHaveBeenCalled();
  });

  it('validates the number before calling the API', async () => {
    const user = userEvent.setup();
    renderRoute('/login');
    await user.click(await screen.findByRole('button', { name: 'Mobile' }));
    await user.type(screen.getByLabelText('Mobile number'), '12345');
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));
    await waitFor(() => expect(screen.getByLabelText('Mobile number')).toHaveAttribute('aria-invalid', 'true'));
    expect(api.sendOtp).not.toHaveBeenCalled();
  });

  it('shows the API message for a wrong code and lets the user retry', async () => {
    const user = userEvent.setup();
    useAuthFlow.getState().startOtp('+919876543210', '/', { resendIn: 60 });
    api.verifyOtp.mockRejectedValueOnce(
      new ApiClientError('Incorrect code. 4 attempts left.', 400, 'INVALID_OTP'),
    );
    renderRoute('/verify-otp');
    await user.type(await screen.findByLabelText('One-time code'), '000000');
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect code. 4 attempts left.');
    expect(screen.getByLabelText('One-time code')).toHaveValue('');
  });

  it('sends people who open /verify-otp directly back to login', async () => {
    const { router } = renderRoute('/verify-otp');
    await screen.findByRole('heading', { name: /welcome back/i });
    expect(router.state.location.pathname).toBe('/login');
  });
});

describe('password login', () => {
  it('signs in with email and password', async () => {
    const user = userEvent.setup();
    api.login.mockResolvedValue(session());
    const { router } = renderRoute('/login?next=/wallet');
    await user.type(await screen.findByLabelText('Email'), 'Amit@Example.com');
    await user.type(screen.getByLabelText('Password'), 'travel2026');
    await user.click(authForm().getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/wallet'));
    expect(api.login).toHaveBeenCalledWith('amit@example.com', 'travel2026');
  });

  it('shows invalid credentials', async () => {
    const user = userEvent.setup();
    api.login.mockRejectedValue(
      new ApiClientError('Incorrect mobile number, email or password', 401, 'INVALID_CREDENTIALS'),
    );
    renderRoute('/login');
    await user.type(await screen.findByLabelText('Email'), 'amit@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpass1');
    await user.click(authForm().getByRole('button', { name: 'Login' }));
    expect(await screen.findAllByText('Incorrect mobile number, email or password')).not.toHaveLength(0);
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('never redirects off-site after login', async () => {
    const user = userEvent.setup();
    api.login.mockResolvedValue(session());
    const { router } = renderRoute('/login?next=https://evil.example');
    await user.type(await screen.findByLabelText('Email'), 'amit@example.com');
    await user.type(screen.getByLabelText('Password'), 'travel2026');
    await user.click(authForm().getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});

describe('password reset', () => {
  it('sends a code, checks the new password, and returns to login', async () => {
    const user = userEvent.setup();
    api.forgotPassword.mockResolvedValue({ expiresIn: 300, resendIn: 60 });
    api.resetPassword.mockResolvedValue(null);
    const { router } = renderRoute('/forgot-password');

    await user.type(await screen.findByLabelText('Mobile number or email'), 'amit@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset code' }));
    expect(await screen.findByRole('heading', { name: 'Reset password' })).toBeInTheDocument();
    expect(screen.getByText('amit@example.com')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Reset code'), '123456');
    await user.type(screen.getByLabelText('New password'), 'newjourney9');
    await user.type(screen.getByLabelText('Confirm new password'), 'different9');
    await user.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(api.resetPassword).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Confirm new password'));
    await user.type(screen.getByLabelText('Confirm new password'), 'newjourney9');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(api.resetPassword).toHaveBeenCalledWith('amit@example.com', '123456', 'newjourney9');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Password updated. Log in with your new password.',
    );
  });
});
