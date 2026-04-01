import type { FastifyInstance } from 'fastify';
import {
  createVersionHandler,
  listVersionsHandler,
  getVersionHandler,
  getPrStatusHandler,
} from './versions.handlers.js';
import { versionEventsHandler } from './versions.sse.js';

export default async function versionsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/:orgId/addons/:addonId/versions', createVersionHandler);

  fastify.get('/:orgId/addons/:addonId/versions', listVersionsHandler);

  fastify.get('/:orgId/addons/:addonId/versions/:versionId', getVersionHandler);

  fastify.get('/:orgId/addons/:addonId/versions/:versionId/pr-status', getPrStatusHandler);

  fastify.get('/:orgId/addons/:addonId/versions/:versionId/events', versionEventsHandler);
}
