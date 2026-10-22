import {
  ArrowRight,
  BusFront,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useEffect, useState, type FormEvent, type MouseEvent, type HTMLAttributes, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  emailSchema,
  indianMobileSchema,
  passwordSchema,
  personNameSchema,
} from '@zproo/validation';
import { Button } from '@zproo/ui';
import { Seo } from '@/components/seo/Seo';
import { authApi } from '@/features/auth/api';
import { errorMessage } from '@/features/auth/errors';
import { useAuthFlow } from '@/features/auth/flowStore';
import { safeNext } from '@/features/auth/redirect';
import { useAuthStore } from '@/features/auth/store';
import { SocialSignIn } from '@/features/auth/components/SocialSignIn';

type Mode = 'login' | 'signup';
type LoginMethod = 'email' | 'mobile';

const emailLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

const mobileSchema = z.object({ mobile: indianMobileSchema });

const signupSchema = z.object({
  fullName: personNameSchema,
  mobile: indianMobileSchema,
  email: emailSchema,
  password: passwordSchema,
});

type FieldErrors = Partial<Record<'fullName' | 'email' | 'mobile' | 'password', string>>;

export default function LoginSignupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const initialMode: Mode = location.pathname === '/signup' ? 'signup' : 'login';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [loginErrors, setLoginErrors] = useState<FieldErrors>({});
  const [signupErrors, setSignupErrors] = useState<FieldErrors>({});
  const [notification, setNotification] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [pending, setPending] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification(message);
    setNotificationType(type);
    window.setTimeout(() => setNotification(''), 3200);
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setLoginErrors({});
    setSignupErrors({});
    setNotification('');
    void navigate(
      newMode === 'login'
        ? `/login${next === '/' ? '' : `?next=${encodeURIComponent(next)}`}`
        : `/signup${next === '/' ? '' : `?next=${encodeURIComponent(next)}`}`,
      { replace: true },
    );
  };

  useEffect(() => {
    setMode(location.pathname === '/signup' ? 'signup' : 'login');
  }, [location.pathname]);

  // After a password reset the reset page sends people here with a confirmation to show.
  const notice = (location.state as { notice?: string } | null)?.notice;
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => showNotification(notice), 0);
    return () => window.clearTimeout(timer);
    // Only when a new notice arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);

  const handlePanelMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((event.clientX - rect.left) / rect.width - 0.5) * 10,
      y: ((event.clientY - rect.top) / rect.height - 0.5) * 10,
    });
  };

  const handlePanelMouseLeave = () => setMousePosition({ x: 0, y: 0 });

  const clearLoginError = (key: keyof FieldErrors) =>
    setLoginErrors((current) => ({ ...current, [key]: undefined }));
  const clearSignupError = (key: keyof FieldErrors) =>
    setSignupErrors((current) => ({ ...current, [key]: undefined }));

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = emailLoginSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errors[key]) errors[key] = issue.message;
      }
      setLoginErrors(errors);
      showNotification('Please fix the errors', 'error');
      return;
    }

    setPending(true);
    setLoginErrors({});
    try {
      const session = await authApi.login(result.data.email, result.data.password);
      useAuthStore.getState().setSession(session);
      showNotification('Login successful!');
      window.setTimeout(() => navigate(next, { replace: true }), 250);
    } catch (error) {
      setLoginErrors({ password: errorMessage(error) });
      showNotification(errorMessage(error), 'error');
    } finally {
      setPending(false);
    }
  };

  const handleSendLoginOtp = async () => {
    const result = mobileSchema.safeParse({ mobile: loginMobile });
    if (!result.success) {
      setLoginErrors({ mobile: result.error.issues[0]?.message ?? 'Enter a valid mobile number' });
      showNotification('Enter a valid mobile number', 'error');
      return;
    }

    setPending(true);
    setLoginErrors({});
    try {
      useAuthFlow.getState().startOtp(
        result.data.mobile,
        next,
        await authApi.sendOtp(result.data.mobile),
      );
      showNotification(`OTP sent to +91 ${result.data.mobile.slice(-10)}`);
      void navigate(next === '/' ? '/verify-otp' : `/verify-otp?next=${encodeURIComponent(next)}`);
    } catch (error) {
      setLoginErrors({ mobile: errorMessage(error) });
      showNotification(errorMessage(error), 'error');
    } finally {
      setPending(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = signupSchema.safeParse({
      fullName,
      mobile: signupMobile,
      email: signupEmail,
      password: signupPassword,
    });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errors[key]) errors[key] = issue.message;
      }
      setSignupErrors(errors);
      showNotification('Please fix the errors', 'error');
      return;
    }

    setPending(true);
    setSignupErrors({});
    try {
      useAuthFlow.getState().setSignupDraft({
        fullName: result.data.fullName,
        email: result.data.email,
        password: result.data.password,
      });
      useAuthFlow.getState().startOtp(
        result.data.mobile,
        next,
        await authApi.sendOtp(result.data.mobile),
      );
      showNotification(`OTP sent to +91 ${result.data.mobile.slice(-10)}`);
      void navigate(next === '/' ? '/verify-otp' : `/verify-otp?next=${encodeURIComponent(next)}`);
    } catch (error) {
      setSignupErrors({ mobile: errorMessage(error) });
      showNotification(errorMessage(error), 'error');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Seo
        title={mode === 'login' ? 'Login' : 'Sign up'}
        description="Securely access your ZPROO BUS account."
      />

      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 top-5 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold shadow-2xl ${
            notificationType === 'success'
              ? 'border-[#b7dfc5] text-[#16813d]'
              : 'border-red-200 text-red-600'
          }`}
        >
          <span
            className={`grid h-6 w-6 place-items-center rounded-full text-xs text-white ${
              notificationType === 'success' ? 'bg-[#16813d]' : 'bg-red-500'
            }`}
          >
            {notificationType === 'success' ? '✓' : '!'}
          </span>
          {notification}
        </div>
      )}

      <main className="min-h-dvh bg-[#f6f3f3] px-3 py-3 font-sans text-slate-900 sm:px-6 sm:py-6">
        <section className="mx-auto grid min-h-[calc(100dvh-24px)] w-full max-w-[1180px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(31,26,27,0.14)] lg:grid-cols-[48%_52%] lg:min-h-[720px]">
          <div
            onMouseMove={handlePanelMouseMove}
            onMouseLeave={handlePanelMouseLeave}
            className="relative min-h-[430px] overflow-hidden bg-gradient-to-br from-[#b30d13] via-[#e31118] to-[#b30d13] p-7 text-white sm:p-10 lg:p-12"
          >
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
            <div
              className="pointer-events-none absolute inset-0 opacity-30 transition-transform duration-200"
              style={{ transform: `translate3d(${mousePosition.x}px, ${mousePosition.y}px, 0)` }}
            >
              <div className="absolute left-[8%] top-[16%] h-2 w-2 animate-pulse rounded-full bg-white" />
              <div className="absolute left-[78%] top-[30%] h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              <div className="absolute left-[62%] top-[72%] h-2 w-2 animate-pulse rounded-full bg-white" />
              <div className="absolute left-[24%] top-[78%] h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            </div>

            <svg
              className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
              viewBox="0 0 700 700"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M-20 420 C120 330 210 500 340 430 C470 360 550 410 730 270"
                fill="none"
                stroke="#ffffff"
                strokeDasharray="7 12"
                strokeLinecap="round"
                strokeWidth="3"
              />
              <path
                d="M-20 570 C120 500 210 620 360 550 C500 485 580 540 730 420"
                fill="none"
                stroke="#ffffff"
                strokeDasharray="5 14"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <circle r="7" fill="#ffffff">
                <animateMotion
                  dur="8s"
                  repeatCount="indefinite"
                  path="M-20 420 C120 330 210 500 340 430 C470 360 550 410 730 270"
                />
              </circle>
            </svg>

            <div className="relative z-10 flex h-full flex-col">
              <div className="w-fit rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
                <img
                  src="/assets/brand/zproo-login-logo.png"
                  alt="ZPROO"
                  className="h-8 w-auto object-contain sm:h-9"
                />
              </div>

              <div className="mt-auto max-w-[470px] pt-20">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-red-50 backdrop-blur">
                  <BusFront size={14} /> Intercity bus travel
                </div>
                <h1 className="text-[44px] font-bold leading-[52px] tracking-[-0.03em]">
                  Travel smarter.
                  <br />
                  <span className="text-white">Travel ZPROO.</span>
                </h1>
                <p className="mt-5 max-w-[430px] text-[15px] leading-6 text-white/90">
                  Book buses, manage your trips and enjoy a smoother journey with a simple, secure
                  ZPROO experience.
                </p>

                <div className="mt-7 grid gap-3 text-[15px] font-medium text-white/95 sm:grid-cols-3 lg:grid-cols-1">
                  {[
                    'Easy and secure booking',
                    'Comfortable intercity buses',
                    'Manage your trips easily',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <CheckCircle2 size={18} className="shrink-0 text-white" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 hidden items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur sm:flex lg:max-w-[390px]">
                <ShieldCheck className="text-white" size={22} />
                <div>
                  <p className="text-xs font-bold">Built for a smoother booking flow</p>
                  <p className="mt-0.5 text-[11px] text-white/65">
                    Your account keeps trips and booking details together.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-y-auto bg-white px-5 py-7 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
            <div className="mx-auto w-full max-w-[470px]">
              <div className="mb-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                {(['login', 'signup'] as Mode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => switchMode(item)}
                    className={`rounded-lg py-2.5 text-sm font-bold transition ${
                      mode === item
                        ? 'bg-white text-[#e31118] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {item === 'login' ? 'Login' : 'Sign up'}
                  </button>
                ))}
              </div>

              {mode === 'login' ? (
                <form onSubmit={loginMethod === 'email' ? handleEmailLogin : (event) => { event.preventDefault(); void handleSendLoginOtp(); }} noValidate className="space-y-5">
                  <div className="mb-6">
                    <h2 className="text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#1f1a1b]">
                      Welcome back!
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-500">
                      Login to continue your journey.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                    {(['email', 'mobile'] as LoginMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setLoginMethod(method);
                          setLoginErrors({});
                        }}
                        className={`rounded-lg py-2 text-xs font-bold transition ${
                          loginMethod === method
                            ? 'bg-white text-[#e31118] shadow-sm'
                            : 'text-slate-500'
                        }`}
                      >
                        {method === 'email' ? 'Email' : 'Mobile'}
                      </button>
                    ))}
                  </div>

                  {loginMethod === 'email' ? (
                    <>
                      <div>
                        <label htmlFor="login-email" className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                          Email
                        </label>
                        <div className="relative">
                          <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            id="login-email"
                            type="email"
                            value={loginEmail}
                            onChange={(event) => { setLoginEmail(event.target.value); clearLoginError('email'); }}
                            placeholder="Enter your email"
                            autoComplete="username"
                            aria-invalid={!!loginErrors.email}
                            className={`w-full rounded-xl border bg-white px-4 py-3 pl-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                              loginErrors.email
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : 'border-slate-200 focus:border-[#e31118] focus:ring-[#e31118]/10'
                            }`}
                          />
                        </div>
                        {loginErrors.email && <p className="mt-1.5 text-xs text-red-500">{loginErrors.email}</p>}
                      </div>

                      <div>
                        <label htmlFor="login-password" className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                          Password
                        </label>
                        <div className="relative">
                          <LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            id="login-password"
                            type={showLoginPassword ? 'text' : 'password'}
                            value={loginPassword}
                            onChange={(event) => { setLoginPassword(event.target.value); clearLoginError('password'); }}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            aria-invalid={!!loginErrors.password}
                            className={`w-full rounded-xl border bg-white px-4 py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                              loginErrors.password
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : 'border-slate-200 focus:border-[#e31118] focus:ring-[#e31118]/10'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword((value) => !value)}
                            aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#e31118]"
                          >
                            {showLoginPassword ? <Eye size={19} /> : <EyeOff size={19} />}
                          </button>
                        </div>
                        {loginErrors.password && <p className="mt-1.5 text-xs text-red-500">{loginErrors.password}</p>}
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate('/forgot-password')}
                          className="text-xs font-bold text-[#b30d13] hover:text-[#8f0a0f] hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label htmlFor="login-mobile" className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                          Mobile number
                        </label>
                        <div className="relative">
                          <Phone size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            id="login-mobile"
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            value={loginMobile}
                            onChange={(event) => {
                              setLoginMobile(event.target.value.replace(/\D/g, '').slice(0, 10));
                              clearLoginError('mobile');
                            }}
                            placeholder="10-digit mobile number"
                            autoComplete="tel-national"
                            aria-invalid={!!loginErrors.mobile}
                            className={`w-full rounded-xl border bg-white px-4 py-3 pl-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                              loginErrors.mobile
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : 'border-slate-200 focus:border-[#e31118] focus:ring-[#e31118]/10'
                            }`}
                          />
                        </div>
                        {loginErrors.mobile && <p className="mt-1.5 text-xs text-red-500">{loginErrors.mobile}</p>}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        We’ll send a secure 6-digit OTP to your mobile number.
                      </div>
                    </>
                  )}

                  <Button
                    type="submit"
                    disabled={pending}
                    className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e31118] text-sm font-extrabold text-white shadow-lg shadow-red-900/15 transition hover:-translate-y-0.5 hover:bg-[#b30d13]"
                  >
                    {pending ? 'Please wait…' : loginMethod === 'mobile' ? 'Send OTP' : 'Login'}
                    <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                  </Button>

                  <SocialSignIn next={next} />

                  <p className="pt-1 text-center text-sm text-slate-500">
                    Don't have an account?{' '}
                    <button type="button" onClick={() => switchMode('signup')} className="font-bold text-[#b30d13] hover:underline">
                      Create account
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleSignup} noValidate className="space-y-4">
                  <div className="mb-6">
                    <h2 className="text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#1f1a1b]">
                      Create your account
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-500">
                      Join ZPROO and start your journey.
                    </p>
                  </div>

                  <SignupField
                    id="signup-name"
                    label="Full name"
                    icon={<UserRound size={17} />}
                    value={fullName}
                    error={signupErrors.fullName}
                    placeholder="Enter your full name"
                    onChange={(value) => { setFullName(value); clearSignupError('fullName'); }}
                  />
                  <SignupField
                    id="signup-mobile"
                    label="Mobile number"
                    icon={<Phone size={17} />}
                    value={signupMobile}
                    error={signupErrors.mobile}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(value) => { setSignupMobile(value.replace(/\D/g, '').slice(0, 10)); clearSignupError('mobile'); }}
                  />
                  <SignupField
                    id="signup-email"
                    label="Email"
                    icon={<Mail size={17} />}
                    value={signupEmail}
                    error={signupErrors.email}
                    placeholder="Enter your email"
                    type="email"
                    onChange={(value) => { setSignupEmail(value); clearSignupError('email'); }}
                  />

                  <div>
                    <label htmlFor="signup-password" className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                      Password
                    </label>
                    <div className="relative">
                      <LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="signup-password"
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={(event) => { setSignupPassword(event.target.value); clearSignupError('password'); }}
                        placeholder="Create a strong password"
                        autoComplete="new-password"
                        aria-invalid={!!signupErrors.password}
                        className={`w-full rounded-xl border bg-white px-4 py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                          signupErrors.password
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                            : 'border-slate-200 focus:border-[#e31118] focus:ring-[#e31118]/10'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((value) => !value)}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#e31118]"
                      >
                        {showSignupPassword ? <Eye size={19} /> : <EyeOff size={19} />}
                      </button>
                    </div>
                    {signupErrors.password && <p className="mt-1.5 text-xs text-red-500">{signupErrors.password}</p>}
                    <p className="mt-1.5 text-xs text-slate-400">At least 8 characters with letters and numbers.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={pending}
                    className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e31118] text-sm font-extrabold text-white shadow-lg shadow-red-900/15 transition hover:-translate-y-0.5 hover:bg-[#b30d13] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? 'Sending OTP…' : 'Create Account'}
                    <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <SocialSignIn next={next} />

                  <p className="pt-2 text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <button type="button" onClick={() => switchMode('login')} className="font-bold text-[#b30d13] hover:underline">
                      Login
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function SignupField({
  id,
  label,
  icon,
  value,
  error,
  placeholder,
  onChange,
  type = 'text',
  inputMode,
  maxLength,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  error?: string;
  placeholder: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-600">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={`w-full rounded-xl border bg-white px-4 py-3 pl-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
              : 'border-slate-200 focus:border-[#e31118] focus:ring-[#e31118]/10'
          }`}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
