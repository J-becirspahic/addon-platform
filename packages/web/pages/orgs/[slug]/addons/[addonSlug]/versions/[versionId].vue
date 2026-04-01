<script setup lang="ts">
import type { AddonVersion, PrStatusResponse, BuildReport } from '@addon-platform/shared';

definePageMeta({
  layout: 'org',
  middleware: ['org-member'],
});

const route = useRoute();
const api = useApi();

const orgId = computed(() => route.params.slug as string);
const addonSlug = computed(() => route.params.addonSlug as string);
const versionId = computed(() => route.params.versionId as string);

const { data, pending, error, refresh } = await useAsyncData(
  `version-${versionId.value}`,
  () => api.get<{
    version: AddonVersion & { addon: { id: string; name: string; slug: string; githubRepoFullName?: string } };
  }>(`/api/organizations/${orgId.value}/addons/${route.query.addonId || ''}/versions/${versionId.value}`),
  { watch: [versionId] }
);

const version = computed(() => data.value?.version);
const addonId = computed(() => version.value?.addon?.id || (route.query.addonId as string) || '');

const { connected, latestStatus } = useVersionEvents(
  orgId.value,
  addonId.value,
  versionId.value
);

const currentStatus = computed(() => latestStatus.value || version.value?.status || 'DRAFT');

watch(latestStatus, (newStatus) => {
  if (newStatus && version.value) {
    (version.value as AddonVersion).status = newStatus as AddonVersion['status'];
  }
});

const buildReport = ref<BuildReport | null>(null);
const buildReportLoading = ref(false);

async function fetchBuildReport() {
  if (!addonId.value) return;
  buildReportLoading.value = true;
  try {
    const result = await api.get<{
      buildReport: BuildReport | null;
      buildStartedAt: string | null;
      buildFinishedAt: string | null;
      downloadUrl: string | null;
      fileSize: number | null;
    }>(`/api/organizations/${orgId.value}/addons/${addonId.value}/versions/${versionId.value}/build`);
    buildReport.value = result.buildReport;
  } catch {
    // Silently fail
  } finally {
    buildReportLoading.value = false;
  }
}

watch(currentStatus, (status) => {
  if (status === 'PUBLISHED' || status === 'FAILED') {
    fetchBuildReport();
  }
});

const prStatus = ref<PrStatusResponse | null>(null);
const prLoading = ref(false);

async function fetchPrStatus() {
  if (!version.value?.githubPrNumber || !addonId.value) return;
  prLoading.value = true;
  try {
    const result = await api.get<{ prStatus: PrStatusResponse | null }>(
      `/api/organizations/${orgId.value}/addons/${addonId.value}/versions/${versionId.value}/pr-status`
    );
    prStatus.value = result.prStatus;
  } catch {
    // Silently fail
  } finally {
    prLoading.value = false;
  }
}

onMounted(() => {
  if (version.value?.githubPrNumber) {
    fetchPrStatus();
  }
  const status = currentStatus.value;
  if (status === 'BUILDING' || status === 'PUBLISHED' || status === 'FAILED') {
    fetchBuildReport();
  }
});

