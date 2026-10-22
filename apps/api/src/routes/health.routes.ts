import { Router } from 'express';
import { createHealthController } from '../controllers/health.controller';
import type { HealthService } from '../services/health.service';

export function healthRoutes(health: HealthService): Router {
  const controller = createHealthController(health);
  const router = Router();
  router.get('/', controller.report);
  router.get('/ready', controller.ready);
  router.get('/live', controller.live);
  return router;
}
