import type { FieldIssue } from '@zproo/types';
import type { ZodError } from 'zod';

export function zodIssues(error: ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}
