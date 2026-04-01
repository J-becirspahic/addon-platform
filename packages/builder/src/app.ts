import Fastify, { type FastifyInstance } from 'fastify';
import { getConfig } from './lib/config.js';
import { BuildQueue } from './lib/queue.js';
import { DockerManager } from './lib/docker.js';
import { StorageClient } from './lib/storage.js';
import { BuildService } from './services/build.service.js';
import buildRoutes from './routes/builds.js';

declare module 'fastify' {
  interface FastifyInstance {
    buildQueue: BuildQueue;
  }
}

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

  // Initialize storage
  const storage = new StorageClient({
    endpoint: config.S3_ENDPOINT,
    accessKey: config.S3_ACCESS_KEY,
    secretKey: config.S3_SECRET_KEY,
    bucket: config.S3_BUCKET,
    region: config.S3_REGION,
  });

  try {
    await storage.ensureBucket();
    app.log.info('S3 bucket verified');
  } catch (error) {
    app.log.warn({ error }, 'Could not verify S3 bucket — will retry on first upload');
  }

  // Initialize Docker
  const docker = new DockerManager(config.DOCKER_SOCKET);
  const dockerOk = await docker.ping();
  if (dockerOk) {
    app.log.info('Docker connection verified');
  } else {
    app.log.warn('Docker not available — builds will fail');
  }

  // Initialize build queue
  const buildService = new BuildService(docker, storage);
  const buildQueue = new BuildQueue(config.MAX_CONCURRENT_BUILDS);
  buildQueue.setProcessor((job) => buildService.executeBuild(job));

  app.decorate('buildQueue', buildQueue);

  // Health check
  app.get('/health', async () => {
    const status = buildQueue.getStatus();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      docker: await docker.ping(),
      queue: {
        active: status.active,
        queued: status.queued,
      },
    };
  });

  // Routes
  await app.register(buildRoutes);

  return app;
}
