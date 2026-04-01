import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { sseBroker, type SSEBroker } from '../lib/sse.js';

declare module 'fastify' {
  interface FastifyInstance {
    sse: SSEBroker;
  }
}

async function ssePluginCallback(fastify: FastifyInstance) {
  fastify.decorate('sse', sseBroker);
}

export const ssePlugin = fp(ssePluginCallback, {
  name: 'sse',
});
