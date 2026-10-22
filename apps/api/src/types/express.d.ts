import 'express-serve-static-core';
import type { AccessClaims } from '../services/token.service';

declare module 'express-serve-static-core' {
  interface Request {
    /** Input parsed by the `validate()` middleware. */
    validated?: { body?: unknown; query?: unknown; params?: unknown };
    /** Set by `authenticate()` from a verified access token. */
    auth?: AccessClaims;
  }
}
