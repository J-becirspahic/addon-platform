import type { FastifyRequest, FastifyReply } from 'fastify';
import { WebhooksService, type WebhookPayload } from './webhooks.service.js';
import { UnauthorizedError } from '../../lib/errors.js';
import { webhookDedup } from '../../lib/webhook-dedup.js';

export async function githubWebhookHandler(
  request: FastifyRequest<{
    Body: WebhookPayload;
    Headers: {
      'x-github-event'?: string;
      'x-hub-signature-256'?: string;
      'x-github-delivery'?: string;
    };
  }>,
  reply: FastifyReply
) {
  const service = new WebhooksService(
    request.server.prisma,
    request.server.github,
    request.server.sse,
    request.log
  );

  const event = request.headers['x-github-event'];
  const signature = request.headers['x-hub-signature-256'];
  const deliveryId = request.headers['x-github-delivery'];

  if (!event) {
    return reply.status(400).send({
      error: 'BAD_REQUEST',
      message: 'Missing X-GitHub-Event header',
    });
  }

  // Replay protection: reject duplicate deliveries
  if (deliveryId && webhookDedup.isDuplicate(deliveryId)) {
    request.log.info({ deliveryId, event }, 'Duplicate webhook delivery, skipping');
    return reply.send({ received: true, duplicate: true });
  }

  const rawBody = JSON.stringify(request.body);
  const isValid = service.verifySignature(rawBody, signature);

  if (!isValid) {
    request.log.warn({ deliveryId, event }, 'Invalid webhook signature');
    throw new UnauthorizedError('Invalid webhook signature');
  }

  request.log.info({ deliveryId, event }, 'Processing webhook');

  const result = await service.handleWebhook(event, request.body);

  await service.logWebhookEvent(event, request.body, result.processed);

  return reply.send({
    received: true,
    ...result,
  });
}
