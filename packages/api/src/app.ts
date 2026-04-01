import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { errorHandler } from './lib/errors.js';
import { getConfig } from './lib/config.js';
import { dbPlugin } from './plugins/db.js';
import { authPlugin } from './plugins/auth.js';
import { githubAppPlugin } from './plugins/github-app.js';
import { ssePlugin } from './plugins/sse.js';
import authRoutes from './modules/auth/auth.routes.js';
import organizationsRoutes from './modules/organizations/organizations.routes.js';
import addonsRoutes from './modules/addons/addons.routes.js';
import webhooksRoutes from './modules/webhooks/webhooks.routes.js';
import versionsRoutes from './modules/versions/versions.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import { internalBuildRoutes, buildReportRoutes, adminBuildsRoutes } from './modules/builds/builds.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import { startScheduler } from './jobs/scheduler.js';

export async function buildApp(): Promise<FastifyInstance> {
  const config = getConfig();

  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        config.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  app.setErrorHandler(errorHandler);

  // Security headers
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true },
    frameguard: { action: 'deny' },
    noSniff: true,
  });

  // Rate limiting: 100 req/min per IP globally
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
  });

  // CORS
  const corsOrigin = config.NODE_ENV === 'development'
    ? [config.FRONTEND_URL, 'http://localhost:3000']
    : config.FRONTEND_URL;

  await app.register(fastifyCors, {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(fastifyCookie, {
    secret: config.JWT_ACCESS_SECRET,
    hook: 'onRequest',
  });

  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(githubAppPlugin);
  await app.register(ssePlugin);

  // Health checks
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  app.get('/health/ready', async (_request, reply) => {
    const checks: Record<string, string> = {};

    // Database check
    try {
      await app.prisma.$queryRawUnsafe('SELECT 1');
      checks.db = 'ok';
    } catch {
      checks.db = 'fail';
    }

    // GitHub check
    checks.github = app.github.isConfigured ? 'ok' : 'unconfigured';

    // Builder/S3 check (optional, non-blocking)
    if (config.BUILDER_URL) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${config.BUILDER_URL}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        checks.builder = res.ok ? 'ok' : 'fail';
      } catch {
        checks.builder = 'unavailable';
      }
    }

    const allOk = Object.values(checks).every((v) => v === 'ok' || v === 'unconfigured' || v === 'unavailable');
    const status = allOk ? 'ok' : 'degraded';
    const statusCode = allOk ? 200 : 503;

    return reply.status(statusCode).send({
      status,
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(organizationsRoutes, { prefix: '/api/organizations' });
  await app.register(addonsRoutes, { prefix: '/api/organizations' });
  await app.register(versionsRoutes, { prefix: '/api/organizations' });
  await app.register(webhooksRoutes, { prefix: '/api/webhooks' });
  await app.register(notificationsRoutes, { prefix: '/api/notifications' });
  await app.register(internalBuildRoutes, { prefix: '/api/internal' });
  await app.register(buildReportRoutes, { prefix: '/api/organizations' });
  await app.register(adminBuildsRoutes, { prefix: '/api/admin' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  // Start scheduler on app ready, stop on close
  let stopScheduler: (() => void) | null = null;
  app.addHook('onReady', async () => {
    stopScheduler = startScheduler(app);
  });
  app.addHook('onClose', async () => {
    stopScheduler?.();
  });

  return app;
}
