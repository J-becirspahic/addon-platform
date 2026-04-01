<script setup lang="ts">
const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } = useNotifications();

const showDropdown = ref(false);
const loaded = ref(false);

async function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
  if (showDropdown.value && !loaded.value) {
    await fetchNotifications();
    loaded.value = true;
  }
}

function handleClickNotification(notification: { id: string; addonId?: string; addonVersionId?: string; read: boolean }) {
  if (!notification.read) {
    markRead(notification.id);
  }
  showDropdown.value = false;
}

function handleMarkAllRead() {
  markAllRead();
}

function formatTime(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
</script>

<template>
  <div class="notification-bell" @click="toggleDropdown">
    <button class="bell-button" aria-label="Notifications">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span v-if="unreadCount > 0" class="badge-count">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <div v-if="showDropdown" class="notification-dropdown">
      <div class="dropdown-header">
        <span class="dropdown-title">Notifications</span>
        <button
          v-if="unreadCount > 0"
          class="mark-all-read"
          @click.stop="handleMarkAllRead"
        >
          Mark all read
        </button>
      </div>

      <div class="notification-list">
        <div
          v-if="notifications.length === 0"
          class="empty-notifications"
        >
          No notifications
        </div>

        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="['notification-item', { unread: !notification.read }]"
          @click="handleClickNotification(notification)"
        >
          <div class="notification-title">{{ notification.title }}</div>
          <div class="notification-message">{{ notification.message }}</div>
          <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notification-bell {
  position: relative;
}

.bell-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--color-text);
}

.bell-button:hover {
  background-color: var(--color-surface);
}

.badge-count {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 9999px;
  background-color: #ef4444;
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  width: 340px;
  max-height: 400px;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 200;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.dropdown-title {
  font-weight: 600;
  font-size: 0.875rem;
}

.mark-all-read {
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
}

.mark-all-read:hover {
  text-decoration: underline;
}

.notification-list {
  overflow-y: auto;
  max-height: 340px;
}

.empty-notifications {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.notification-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item:hover {
  background-color: var(--color-surface);
}

.notification-item.unread {
  background-color: #eff6ff;
}

.notification-item.unread:hover {
  background-color: #dbeafe;
}

.notification-title {
  font-weight: 500;
  font-size: 0.8125rem;
  margin-bottom: 0.125rem;
}

.notification-message {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
}

.notification-time {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
}
</style>
