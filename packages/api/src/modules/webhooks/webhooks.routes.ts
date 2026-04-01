import type { FastifyInstance } from 'fastify';
import { githubWebhookHandler } from './webhooks.handlers.js';

export default async function webhooksRoutes(fastify: FastifyInstance) {
  fastify.post('/github', {
    config: {
      rawBody: true,
      rateLimit: false,
    },
    handler: githubWebhookHandler,
  });
}
