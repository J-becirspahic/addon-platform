import type { FastifyInstance } from 'fastify';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
  githubRedirectHandler,
  githubCallbackHandler,
  githubUnlinkHandler,
} from './auth.handlers.js';

export default async function authRoutes(fastify: FastifyInstance) {
  const authRateLimit = {
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
  };

  fastify.post('/register', { ...authRateLimit, handler: registerHandler });

  fastify.post('/login', { ...authRateLimit, handler: loginHandler });

  fastify.post('/refresh', refreshHandler);

  fastify.post('/logout', logoutHandler);

  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    handler: meHandler,
  });

  fastify.get('/github', {
    preHandler: [fastify.optionalAuth],
    handler: githubRedirectHandler,
  });

  fastify.get('/github/callback', githubCallbackHandler);

  fastify.delete('/github', {
    preHandler: [fastify.authenticate],
    handler: githubUnlinkHandler,
  });
}
