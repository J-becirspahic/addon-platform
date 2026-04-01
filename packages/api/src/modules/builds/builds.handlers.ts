import type { FastifyRequest, FastifyReply } from 'fastify';
import { getConfig } from '../../lib/config.js';
import { BuildsService } from './builds.service.js';
import {
  buildCallbackSchema,
  buildReportParamsSchema,
  listBuildsQuerySchema,
} from './builds.schemas.js';
import { sseBroker } from '../../lib/sse.js';
import { ForbiddenError } from '../../lib/errors.js';

function getService(request: FastifyRequest): BuildsService {
  return new BuildsService(request.server.prisma, sseBroker);
}

export async function buildCallbackHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const config = getConfig();
  const secret = request.headers['x-build-secret'] as string | undefined;

  if (!config.BUILD_CALLBACK_SECRET || !secret || secret !== config.BUILD_CALLBACK_SECRET) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }

  const parsed = buildCallbackSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Invalid callback payload',
      details: parsed.error.issues,
    });
    return;
  }

  const service = getService(request);
  await service.handleBuildCallback(parsed.data);

  reply.status(200).send({ received: true });
}

export async function getBuildReportHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parsed = buildReportParamsSchema.safeParse(request.params);
  if (!parsed.success) {
    reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Invalid parameters',
    });
    return;
  }

  const userId = request.user!.userId;
  const service = getService(request);
  const result = await service.getBuildReport(
    parsed.data.orgId,
    parsed.data.addonId,
    parsed.data.versionId,
    userId
  );

  reply.send(result);
}

export async function listBuildsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Check admin status
  const user = await request.server.prisma.user.findUnique({
    where: { id: request.user!.userId },
  });

  if (!user?.isAdmin) {
    throw new ForbiddenError('Admin access required');
  }

  const parsed = listBuildsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Invalid query parameters',
    });
    return;
  }

  const service = getService(request);
  const result = await service.listBuilds(parsed.data);

  reply.send(result);
}
