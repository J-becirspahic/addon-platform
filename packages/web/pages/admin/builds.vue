<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const api = useApi();

const statusFilter = ref<string>('');

const { data, pending, error, refresh } = await useAsyncData(
  'admin-builds',
  () => {
    const params = new URLSearchParams();
    if (statusFilter.value) params.set('status', statusFilter.value);
    params.set('limit', '50');
    const qs = params.toString();
    return api.get<{
      builds: Array<{
        id: string;
        version: string;
        status: string;
        buildStartedAt: string | null;
        buildFinishedAt: string | null;
        addon: { id: string; name: string; slug: string };
      }>;
      total: number;
    }>(`/api/admin/builds${qs ? `?${qs}` : ''}`);
  },
  { watch: [statusFilter] }
);

const builds = computed(() => data.value?.builds || []);

function formatDate(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDuration(start: string | null, end: string | null): string {
  if (!start) return '-';
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const ms = endTime - startTime;
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Build History</h1>
      <div class="header-actions">
        <select v-model="statusFilter" class="filter-select">
          <option value="">All Statuses</option>
          <option value="BUILDING">Building</option>
          <option value="PUBLISHED">Published</option>
          <option value="FAILED">Failed</option>
        </select>
        <button class="btn btn-secondary btn-sm" @click="refresh()">
          Refresh
        </button>
      </div>
    </div>

    <div v-if="pending" class="loading-state"><span class="spinner" /> Loading builds...</div>
    <div v-else-if="error" class="alert alert-error">Failed to load builds</div>

    <div v-else class="card">
      <table class="builds-table">
        <thead>
          <tr>
            <th>Addon</th>
            <th>Version</th>
            <th>Status</th>
            <th>Started</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="build in builds" :key="build.id">
            <td class="addon-name">{{ build.addon.name }}</td>
            <td class="version-tag">v{{ build.version }}</td>
            <td><StatusBadge :status="build.status" /></td>
            <td class="date-cell">{{ formatDate(build.buildStartedAt) }}</td>
            <td class="duration-cell">{{ getDuration(build.buildStartedAt, build.buildFinishedAt) }}</td>
          </tr>
          <tr v-if="builds.length === 0">
            <td colspan="5" class="empty-row">No builds found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filter-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--color-bg);
  color: var(--color-text);
}

.builds-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.builds-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 2px solid var(--color-border);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.builds-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.builds-table tr:last-child td {
  border-bottom: none;
}

.addon-name {
  font-weight: 500;
}

.version-tag {
  font-family: monospace;
  font-size: 0.8125rem;
}

.date-cell {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}

.duration-cell {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  font-family: monospace;
}

.empty-row {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 2rem !important;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}
</style>
