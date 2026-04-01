import type { FastifyRequest, FastifyReply } from 'fastify';
import { OrganizationsService } from './organizations.service.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  orgIdParamSchema,
  memberIdParamSchema,
} from './organizations.schemas.js';
import { UnauthorizedError } from '../../lib/errors.js';

function getService(request: FastifyRequest) {
  return new OrganizationsService(request.server.prisma, request.server.github);
}

function requireUser(request: FastifyRequest): string {
  if (!request.user?.userId) {
    throw new UnauthorizedError('Not authenticated');
  }
  return request.user.userId;
}

export async function createOrganizationHandler(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const input = createOrganizationSchema.parse(request.body);
  const service = getService(request);

  const organization = await service.createOrganization(userId, input);

  return reply.status(201).send({ organization });
}

export async function listOrganizationsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const service = getService(request);

  const organizations = await service.getUserOrganizations(userId);

  return reply.send({ organizations });
}

export async function getOrganizationHandler(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId } = orgIdParamSchema.parse(request.params);
  const service = getService(request);

  const organization = await service.getOrganization(orgId, userId);

  return reply.send({ organization });
}

export async function updateOrganizationHandler(
  request: FastifyRequest<{ Params: unknown; Body: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId } = orgIdParamSchema.parse(request.params);
  const input = updateOrganizationSchema.parse(request.body);
  const service = getService(request);

  const organization = await service.updateOrganization(orgId, userId, input);

  return reply.send({ organization });
}

export async function listMembersHandler(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId } = orgIdParamSchema.parse(request.params);
  const service = getService(request);

  const members = await service.getMembers(orgId, userId);

  return reply.send({ members });
}

export async function inviteMemberHandler(
  request: FastifyRequest<{ Params: unknown; Body: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId } = orgIdParamSchema.parse(request.params);
  const input = inviteMemberSchema.parse(request.body);
  const service = getService(request);

  const member = await service.inviteMember(orgId, userId, input);

  return reply.status(201).send({ member });
}

export async function updateMemberRoleHandler(
  request: FastifyRequest<{ Params: unknown; Body: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId, memberId } = memberIdParamSchema.parse(request.params);
  const { role } = updateMemberRoleSchema.parse(request.body);
  const service = getService(request);

  const member = await service.updateMemberRole(orgId, memberId, userId, role);

  return reply.send({ member });
}

export async function removeMemberHandler(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId, memberId } = memberIdParamSchema.parse(request.params);
  const service = getService(request);

  await service.removeMember(orgId, memberId, userId);

  return reply.status(204).send();
}
