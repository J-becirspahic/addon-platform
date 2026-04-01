import crypto from 'crypto';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getConfig } from '../lib/config.js';

const buildRequestSchema = z.object({
  versionId: z.string().min(1),
  addonId: z.string().min(1),
  addonType: z.string().default('WIDGET'),
  repoFullName: z.string().min(1),
  version: z.string().min(1),
  commitSha: z.string().optional(),
});

function authenticateRequest(request: FastifyRequest, reply: FastifyReply): boolean {
  const config = getConfig();
  const secret = request.headers['x-build-secret'] as string | undefined;

  if (!secret || secret !== config.BUILD_CALLBACK_SECRET) {
    reply.status(401).send({ error: 'Unauthorized' });
    return false;
  }

  return true;
}

export default async function buildRoutes(fastify: FastifyInstance) {
  fastify.post('/api/builds', async (request, reply) => {
    if (!authenticateRequest(request, reply)) return;

    const parsed = buildRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid build request',
        details: parsed.error.issues,
      });
    }

    const config = getConfig();
    const buildId = crypto.randomUUID();

    const job = {
      buildId,
      versionId: parsed.data.versionId,
      addonId: parsed.data.addonId,
      addonType: parsed.data.addonType,
      repoFullName: parsed.data.repoFullName,
      version: parsed.data.version,
      callbackUrl: config.BUILD_CALLBACK_URL,
      commitSha: parsed.data.commitSha,
    };

    const { position } = fastify.buildQueue.enqueue(job);

    return reply.status(202).send({ buildId, position });
  });

  fastify.get('/api/builds/status', async (request, reply) => {
    if (!authenticateRequest(request, reply)) return;

    const status = fastify.buildQueue.getStatus();
    return reply.send(status);
  });
}
