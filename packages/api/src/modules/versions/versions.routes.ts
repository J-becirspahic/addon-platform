import type { FastifyInstance } from 'fastify';
import {
  createVersionHandler,
  listVersionsHandler,
  getVersionHandler,
  getPrStatusHandler,
  submitVersionHandler,
} from './versions.handlers.js';
import { versionEventsHandler } from './versions.sse.js';

export default async function versionsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/:orgId/addons/:addonSlug/versions', createVersionHandler);

  fastify.get('/:orgId/addons/:addonSlug/versions', listVersionsHandler);

  fastify.get('/:orgId/addons/:addonSlug/versions/:versionId', getVersionHandler);

  fastify.get('/:orgId/addons/:addonSlug/versions/:versionId/pr-status', getPrStatusHandler);

  fastify.post('/:orgId/addons/:addonSlug/versions/:versionId/submit', submitVersionHandler);

  fastify.get('/:orgId/addons/:addonSlug/versions/:versionId/events', versionEventsHandler);
}
