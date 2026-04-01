export interface Notification {
  id: string;
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  addonId?: string;
  addonVersionId?: string;
  read: boolean;
  createdAt: Date;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
}
