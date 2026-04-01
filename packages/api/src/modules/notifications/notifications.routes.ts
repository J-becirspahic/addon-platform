import type { FastifyInstance } from 'fastify';
import {
  listNotificationsHandler,
  markReadHandler,
  markAllReadHandler,
} from './notifications.handlers.js';

export default async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', listNotificationsHandler);

  fastify.patch('/:notificationId/read', markReadHandler);

  fastify.post('/read-all', markAllReadHandler);
}
