import { ErrorCode, type FieldIssue } from '@zproo/types';
import { formatMoney } from '@zproo/utils';

/** Base class for errors whose message is safe to show to API clients. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly errorCode: ErrorCode,
    readonly details?: FieldIssue[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, ErrorCode.BAD_REQUEST);
  }
}

export class ValidationError extends AppError {
  constructor(details: FieldIssue[], message = 'Validation failed') {
    super(message, 400, ErrorCode.VALIDATION_ERROR, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, ErrorCode.UNAUTHENTICATED);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Incorrect mobile number, email or password') {
    super(message, 401, ErrorCode.INVALID_CREDENTIALS);
  }
}

export class InvalidOtpError extends AppError {
  constructor(message = 'Incorrect code. Please try again.') {
    super(message, 400, ErrorCode.INVALID_OTP);
  }
}

export class OtpExpiredError extends AppError {
  constructor(message = 'This code has expired. Request a new one.') {
    super(message, 400, ErrorCode.OTP_EXPIRED);
  }
}

export class AccountDisabledError extends AppError {
  constructor(message = 'This account is disabled. Please contact support.') {
    super(message, 403, ErrorCode.ACCOUNT_DISABLED);
  }
}

export class ProviderNotConfiguredError extends AppError {
  constructor(message = 'This sign-in method is not available') {
    super(message, 400, ErrorCode.PROVIDER_NOT_CONFIGURED);
  }
}

export class SeatUnavailableError extends AppError {
  constructor(
    message = 'Some of the seats you chose were just booked by someone else. Please pick other seats.',
  ) {
    super(message, 409, ErrorCode.SEAT_UNAVAILABLE);
  }
}

export class SoldOutError extends AppError {
  constructor(message = 'Sorry, these seats just sold out. Please choose another flight.') {
    super(message, 409, ErrorCode.SOLD_OUT);
  }
}

export class OfferExpiredError extends AppError {
  constructor(message = 'This fare is no longer available. Please search again.') {
    super(message, 409, ErrorCode.OFFER_EXPIRED);
  }
}

export class PriceChangedError extends AppError {
  constructor(readonly newTotalPaise: number) {
    super(
      'The fare has changed since you selected it. Please review the new price.',
      409,
      ErrorCode.PRICE_CHANGED,
      [
        {
          path: 'body.expectedTotalPaise',
          message: `The new total is ${formatMoney(newTotalPaise)}`,
        },
      ],
    );
  }
}

export class BookingExpiredError extends AppError {
  constructor(message = 'Your seat hold has expired. Please search again.') {
    super(message, 409, ErrorCode.BOOKING_EXPIRED);
  }
}

export class InvalidStateError extends AppError {
  constructor(message: string) {
    super(message, 409, ErrorCode.INVALID_STATE);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, ErrorCode.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, ErrorCode.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, ErrorCode.CONFLICT);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429, ErrorCode.RATE_LIMITED);
  }
}

export class PaymentError extends AppError {
  constructor(message = 'Payment could not be processed') {
    super(message, 402, ErrorCode.PAYMENT_ERROR);
  }
}

export class ProviderError extends AppError {
  constructor(
    message = 'An upstream provider is unavailable',
    readonly provider?: string,
  ) {
    super(message, 502, ErrorCode.PROVIDER_ERROR);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, ErrorCode.SERVICE_UNAVAILABLE);
  }
}