function formatDate(date: Date | string | undefined) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <div>
    <div v-if="pending" class="loading-state"><span class="spinner" /> Loading version...</div>

    <div v-else-if="error" class="alert alert-error">Failed to load version</div>

    <template v-else-if="version">
      <Breadcrumbs :items="[
        { label: 'Home', to: '/' },
        { label: orgId, to: `/orgs/${orgId}` },
        { label: 'Addons', to: `/orgs/${orgId}/addons` },
        { label: version.addon?.name || addonSlug, to: `/orgs/${orgId}/addons/${addonSlug}` },
        { label: `v${version.version}` },
      ]" />
      <div class="page-header">
        <div>
          <h1 class="page-title">Version v{{ version.version }}</h1>
        </div>
        <div class="header-actions">
          <span :class="['connection-status', { connected }]">
            {{ connected ? 'Live' : 'Disconnected' }}
          </span>
        </div>
      </div>

      <div class="card progress-card">
        <h2 class="card-title">Progress</h2>
        <VersionProgressIndicator :status="currentStatus" />
      </div>

      <div class="details-grid">
        <div class="card detail-card">
          <h3 class="card-title">Details</h3>
          <dl class="detail-list">
            <dt>Status</dt>
            <dd><StatusBadge :status="currentStatus" /></dd>
            <dt>Created</dt>
            <dd>{{ formatDate(version.createdAt) }}</dd>
            <dt>Submitted</dt>
            <dd>{{ formatDate(version.submittedAt) }}</dd>
            <dt>Published</dt>
            <dd>{{ formatDate(version.publishedAt) }}</dd>
          </dl>
        </div>

        <div v-if="version.githubPrNumber" class="card detail-card">
          <h3 class="card-title">Pull Request</h3>
          <dl class="detail-list">
            <dt>PR</dt>
            <dd>
              <a
                v-if="version.githubPrUrl"
                :href="version.githubPrUrl"
                target="_blank"
                rel="noopener"
                class="pr-link"
              >
                #{{ version.githubPrNumber }}
              </a>
            </dd>
            <template v-if="prStatus">
              <dt>State</dt>
              <dd>{{ prStatus.state }}</dd>
              <dt>Mergeable</dt>
              <dd>{{ prStatus.mergeable === null ? 'Checking...' : prStatus.mergeable ? 'Yes' : 'No' }}</dd>
            </template>
          </dl>

          <div v-if="prStatus && prStatus.reviews.length > 0" class="reviews-section">
            <h4 class="sub-title">Reviews</h4>
            <div v-for="(review, i) in prStatus.reviews" :key="i" class="review-item">
              <span class="review-user">{{ review.user }}</span>
              <StatusBadge :status="review.state" />
            </div>
          </div>

          <div v-if="prStatus && prStatus.checks.length > 0" class="checks-section">
            <h4 class="sub-title">Checks</h4>
            <div v-for="(check, i) in prStatus.checks" :key="i" class="check-item">
              <span class="check-name">{{ check.name }}</span>
              <span :class="['check-status', check.conclusion || check.status]">
                {{ check.conclusion || check.status }}
              </span>
            </div>
          </div>

          <button
            class="btn btn-secondary btn-sm refresh-btn"
            :disabled="prLoading"
            @click="fetchPrStatus"
          >
            {{ prLoading ? 'Refreshing...' : 'Refresh PR Status' }}
          </button>
        </div>
      </div>

      <div v-if="currentStatus === 'BUILDING'" class="card building-card">
        <div class="building-indicator">
          <span class="spinner"></span>
          <span class="building-text">Building...</span>
        </div>
        <p class="building-desc">The addon is being built. This page will update automatically.</p>
      </div>

      <div v-if="currentStatus === 'PUBLISHED' && version.downloadUrl" class="card download-card">
        <h3 class="card-title">Download</h3>
        <a :href="version.downloadUrl" target="_blank" rel="noopener" class="btn btn-primary download-btn">
          Download Artifact
        </a>
        <span v-if="version.fileSize" class="file-size">
          {{ (version.fileSize / 1024).toFixed(1) }} KB
        </span>
      </div>

      <div v-if="buildReport" class="card build-report-card">
        <h3 class="card-title">Build Report</h3>
        <BuildReport :report="buildReport" />
      </div>

      <div
        v-else-if="(currentStatus === 'PUBLISHED' || currentStatus === 'FAILED') && !buildReport && !buildReportLoading"
        class="card build-report-card"
      >
        <button class="btn btn-secondary" @click="fetchBuildReport">
          Load Build Report
        </button>
      </div>

      <div v-if="version.changelog" class="card changelog-card">
        <h3 class="card-title">Changelog</h3>
        <p class="changelog-text">{{ version.changelog }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.breadcrumb {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-decoration: none;
}

.breadcrumb:hover {
  color: var(--color-primary);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 0.25rem;
}

.connection-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  background: var(--color-surface);
}

.connection-status::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #9ca3af;
}

.connection-status.connected::before {
  background-color: #22c55e;
}

.progress-card {
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.detail-card {
  padding: 1.25rem;
}

.detail-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  font-size: 0.875rem;
}

.detail-list dt {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.pr-link {
  color: var(--color-primary);
  text-decoration: none;
  font-family: monospace;
}

.pr-link:hover {
  text-decoration: underline;
}

.sub-title {
  font-size: 0.8125rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.reviews-section,
.checks-section {
  margin-top: 0.75rem;
}

.review-item,
.check-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0;
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--color-border);
}

.review-item:last-child,
.check-item:last-child {
  border-bottom: none;
}

.review-user,
.check-name {
  font-weight: 500;
}

.check-status {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

.check-status.success {
  background-color: #dcfce7;
  color: #166534;
}

.check-status.failure {
  background-color: #fee2e2;
  color: #991b1b;
}

.check-status.in_progress,
.check-status.queued {
  background-color: #fef3c7;
  color: #92400e;
}

.refresh-btn {
  margin-top: 1rem;
}

.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
}

.changelog-card {
  padding: 1.25rem;
}

.changelog-text {
  font-size: 0.875rem;
  white-space: pre-wrap;
  color: var(--color-text);
  line-height: 1.6;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.building-card {
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.building-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.building-text {
  font-weight: 600;
  color: var(--color-primary);
}

.building-desc {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.download-card {
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.download-btn {
  text-decoration: none;
}

.file-size {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.build-report-card {
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
