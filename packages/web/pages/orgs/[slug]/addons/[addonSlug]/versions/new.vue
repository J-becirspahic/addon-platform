<script setup lang="ts">
definePageMeta({
  layout: 'org',
  middleware: ['org-member'],
});

const route = useRoute();
const api = useApi();

const orgId = computed(() => route.params.slug as string);
const addonSlug = computed(() => route.params.addonSlug as string);

const form = reactive({
  version: '',
  changelog: '',
});

const submitting = ref(false);
const errorMessage = ref('');
const createdVersion = ref<{
  id: string;
  version: string;
  branchName: string;
} | null>(null);

const { data: addonData } = await useAsyncData(
  `addon-${orgId.value}-${addonSlug.value}-info`,
  () => api.get<{
    addon: { id: string; name: string; githubRepoFullName?: string; githubRepoUrl?: string };
  }>(`/api/organizations/${orgId.value}/addons/${addonSlug.value}`)
);

const addon = computed(() => addonData.value?.addon);
const cloneUrl = computed(() => {
  if (!addon.value?.githubRepoFullName) return '';
  return `git@github.com:${addon.value.githubRepoFullName}.git`;
});

async function handleSubmit() {
  if (!form.version) return;

  submitting.value = true;
  errorMessage.value = '';

  try {
    const result = await api.post<{
      version: { id: string; version: string; branchName: string };
    }>(`/api/organizations/${orgId.value}/addons/${addon.value!.id}/versions`, {
      version: form.version,
      changelog: form.changelog || undefined,
    });
    createdVersion.value = result.version;
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to create version';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Create New Version</h1>
    </div>

    <div v-if="!createdVersion" class="card form-card">
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="version" class="form-label">Version (semver)</label>
          <input
            id="version"
            v-model="form.version"
            type="text"
            class="form-input"
            placeholder="1.0.0"
            required
            pattern="\d+\.\d+\.\d+(-[\w.]+)?"
          />
          <p class="form-hint">Use semantic versioning (e.g., 1.0.0, 2.1.0-beta.1)</p>
        </div>

        <div class="form-group">
          <label for="changelog" class="form-label">Changelog (optional)</label>
          <textarea
            id="changelog"
            v-model="form.changelog"
            class="form-input form-textarea"
            rows="5"
            placeholder="Describe the changes in this version..."
          />
        </div>

        <div v-if="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>

        <div class="form-actions">
          <NuxtLink
            :to="`/orgs/${orgId}/addons/${addonSlug}`"
            class="btn btn-secondary"
          >
            Cancel
          </NuxtLink>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Creating...' : 'Create Version' }}
          </button>
        </div>
      </form>
    </div>

    <div v-else class="card success-card">
      <div class="success-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <h2>Version v{{ createdVersion.version }} Created</h2>
      </div>

      <p class="success-description">
        Push your code to the submission branch to start the review process.
      </p>

      <div class="git-instructions">
        <h3>Git Instructions</h3>
        <div class="command-block">
          <p class="command-label">1. Clone the repository (if you haven't already):</p>
          <code class="command">git clone {{ cloneUrl }}</code>
        </div>
        <div class="command-block">
          <p class="command-label">2. Create and checkout the submission branch:</p>
          <code class="command">git checkout -b {{ createdVersion.branchName }}</code>
        </div>
        <div class="command-block">
          <p class="command-label">3. Make your changes, commit, and push:</p>
          <code class="command">git add .<br/>git commit -m "v{{ createdVersion.version }}"<br/>git push origin {{ createdVersion.branchName }}</code>
        </div>
      </div>

      <div class="form-actions">
        <NuxtLink
          :to="`/orgs/${orgId}/addons/${addonSlug}`"
          class="btn btn-secondary"
        >
          Back to Addon
        </NuxtLink>
        <NuxtLink
          :to="`/orgs/${orgId}/addons/${addonSlug}/versions/${createdVersion.id}`"
          class="btn btn-primary"
        >
          View Version
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-card {
  max-width: 600px;
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  font-weight: 500;
  font-size: 0.875rem;
  margin-bottom: 0.375rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  background: var(--color-background);
  color: var(--color-text);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-hint {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.success-card {
  max-width: 700px;
  padding: 1.5rem;
}

.success-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.success-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
}

.success-description {
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.git-instructions {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.git-instructions h3 {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.command-block {
  margin-bottom: 1rem;
}

.command-block:last-child {
  margin-bottom: 0;
}

.command-label {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.375rem;
}

.command {
  display: block;
  background: #1e293b;
  color: #e2e8f0;
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  line-height: 1.5;
  overflow-x: auto;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
}
</style>
