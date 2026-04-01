import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../lib/errors.js';
import type { NotificationQuery } from './notifications.schemas.js';

export class NotificationsService {
  constructor(private prisma: PrismaClient) {}

  async listNotifications(userId: string, query: NotificationQuery) {
    const where: Record<string, unknown> = { userId };

    if (query.unread) {
      where.read = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundError('Notification', notificationId);
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
