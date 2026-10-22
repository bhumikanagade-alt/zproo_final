import { create } from 'zustand';

interface SignupDraft {
  fullName: string;
  email?: string;
  password?: string;
}

interface FlowState {
  otp: { phone: string; next: string; resendAt: number; devCode?: string | undefined } | null;
  signup: { phone: string; signupToken: string; next: string } | null;
  signupDraft: SignupDraft | null;
  reset: { identifier: string; resendAt: number; devCode?: string | undefined } | null;
  startOtp: (
    phone: string,
    next: string,
    sent: { resendIn: number; devCode?: string | undefined },
  ) => void;
  startSignup: (phone: string, signupToken: string, next: string) => void;
  setSignupDraft: (draft: SignupDraft) => void;
  startReset: (
    identifier: string,
    sent: { resendIn: number; devCode?: string | undefined },
  ) => void;
  clear: () => void;
}

export const useAuthFlow = create<FlowState>()((set) => ({
  otp: null,
  signup: null,
  signupDraft: null,
  reset: null,
  startOtp: (phone, next, sent) =>
    set({
      otp: { phone, next, resendAt: Date.now() + sent.resendIn * 1000, devCode: sent.devCode },
      signup: null,
      reset: null,
    }),
  startSignup: (phone, signupToken, next) => set({ signup: { phone, signupToken, next } }),
  setSignupDraft: (signupDraft) => set({ signupDraft }),
  startReset: (identifier, sent) =>
    set({
      reset: { identifier, resendAt: Date.now() + sent.resendIn * 1000, devCode: sent.devCode },
      otp: null,
      signup: null,
      signupDraft: null,
    }),
  clear: () => set({ otp: null, signup: null, signupDraft: null, reset: null }),
}));
