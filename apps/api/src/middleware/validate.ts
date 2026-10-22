import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ValidationError } from '../utils/errors';
import { zodIssues } from '../utils/zod';

interface Schemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

/**
 * Validates and transforms request input. Parsed values are stored on `req.validated`
 * (Express 5 makes `req.query` read-only); controllers read them via `validated()`.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    const validated: NonNullable<typeof req.validated> = {};
    const issues = [];
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) validated[part] = result.data;
      else
        issues.push(
          ...zodIssues(result.error).map((i) => ({
            ...i,
            path: `${part}.${i.path}`.replace(/\.$/, ''),
          })),
        );
    }
    if (issues.length > 0) return next(new ValidationError(issues));
    req.validated = validated;
    next();
  };
}

/** Typed accessor for input validated by `validate()`. */
export function validated<T>(
  req: { validated?: Record<string, unknown> | undefined },
  part: 'body' | 'query' | 'params',
): T {
  return req.validated?.[part] as T;
}
