import type { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationsService } from './notifications.service.js';
import {
  notificationQuerySchema,
  notificationIdParamSchema,
} from './notifications.schemas.js';
import { UnauthorizedError } from '../../lib/errors.js';

function getService(request: FastifyRequest) {
  return new NotificationsService(request.server.prisma);
}

function requireUser(request: FastifyRequest): string {
  if (!request.user?.userId) {
    throw new UnauthorizedError('Not authenticated');
  }
  return request.user.userId;
}

export async function listNotificationsHandler(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const query = notificationQuerySchema.parse(request.query);
  const service = getService(request);

  const result = await service.listNotifications(userId, query);

  return reply.send(result);
}

export async function markReadHandler(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const { notificationId } = notificationIdParamSchema.parse(request.params);
  const service = getService(request);

  const notification = await service.markRead(userId, notificationId);

  return reply.send({ notification });
}

export async function markAllReadHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = requireUser(request);
  const service = getService(request);

  await service.markAllRead(userId);

  return reply.send({ success: true });
}
