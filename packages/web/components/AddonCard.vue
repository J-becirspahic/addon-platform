<script setup lang="ts">
import type { Addon, AddonVersion } from '@addon-platform/shared';

const props = defineProps<{
  addon: Addon & {
    latestVersion?: AddonVersion | null;
    versionCount?: number;
  };
  orgId: string;
}>();

const statusColor = computed(() => {
  switch (props.addon.status) {
    case 'ACTIVE':
      return 'success';
    case 'DEPRECATED':
      return 'warning';
    case 'ARCHIVED':
      return 'error';
    default:
      return 'secondary';
  }
});
</script>

<template>
  <NuxtLink :to="`/orgs/${orgId}/addons/${addon.slug}`" class="addon-card card">
    <div class="addon-header">
      <h3 class="addon-name">{{ addon.name }}</h3>
      <StatusBadge :status="addon.status" :variant="statusColor" />
    </div>

    <p v-if="addon.description" class="addon-description">
      {{ addon.description }}
    </p>

    <div class="addon-meta">
      <span v-if="addon.latestVersion" class="version">
        v{{ addon.latestVersion.version }}
      </span>
      <span v-if="addon.githubRepoUrl" class="github-link">
        GitHub
      </span>
      <span class="version-count">
        {{ addon.versionCount || 0 }} version{{ (addon.versionCount || 0) !== 1 ? 's' : '' }}
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.addon-card {
  display: block;
  text-decoration: none;
  color: inherit;
  transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.addon-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

.addon-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.addon-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.addon-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.addon-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.version {
  background-color: var(--color-surface);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
}

.github-link {
  color: var(--color-primary);
}
</style>
