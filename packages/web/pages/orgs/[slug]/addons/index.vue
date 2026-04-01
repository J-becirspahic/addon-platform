<script setup lang="ts">
import type { Addon, AddonVersion } from '@addon-platform/shared';

definePageMeta({
  layout: 'org',
  middleware: ['org-member'],
});

const route = useRoute();
const api = useApi();

const orgId = computed(() => route.params.slug as string);

const { data, pending, error, refresh } = await useAsyncData(
  `org-${orgId.value}-addons`,
  () => api.get<{
    addons: (Addon & { latestVersion?: AddonVersion | null; versionCount?: number })[]
  }>(`/api/organizations/${orgId.value}/addons`),
  { watch: [orgId] }
);

const addons = computed(() => data.value?.addons || []);
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Addons</h1>
      <NuxtLink :to="`/orgs/${orgId}/addons/new`" class="btn btn-primary">
        New Addon
      </NuxtLink>
    </div>

    <div v-if="pending" class="loading-state">
      <span class="spinner" /> Loading addons...
    </div>

    <div v-else-if="error" class="alert alert-error">
      Failed to load addons
    </div>

    <div v-else-if="addons.length === 0" class="empty-state card">
      <h3>No addons yet</h3>
      <p>Create your first addon to get started.</p>
      <NuxtLink :to="`/orgs/${orgId}/addons/new`" class="btn btn-primary">
        Create Addon
      </NuxtLink>
    </div>

    <div v-else class="addons-grid">
      <AddonCard
        v-for="addon in addons"
        :key="addon.id"
        :addon="addon"
        :org-id="orgId"
      />
    </div>
  </div>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.addons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .addons-grid {
    grid-template-columns: 1fr;
  }
}
</style>
