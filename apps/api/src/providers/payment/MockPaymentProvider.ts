import { hmacSha256, randomToken, safeEqualHex } from '../../utils/crypto';
import type {
  CreateOrderInput,
  PaymentProvider,
  RefundInput,
  RefundResult,
  VerifyPaymentInput,
} from './PaymentProvider';

/**
 * Development gateway. Signs payments like Razorpay (HMAC-SHA256 of "orderId|paymentId"), so the
 * verification path is the same one real payments take. Refused in production by env validation.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  readonly isDemo = true;
  readonly publicKey = null;
  private readonly secret: string;

  constructor(serverSecret: string) {
    this.secret = hmacSha256(serverSecret, 'zproo-go:mock-payments:v1');
  }

  async createOrder(_input: CreateOrderInput): Promise<{ orderId: string }> {
    return { orderId: `mockorder_${randomToken(12)}` };
  }

  verifyPayment({ orderId, paymentId, signature }: VerifyPaymentInput): boolean {
    return (
      /^[0-9a-f]{64}$/.test(signature) && safeEqualHex(signature, this.sign(orderId, paymentId))
    );
  }

  /** Simulated refund: always accepted. Repeating an idempotency key returns the same refund. */
  async refund(input: RefundInput): Promise<RefundResult> {
    const existing = this.refunds.get(input.idempotencyKey);
    if (existing) return existing;
    const result: RefundResult = { refundId: `mockrfnd_${randomToken(12)}`, status: 'PROCESSED' };
    this.refunds.set(input.idempotencyKey, result);
    return result;
  }

  private readonly refunds = new Map<string, RefundResult>();

  /** Mock orders live only in our database; there is nothing to close at a gateway. */
  async cancelOrder(_orderId: string): Promise<void> {}

  /** What the gateway would send back after a successful payment. Development only. */
  simulateSuccess(orderId: string): { paymentId: string; signature: string } {
    const paymentId = `mockpay_${randomToken(12)}`;
    return { paymentId, signature: this.sign(orderId, paymentId) };
  }

  private sign(orderId: string, paymentId: string): string {
    return hmacSha256(this.secret, `${orderId}|${paymentId}`);
  }
}
