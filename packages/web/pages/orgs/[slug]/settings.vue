<script setup lang="ts">
import type { OrganizationWithRole } from '@addon-platform/shared';

definePageMeta({
  layout: 'org',
  middleware: ['org-member'],
});

const route = useRoute();
const api = useApi();

const orgId = computed(() => route.params.slug as string);
const organization = inject<ComputedRef<OrganizationWithRole>>('organization');
const refreshOrg = inject<() => Promise<void>>('refreshOrg');

const name = ref('');
const description = ref('');
const error = ref('');
const success = ref('');
const loading = ref(false);

watch(
  () => organization?.value,
  (org) => {
    if (org) {
      name.value = org.name;
      description.value = org.description || '';
    }
  },
  { immediate: true }
);

const canEdit = computed(() => {
  return organization?.value?.role === 'OWNER' || organization?.value?.role === 'ADMIN';
});

async function handleSubmit() {
  error.value = '';
  success.value = '';
  loading.value = true;

  try {
    await api.patch(`/api/organizations/${orgId.value}`, {
      name: name.value,
      description: description.value || null,
    });

    success.value = 'Settings updated successfully';
    if (refreshOrg) {
      await refreshOrg();
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update settings';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <Breadcrumbs :items="[
      { label: 'Home', to: '/' },
      { label: organization?.name || orgId, to: `/orgs/${orgId}` },
      { label: 'Settings' },
    ]" />
    <div class="page-header">
      <h1 class="page-title">Settings</h1>
    </div>

    <div class="card form-card">
      <h2 class="section-title">General</h2>

      <div v-if="error" class="alert alert-error">
        {{ error }}
      </div>

      <div v-if="success" class="alert alert-success">
        {{ success }}
      </div>

      <form @submit.prevent="handleSubmit">
        <FormInput
          v-model="name"
          label="Organization Name"
          :disabled="!canEdit"
          required
        />

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea
            v-model="description"
            class="form-input"
            rows="3"
            :disabled="!canEdit"
            placeholder="Describe your organization"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Slug</label>
          <input
            :value="organization?.slug"
            type="text"
            class="form-input"
            disabled
          />
          <p class="form-hint">The slug cannot be changed after creation.</p>
        </div>

        <div v-if="canEdit" class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading"
          >
            {{ loading ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="organization?.role === 'OWNER'" class="card danger-zone">
      <h2 class="section-title danger">Danger Zone</h2>
      <p class="danger-text">
        Deleting this organization will permanently remove all addons and data.
        This action cannot be undone.
      </p>
      <button class="btn btn-danger" disabled>
        Delete Organization
      </button>
    </div>
  </div>
</template>

<style scoped>
.form-card {
  max-width: 600px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.form-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}

.form-actions {
  margin-top: 1.5rem;
}

.danger-zone {
  max-width: 600px;
  margin-top: 2rem;
  border-color: var(--color-error);
}

.section-title.danger {
  color: var(--color-error);
}

.danger-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}
</style>
