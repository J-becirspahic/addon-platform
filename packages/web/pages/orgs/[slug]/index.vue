<script setup lang="ts">
import type { OrganizationWithRole, Addon, AddonVersion } from '@addon-platform/shared';

definePageMeta({
  layout: 'org',
  middleware: ['org-member'],
});

const route = useRoute();
const api = useApi();

const orgId = computed(() => route.params.slug as string);

const organization = inject<ComputedRef<OrganizationWithRole>>('organization');

const { data: addonsData } = await useAsyncData(
  `org-${orgId.value}-addons`,
  () => api.get<{
    addons: (Addon & { latestVersion?: AddonVersion | null; versionCount?: number })[]
  }>(`/api/organizations/${orgId.value}/addons`),
  { watch: [orgId] }
);

const addons = computed(() => addonsData.value?.addons || []);
const recentAddons = computed(() => addons.value.slice(0, 5));
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Overview</h1>
    </div>

    <div v-if="organization" class="stats-grid">
      <div class="stat-card card">
        <div class="stat-value">{{ organization.addonCount }}</div>
        <div class="stat-label">Addons</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value">{{ organization.memberCount }}</div>
        <div class="stat-label">Members</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value">{{ organization.role }}</div>
        <div class="stat-label">Your Role</div>
      </div>
    </div>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Recent Addons</h2>
        <NuxtLink :to="`/orgs/${orgId}/addons`" class="view-all">
          View all
        </NuxtLink>
      </div>

      <div v-if="recentAddons.length === 0" class="empty-state">
        <p>No addons yet</p>
        <NuxtLink :to="`/orgs/${orgId}/addons/new`" class="btn btn-primary">
          Create Addon
        </NuxtLink>
      </div>

      <div v-else class="addons-list">
        <AddonCard
          v-for="addon in recentAddons"
          :key="addon.id"
          :addon="addon"
          :org-id="orgId"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  text-align: center;
  padding: 1.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}

.section {
  margin-top: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
}

.view-all {
  font-size: 0.875rem;
}

.addons-list {
  display: grid;
  gap: 1rem;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
