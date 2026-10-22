import type { RequestHandler } from 'express';
import { requireAuth } from '../middleware/auth';
import { validated } from '../middleware/validate';
import type { PaymentService } from '../services/payment.service';
import { sendSuccess } from '../utils/response';
import { requestContext } from './auth.controller';

export function createPaymentsController(payments: PaymentService) {
  const create: RequestHandler = async (req, res) => {
    const { bookingReference } = validated<{ bookingReference: string }>(req, 'body');
    sendSuccess(
      res,
      await payments.createOrder(requireAuth(req).userId, bookingReference, requestContext(req)),
      'Payment order created',
      201,
    );
  };

  const verify: RequestHandler = async (req, res) => {
    const body = validated<{
      paymentId: string;
      providerPaymentId: string;
      signature: string;
      method?: string;
    }>(req, 'body');
    sendSuccess(
      res,
      await payments.verify(requireAuth(req).userId, body, requestContext(req)),
      'Payment successful. Your booking is confirmed.',
    );
  };

  const fail: RequestHandler = async (req, res) => {
    const { paymentId } = validated<{ paymentId: string }>(req, 'params');
    const { reason } = validated<{ reason: string }>(req, 'body');
    await payments.markFailed(requireAuth(req).userId, paymentId, reason, requestContext(req));
    sendSuccess(res, null, 'Payment marked as failed. You can try again.');
  };

  const mockComplete: RequestHandler = async (req, res) => {
    const { paymentId, outcome } = validated<{ paymentId: string; outcome: 'success' | 'failure' }>(
      req,
      'body',
    );
    const result = await payments.simulateMockPayment(
      requireAuth(req).userId,
      paymentId,
      outcome,
      requestContext(req),
    );
    sendSuccess(
      res,
      result,
      outcome === 'success' ? 'Payment successful. Your booking is confirmed.' : 'Payment failed',
    );
  };

  return { create, verify, fail, mockComplete };
}
