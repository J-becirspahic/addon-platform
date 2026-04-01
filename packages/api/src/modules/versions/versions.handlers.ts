import type { FastifyRequest, FastifyReply } from 'fastify';
import { VersionsService } from './versions.service.js';
import {
  createVersionSchema,
  versionParamsSchema,
  versionIdParamsSchema,
} from './versions.schemas.js';
import { UnauthorizedError } from '../../lib/errors.js';

function getService(request: FastifyRequest) {
  return new VersionsService(request.server.prisma, request.server.github);
}

function requireUser(request: FastifyRequest): string {
  if (!request.user?.userId) {
    throw new UnauthorizedError('Not authenticated');
  }
  return request.user.userId;
}

export async function createVersionHandler(
  request: FastifyRequest<{ Params: unknown; Body: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId, addonId } = versionParamsSchema.parse(request.params);
  const input = createVersionSchema.parse(request.body);
  const service = getService(request);

  const version = await service.createVersion(orgId, addonId, userId, input);

  return reply.status(201).send({ version });
}

export async function listVersionsHandler(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId, addonId } = versionParamsSchema.parse(request.params);
  const service = getService(request);

  const versions = await service.listVersions(orgId, addonId, userId);

  return reply.send({ versions });
}

export async function getVersionHandler(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId, addonId, versionId } = versionIdParamsSchema.parse(request.params);
  const service = getService(request);

  const version = await service.getVersion(orgId, addonId, versionId, userId);

  return reply.send({ version });
}

export async function getPrStatusHandler(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId, addonId, versionId } = versionIdParamsSchema.parse(request.params);
  const service = getService(request);

  const status = await service.getPrStatus(orgId, addonId, versionId, userId);

  return reply.send({ prStatus: status });
}
