import { Router } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from './openapi';
// Each module's path docs register themselves with the shared registry on import.
import './paths/admin';
import './paths/auth';
import './paths/buses';
import './paths/flights';
import './paths/trains';

/** Serves `/api/docs` (Swagger UI) and `/api/docs/openapi.json`. */
export function docsRouter(version: string): Router {
  const document = buildOpenApiDocument(version);
  const router = Router();
  // Swagger UI needs its own scripts, styles and inline images; the rest of the API keeps `default-src 'none'`.
  router.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    }),
  );
  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });
  router.use('/', swaggerUi.serve, swaggerUi.setup(document, { customSiteTitle: 'ZPROO GO API' }));
  return router;
}
