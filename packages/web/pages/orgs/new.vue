<script setup lang="ts">
import type { Organization } from '@addon-platform/shared';

definePageMeta({
  middleware: ['auth'],
});

const api = useApi();
const router = useRouter();

const name = ref('');
const slug = ref('');
const description = ref('');
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
    const { organization } = await api.post<{ organization: Organization }>('/api/organizations', {
      name: name.value,
      slug: slug.value,
      description: description.value || undefined,
    });

    router.push(`/orgs/${organization.id}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create organization';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="create-org-page">
    <div class="page-header">
      <h1 class="page-title">Create Organization</h1>
    </div>

    <div class="card form-card">
      <div v-if="error" class="alert alert-error">
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit">
        <FormInput
          v-model="name"
          label="Organization Name"
          placeholder="My Organization"
          required
        />

        <FormInput
          v-model="slug"
          label="Slug"
          placeholder="my-organization"
          required
        />
        <p class="form-hint">
          This will be used in URLs and repository names. Only lowercase letters, numbers, and hyphens.
        </p>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea
            v-model="description"
            class="form-input"
            rows="3"
            placeholder="Describe your organization (optional)"
          />
        </div>

        <div class="form-actions">
          <NuxtLink to="/" class="btn btn-secondary">
            Cancel
          </NuxtLink>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading || !name || !slug"
          >
            {{ loading ? 'Creating...' : 'Create Organization' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.create-org-page {
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
