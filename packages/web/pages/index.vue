<script setup lang="ts">
import type { OrganizationWithRole } from '@addon-platform/shared';

definePageMeta({
  middleware: ['auth'],
});

const api = useApi();
const { user, isLoading, fetchUser } = useAuth();

if (isLoading.value) {
  await fetchUser();
}

const { data, pending, error } = await useAsyncData('organizations', () =>
  api.get<{ organizations: OrganizationWithRole[] }>('/api/organizations')
);

const organizations = computed(() => data.value?.organizations || []);
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <NuxtLink to="/orgs/new" class="btn btn-primary">
        New Organization
      </NuxtLink>
    </div>

    <div v-if="pending" class="loading-state">
      <span class="spinner" /> Loading organizations...
    </div>

    <div v-else-if="error" class="alert alert-error">
      Failed to load organizations
    </div>

    <div v-else-if="organizations.length === 0" class="empty-state card">
      <h3>No organizations yet</h3>
      <p>Create your first organization to get started.</p>
      <NuxtLink to="/orgs/new" class="btn btn-primary">
        Create Organization
      </NuxtLink>
    </div>

    <div v-else class="org-grid">
      <NuxtLink
        v-for="org in organizations"
        :key="org.id"
        :to="`/orgs/${org.id}`"
        class="org-card card"
      >
        <div class="org-header">
          <div class="org-avatar">
            {{ org.name.charAt(0).toUpperCase() }}
          </div>
          <div class="org-info">
            <h3 class="org-name">{{ org.name }}</h3>
            <span class="org-slug">{{ org.slug }}</span>
          </div>
        </div>

        <p v-if="org.description" class="org-description">
          {{ org.description }}
        </p>

        <div class="org-stats">
          <span>{{ org.addonCount }} addon{{ org.addonCount !== 1 ? 's' : '' }}</span>
          <span>{{ org.memberCount }} member{{ org.memberCount !== 1 ? 's' : '' }}</span>
          <StatusBadge :status="org.role" variant="secondary" />
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.org-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.org-card {
  text-decoration: none;
  color: inherit;
  transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.org-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

.org-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.org-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.25rem;
}

.org-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.org-slug {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.org-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.org-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .org-grid {
    grid-template-columns: 1fr;
  }
}
</style>
