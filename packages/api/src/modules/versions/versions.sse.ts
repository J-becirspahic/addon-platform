import type { FastifyRequest, FastifyReply } from 'fastify';
import { versionIdParamsSchema } from './versions.schemas.js';
import { versionChannel, type SSEEvent } from '../../lib/sse.js';
import { UnauthorizedError } from '../../lib/errors.js';

export async function versionEventsHandler(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply
) {
  if (!request.user?.userId) {
    throw new UnauthorizedError('Not authenticated');
  }

  const { versionId } = versionIdParamsSchema.parse(request.params);

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  reply.raw.write('\n');

  const channel = versionChannel(versionId);

  const onEvent = (event: SSEEvent) => {
    reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
  };

  const unsubscribe = request.server.sse.subscribe(channel, onEvent);

  const heartbeat = setInterval(() => {
    reply.raw.write(': heartbeat\n\n');
  }, 30_000);

  request.raw.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });

  await reply;
}
