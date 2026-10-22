import { changePasswordRequestSchema, updateProfileSchema } from '@zproo/validation';
import { Router, type RequestHandler } from 'express';
import type { createMeController } from '../controllers/me.controller';
import { validate } from '../middleware/validate';

export function meRoutes(
  controller: ReturnType<typeof createMeController>,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/', controller.get);
  router.patch('/', validate({ body: updateProfileSchema }), controller.update);
  router.post('/password', validate({ body: changePasswordRequestSchema }), controller.changePassword);
  return router;
}
