<script setup lang="ts">
import type { OrganizationWithRole } from '@addon-platform/shared';

const props = defineProps<{
  organization: OrganizationWithRole;
}>();

const route = useRoute();

const tabs = computed(() => [
  { label: 'Overview', to: `/orgs/${props.organization.id}` },
  { label: 'Addons', to: `/orgs/${props.organization.id}/addons` },
  { label: 'Members', to: `/orgs/${props.organization.id}/members` },
  { label: 'Settings', to: `/orgs/${props.organization.id}/settings` },
]);

function isActive(to: string) {
  if (to === `/orgs/${props.organization.id}`) {
    return route.path === to;
  }
  return route.path.startsWith(to);
}
</script>

<template>
  <div class="org-tabs">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="tab"
      :class="{ active: isActive(tab.to) }"
    >
      {{ tab.label }}
    </NuxtLink>
  </div>
</template>

<style scoped>
.org-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.tab {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.tab:hover {
  background-color: var(--color-background);
  color: var(--color-text);
}

.tab.active {
  background-color: var(--color-background);
  color: var(--color-primary);
}
</style>
