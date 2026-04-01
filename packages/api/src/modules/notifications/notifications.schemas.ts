import { z } from 'zod';

export const notificationQuerySchema = z.object({
  unread: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const notificationIdParamSchema = z.object({
  notificationId: z.string().min(1),
});

export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
