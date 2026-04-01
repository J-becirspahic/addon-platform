<script setup lang="ts">
import type { OrganizationWithRole } from '@addon-platform/shared';

const props = defineProps<{
  organization: OrganizationWithRole;
}>();

const route = useRoute();

const navItems = computed(() => [
  {
    label: 'Overview',
    to: `/orgs/${props.organization.id}`,
    icon: 'home',
  },
  {
    label: 'Addons',
    to: `/orgs/${props.organization.id}/addons`,
    icon: 'package',
  },
  {
    label: 'Members',
    to: `/orgs/${props.organization.id}/members`,
    icon: 'users',
  },
  {
    label: 'Settings',
    to: `/orgs/${props.organization.id}/settings`,
    icon: 'settings',
  },
]);

function isActive(to: string) {
  if (to === `/orgs/${props.organization.id}`) {
    return route.path === to;
  }
  return route.path.startsWith(to);
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="org-info">
        <div class="org-avatar">
          {{ organization.name.charAt(0).toUpperCase() }}
        </div>
        <div class="org-details">
          <h3 class="org-name">{{ organization.name }}</h3>
          <span class="org-slug">{{ organization.slug }}</span>
        </div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item.to) }"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  background-color: var(--color-background);
  border-right: 1px solid var(--color-border);
  flex-shrink: 0;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.org-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.org-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
}

.org-details {
  flex: 1;
  min-width: 0;
}

.org-name {
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.org-slug {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.sidebar-nav {
  padding: 0.5rem;
}

.nav-item {
  display: block;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.nav-item:hover {
  background-color: var(--color-surface);
  color: var(--color-text);
}

.nav-item.active {
  background-color: var(--color-primary);
  color: white;
}
</style>
