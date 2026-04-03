import type { FastifyInstance } from 'fastify';
import {
  createAddonHandler,
  listAddonsHandler,
  getAddonHandler,
  updateAddonHandler,
  deleteAddonHandler,
} from './addons.handlers.js';

export default async function addonsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/:orgId/addons', createAddonHandler);

  fastify.get('/:orgId/addons', listAddonsHandler);

  fastify.get('/:orgId/addons/:addonSlug', getAddonHandler);

  fastify.patch('/:orgId/addons/:addonSlug', updateAddonHandler);

  fastify.delete('/:orgId/addons/:addonSlug', deleteAddonHandler);
}
