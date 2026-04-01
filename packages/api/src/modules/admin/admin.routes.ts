import type { FastifyInstance } from 'fastify';
import { reconcileHandler, getReconciliationStatusHandler } from './admin.handlers.js';

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/reconcile', reconcileHandler);
  fastify.get('/reconcile/status', getReconciliationStatusHandler);
}
