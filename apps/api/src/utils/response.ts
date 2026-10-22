import type { ApiFailure, ApiSuccess, ErrorCode, FieldIssue } from '@zproo/types';
import type { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message = 'Success', status = 200) {
  const body: ApiSuccess<T> = { success: true, message, data };
  return res.status(status).json(body);
}

export function buildFailure(
  message: string,
  errorCode: ErrorCode,
  extras: { details?: FieldIssue[] | undefined; requestId?: string | undefined } = {},
): ApiFailure {
  return {
    success: false,
    message,
    errorCode,
    data: null,
    ...(extras.details && { details: extras.details }),
    ...(extras.requestId && { requestId: extras.requestId }),
  };
}
