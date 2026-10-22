import type { Env } from '../../config/env';
import { MockPaymentProvider } from './MockPaymentProvider';
import type { PaymentProvider } from './PaymentProvider';

export { MockPaymentProvider } from './MockPaymentProvider';
export type {
  CreateOrderInput,
  PaymentProvider,
  RefundInput,
  RefundResult,
  VerifyPaymentInput,
} from './PaymentProvider';

export function createPaymentProvider(
  env: Pick<Env, 'PAYMENT_PROVIDER' | 'JWT_SECRET'>,
): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    case 'mock':
      return new MockPaymentProvider(env.JWT_SECRET);
  }
}
