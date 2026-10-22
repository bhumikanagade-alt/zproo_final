import { Prisma } from '@prisma/client';
import { ErrorCode, type FieldIssue } from '@zproo/types';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { buildFailure } from '../utils/response';
import { zodIssues } from '../utils/zod';

interface Failure {
  status: number;
  errorCode: ErrorCode;
  message: string;
  details?: FieldIssue[] | undefined;
}

function isBodyParserError(err: unknown): err is { type: string; status: number } {
  return typeof err === 'object' && err !== null && 'type' in err && 'status' in err;
}

/** Maps any thrown value to a client-safe failure. Unknown errors never leak their message. */
export function toFailure(err: unknown): Failure {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      errorCode: err.errorCode,
      message: err.message,
      details: err.details,
    };
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      details: zodIssues(err),
    };
  }
  if (isBodyParserError(err)) {
    if (err.type === 'entity.parse.failed') {
      return { status: 400, errorCode: ErrorCode.BAD_REQUEST, message: 'Malformed JSON body' };
    }
    if (err.type === 'entity.too.large') {
      return {
        status: 413,
        errorCode: ErrorCode.PAYLOAD_TOO_LARGE,
        message: 'Request body is too large',
      };
    }
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002')
      return { status: 409, errorCode: ErrorCode.CONFLICT, message: 'Resource already exists' };
    if (err.code === 'P2025')
      return { status: 404, errorCode: ErrorCode.NOT_FOUND, message: 'Resource not found' };
    return {
      status: 500,
      errorCode: ErrorCode.DATABASE_ERROR,
      message: 'A database error occurred',
    };
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return { status: 503, errorCode: ErrorCode.DATABASE_ERROR, message: 'Database unavailable' };
  }
  return { status: 500, errorCode: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong' };
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const failure = toFailure(err);
  if (failure.status >= 500) req.log.error({ err }, 'Request failed');
  else req.log.debug({ errorCode: failure.errorCode }, failure.message);

  if (res.headersSent) return next(err);
  res.status(failure.status).json(
    buildFailure(failure.message, failure.errorCode, {
      details: failure.details,
      requestId: String(req.id),
    }),
  );
};
