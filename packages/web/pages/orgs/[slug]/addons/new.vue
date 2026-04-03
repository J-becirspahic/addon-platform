<script setup lang="ts">
import type { Addon } from '@addon-platform/shared';

definePageMeta({
  layout: 'org',
  middleware: ['org-member'],
});

const route = useRoute();
const router = useRouter();
const api = useApi();

const orgId = computed(() => route.params.slug as string);

const name = ref('');
const slug = ref('');
const description = ref('');
const createGithubRepo = ref(false);
const error = ref('');
const loading = ref(false);

watch(name, (newName) => {
  if (!slug.value || slug.value === generateSlug(name.value.slice(0, -1))) {
    slug.value = generateSlug(newName);
  }
});

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function handleSubmit() {
  error.value = '';
  loading.value = true;

  try {
    const { addon } = await api.post<{ addon: Addon }>(
      `/api/organizations/${orgId.value}/addons`,
      {
        name: name.value,
        slug: slug.value,
        description: description.value || undefined,
        createGithubRepo: createGithubRepo.value,
      }
    );

    router.push(`/orgs/${orgId.value}/addons/${addon.slug}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create addon';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="create-addon-page">
    <div class="page-header">
      <h1 class="page-title">Create Addon</h1>
    </div>

    <div class="card form-card">
      <div v-if="error" class="alert alert-error">
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit">
        <FormInput
          v-model="name"
          label="Addon Name"
          placeholder="My Addon"
          required
        />

        <FormInput
          v-model="slug"
          label="Slug"
          placeholder="my-addon"
          required
        />
        <p class="form-hint">
          This will be used in URLs and as part of the GitHub repository name.
        </p>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea
            v-model="description"
            class="form-input"
            rows="3"
            placeholder="Describe your addon (optional)"
          />
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              v-model="createGithubRepo"
              type="checkbox"
              class="checkbox-input"
            />
            <span>Create GitHub repository</span>
          </label>
          <p class="form-hint">
            A private repository will be created for this addon with appropriate permissions for all organization members.
          </p>
        </div>

        <div class="form-actions">
          <NuxtLink :to="`/orgs/${orgId}/addons`" class="btn btn-secondary">
            Cancel
          </NuxtLink>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading || !name || !slug"
          >
            {{ loading ? 'Creating...' : 'Create Addon' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.create-addon-page {
  max-width: 600px;
}

.form-card {
  margin-top: 1rem;
}

.form-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: -0.75rem;
  margin-bottom: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-input {
  width: 1rem;
  height: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
