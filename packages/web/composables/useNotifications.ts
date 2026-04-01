import type { Notification, NotificationListResponse } from '@addon-platform/shared';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
}

const state = reactive<NotificationState>({
  notifications: [],
  unreadCount: 0,
  loading: false,
});

let pollInterval: ReturnType<typeof setInterval> | null = null;

export function useNotifications() {
  const api = useApi();

  async function fetchNotifications(unreadOnly?: boolean) {
    state.loading = true;
    try {
      const query = unreadOnly ? '?unread=true' : '';
      const result = await api.get<NotificationListResponse>(`/api/notifications${query}`);
      state.notifications = result.notifications;
      state.unreadCount = result.unreadCount;
    } catch {
      // Silently fail for notification polling
    } finally {
      state.loading = false;
    }
  }

  async function fetchUnreadCount() {
    try {
      const result = await api.get<NotificationListResponse>('/api/notifications?unread=true&limit=1');
      state.unreadCount = result.unreadCount;
    } catch {
      // Silently fail
    }
  }

  async function markRead(id: string) {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      const notification = state.notifications.find((n) => n.id === id);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    } catch {
      // Silently fail
    }
  }

  async function markAllRead() {
    try {
      await api.post('/api/notifications/read-all');
      state.notifications.forEach((n) => (n.read = true));
      state.unreadCount = 0;
    } catch {
      // Silently fail
    }
  }

  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(fetchUnreadCount, 30_000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  onMounted(() => {
    fetchUnreadCount();
    startPolling();
  });

  onUnmounted(() => {
    stopPolling();
  });

  return {
    notifications: computed(() => state.notifications),
    unreadCount: computed(() => state.unreadCount),
    loading: computed(() => state.loading),
    fetchNotifications,
    markRead,
    markAllRead,
  };
}
