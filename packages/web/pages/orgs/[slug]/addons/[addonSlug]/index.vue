<script setup lang="ts">
import type { AddonVersion } from '@addon-platform/shared';

definePageMeta({
  layout: 'org',
  middleware: ['org-member'],
});

const route = useRoute();
const api = useApi();

const orgId = computed(() => route.params.slug as string);
const addonSlug = computed(() => route.params.addonSlug as string);

const { data, pending, error } = await useAsyncData(
  `addon-${orgId.value}-${addonSlug.value}`,
  () => api.get<{
    addon: {
      id: string;
      name: string;
      slug: string;
      description?: string;
      status: string;
      githubRepoUrl?: string;
      githubRepoFullName?: string;
      versions: AddonVersion[];
      latestVersion?: AddonVersion;
    };
  }>(`/api/organizations/${orgId.value}/addons/${addonSlug.value}`),
  { watch: [orgId, addonSlug] }
);

const router = useRouter();
const { confirm } = useConfirm();

const addon = computed(() => data.value?.addon);
const versions = computed(() => addon.value?.versions || []);

const canDelete = computed(() => {
  if (!addon.value) return false;
  if (addon.value.githubRepoUrl) return false;
  const hasPublished = addon.value.versions.some((v) => v.status === 'PUBLISHED');
  return !hasPublished;
});

async function handleDelete() {
  if (!addon.value) return;

  const confirmed = await confirm({
    title: 'Delete Addon',
    message: `Are you sure you want to delete "${addon.value.name}"? This action cannot be undone.`,
    confirmText: 'Delete',
    variant: 'danger',
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/organizations/${orgId.value}/addons/${addonSlug.value}`);
    router.push(`/orgs/${orgId.value}/addons`);
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to delete addon');
  }
}

function formatDate(date: Date | string | undefined) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>

<template>
  <div>
    <div v-if="pending" class="loading-state"><span class="spinner" /> Loading addon...</div>

    <div v-else-if="error" class="alert alert-error">Failed to load addon</div>

    <template v-else-if="addon">
      <Breadcrumbs :items="[
        { label: 'Home', to: '/' },
        { label: orgId, to: `/orgs/${orgId}` },
        { label: 'Addons', to: `/orgs/${orgId}/addons` },
        { label: addon.name },
      ]" />
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ addon.name }}</h1>
          <p v-if="addon.description" class="addon-description">{{ addon.description }}</p>
        </div>
        <div class="header-actions">
          <a
            v-if="addon.githubRepoUrl"
            :href="addon.githubRepoUrl"
            target="_blank"
            rel="noopener"
            class="btn btn-secondary"
          >
            View Repository
          </a>
          <button
            v-if="canDelete"
            class="btn btn-danger"
            @click="handleDelete"
          >
            Delete Addon
          </button>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Versions</h2>
          <NuxtLink
            :to="`/orgs/${orgId}/addons/${addonSlug}/versions/new`"
            class="btn btn-primary"
          >
            New Version
          </NuxtLink>
        </div>

        <div v-if="versions.length === 0" class="empty-state card">
          <h3>No versions yet</h3>
          <p>Create a version to start the submission workflow.</p>
          <NuxtLink
            :to="`/orgs/${orgId}/addons/${addonSlug}/versions/new`"
            class="btn btn-primary"
          >
            Create Version
          </NuxtLink>
        </div>

        <table v-else class="versions-table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>PR</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="version in versions" :key="version.id">
              <td class="version-number">v{{ version.version }}</td>
              <td>
                <StatusBadge :status="version.status" />
              </td>
              <td>{{ formatDate(version.submittedAt) }}</td>
              <td>
                <a
                  v-if="version.githubPrUrl"
                  :href="version.githubPrUrl"
                  target="_blank"
                  rel="noopener"
                  class="pr-link"
                >
                  #{{ version.githubPrNumber }}
                </a>
                <span v-else class="text-secondary">-</span>
              </td>
              <td>
                <NuxtLink
                  :to="`/orgs/${orgId}/addons/${addonSlug}/versions/${version.id}`"
                  class="btn btn-sm btn-secondary"
                >
                  View
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.addon-description {
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
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
  font-size: 1.25rem;
  font-weight: 600;
}

.versions-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.versions-table th,
.versions-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.versions-table th {
  background: var(--color-surface);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.versions-table tr:last-child td {
  border-bottom: none;
}

.version-number {
  font-weight: 500;
  font-family: monospace;
}

.pr-link {
  color: var(--color-primary);
  text-decoration: none;
  font-family: monospace;
}

.pr-link:hover {
  text-decoration: underline;
}

.text-secondary {
  color: var(--color-text-secondary);
}

.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
</style>
