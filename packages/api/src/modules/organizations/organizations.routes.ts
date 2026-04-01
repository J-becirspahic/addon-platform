import type { FastifyInstance } from 'fastify';
import {
  createOrganizationHandler,
  listOrganizationsHandler,
  getOrganizationHandler,
  updateOrganizationHandler,
  listMembersHandler,
  inviteMemberHandler,
  updateMemberRoleHandler,
  removeMemberHandler,
} from './organizations.handlers.js';

export default async function organizationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/', createOrganizationHandler);

  fastify.get('/', listOrganizationsHandler);

  fastify.get('/:orgId', getOrganizationHandler);

  fastify.patch('/:orgId', updateOrganizationHandler);

  fastify.get('/:orgId/members', listMembersHandler);

  fastify.post('/:orgId/members', inviteMemberHandler);

  fastify.patch('/:orgId/members/:memberId', updateMemberRoleHandler);

  fastify.delete('/:orgId/members/:memberId', removeMemberHandler);
}
