import type { FastifyRequest, FastifyReply } from 'fastify';
import { AddonsService } from './addons.service.js';
import {
  createAddonSchema,
  updateAddonSchema,
  orgIdParamSchema,
  addonSlugParamSchema,
} from './addons.schemas.js';
import { UnauthorizedError } from '../../lib/errors.js';

function getService(request: FastifyRequest) {
  return new AddonsService(request.server.prisma, request.server.github);
}

function requireUser(request: FastifyRequest): string {
  if (!request.user?.userId) {
    throw new UnauthorizedError('Not authenticated');
  }
  return request.user.userId;
}

export async function createAddonHandler(
  request: FastifyRequest<{ Params: unknown; Body: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId } = orgIdParamSchema.parse(request.params);
  const input = createAddonSchema.parse(request.body);
  const service = getService(request);

  const addon = await service.createAddon(orgId, userId, input);

  return reply.status(201).send({ addon });
}

export async function listAddonsHandler(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId } = orgIdParamSchema.parse(request.params);
  const service = getService(request);

  const addons = await service.listAddons(orgId, userId);

  return reply.send({ addons });
}

export async function getAddonHandler(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId, addonSlug } = addonSlugParamSchema.parse(request.params);
  const service = getService(request);

  const addon = await service.getAddon(orgId, addonSlug, userId);

  return reply.send({ addon });
}

export async function updateAddonHandler(
  request: FastifyRequest<{ Params: unknown; Body: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId, addonSlug } = addonSlugParamSchema.parse(request.params);
  const input = updateAddonSchema.parse(request.body);
  const service = getService(request);

  const addon = await service.updateAddon(orgId, addonSlug, userId, input);

  return reply.send({ addon });
}

export async function deleteAddonHandler(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { orgId, addonSlug } = addonSlugParamSchema.parse(request.params);
  const service = getService(request);

  await service.deleteAddon(orgId, addonSlug, userId);

  return reply.status(204).send();
}
