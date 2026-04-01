<script setup lang="ts">
import { VERSION_STATUS_COLORS } from '@addon-platform/shared';

const props = defineProps<{
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'secondary' | 'info' | 'purple';
}>();

const statusVariantMap: Record<string, string> = {
  gray: 'secondary',
  blue: 'info',
  yellow: 'warning',
  orange: 'warning',
  green: 'success',
  purple: 'purple',
  red: 'error',
};

const badgeClass = computed(() => {
  if (props.variant) {
    return `badge badge-${props.variant}`;
  }
  const color = VERSION_STATUS_COLORS[props.status as keyof typeof VERSION_STATUS_COLORS];
  const resolved = color ? statusVariantMap[color] || 'secondary' : 'secondary';
  return `badge badge-${resolved}`;
});

const displayText = computed(() => {
  return props.status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\B\w+/g, (w) => w.toLowerCase());
});
</script>

<template>
  <span :class="badgeClass">
    {{ displayText }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.25rem;
}

.badge-secondary {
  background-color: var(--color-surface, #f3f4f6);
  color: var(--color-text-secondary, #6b7280);
}

.badge-success {
  background-color: #dcfce7;
  color: #166534;
}

.badge-warning {
  background-color: #fef3c7;
  color: #92400e;
}

.badge-error {
  background-color: #fee2e2;
  color: #991b1b;
}

.badge-info {
  background-color: #dbeafe;
  color: #1e40af;
}

.badge-purple {
  background-color: #f3e8ff;
  color: #6b21a8;
}
</style>
