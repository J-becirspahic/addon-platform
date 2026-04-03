import type { FastifyInstance } from 'fastify';
import {
  buildCallbackHandler,
  getBuildReportHandler,
  listBuildsHandler,
} from './builds.handlers.js';

export async function internalBuildRoutes(fastify: FastifyInstance) {
  // No auth hook — uses X-Build-Secret header
  fastify.post('/build-callback', {
    config: { rateLimit: false },
    handler: buildCallbackHandler,
  });
}

export async function buildReportRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get(
    '/:orgId/addons/:addonSlug/versions/:versionId/build',
    getBuildReportHandler
  );
}

export async function adminBuildsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/builds', listBuildsHandler);
}
