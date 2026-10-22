export interface CreateOrderInput {
  amountPaise: number;
  currency: 'INR';
  /** Our reference, shown in the provider's dashboard (the booking reference). */
  receipt: string;
}

export interface RefundInput {
  /** Gateway order and payment ids of the captured payment. */
  orderId: string;
  paymentId: string;
  amountPaise: number;
  /** Our refund id; gateways that support it use this to de-duplicate retried refund calls. */
  idempotencyKey: string;
  /** Short note shown in the gateway dashboard. */
  note: string;
}

export interface RefundResult {
  refundId: string;
  /** PROCESSED: money is on its way back; PENDING: the gateway will settle it later. */
  status: 'PROCESSED' | 'PENDING';
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

/**
 * A payment gateway. Razorpay arrives in Phase 14; any gateway with orders + signed payment
 * confirmation fits. The server never trusts the browser's word that a payment succeeded — it
 * verifies the gateway's signature.
 */
export interface PaymentProvider {
  readonly name: string;
  readonly isDemo: boolean;
  /** Public key for the browser checkout, if the gateway uses one. Never a secret. */
  readonly publicKey: string | null;
  createOrder(input: CreateOrderInput): Promise<{ orderId: string }>;
  verifyPayment(input: VerifyPaymentInput): boolean;
  /** Refunds part or all of a captured payment. Throws if the gateway refuses. */
  refund(input: RefundInput): Promise<RefundResult>;
  /**
   * Closes an unpaid order at the gateway so it can no longer be paid (used when a booking is
   * cancelled). Gateways with no such call can leave this out.
   */
  cancelOrder?(orderId: string): Promise<void>;
}
