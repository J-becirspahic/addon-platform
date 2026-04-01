<script setup lang="ts">
import type { OrganizationMember, OrganizationRole, OrganizationWithRole } from '@addon-platform/shared';

definePageMeta({
  layout: 'org',
  middleware: ['org-member'],
});

const route = useRoute();
const api = useApi();
const { user } = useAuth();

const orgId = computed(() => route.params.slug as string);
const organization = inject<ComputedRef<OrganizationWithRole>>('organization');

const { data, pending, error, refresh } = await useAsyncData(
  `org-${orgId.value}-members`,
  () => api.get<{ members: OrganizationMember[] }>(`/api/organizations/${orgId.value}/members`),
  { watch: [orgId] }
);

const members = computed(() => data.value?.members || []);

const showInviteModal = ref(false);
const inviteEmail = ref('');
const inviteRole = ref<'ADMIN' | 'MEMBER'>('MEMBER');
const inviteError = ref('');
const inviteLoading = ref(false);

const canManage = computed(() => {
  return organization?.value?.role === 'OWNER' || organization?.value?.role === 'ADMIN';
});

async function inviteMember() {
  inviteError.value = '';
  inviteLoading.value = true;

  try {
    await api.post(`/api/organizations/${orgId.value}/members`, {
      email: inviteEmail.value,
      role: inviteRole.value,
    });

    showInviteModal.value = false;
    inviteEmail.value = '';
    inviteRole.value = 'MEMBER';
    refresh();
  } catch (err) {
    inviteError.value = err instanceof Error ? err.message : 'Failed to invite member';
  } finally {
    inviteLoading.value = false;
  }
}

async function handleChangeRole(memberId: string, newRole: OrganizationRole) {
  try {
    await api.patch(`/api/organizations/${orgId.value}/members/${memberId}`, {
      role: newRole,
    });
    showToast('Role updated', 'success');
    refresh();
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to update role', 'error');
  }
}

const { confirm } = useConfirm();
const { showToast } = useToast();

async function handleRemoveMember(memberId: string) {
  const confirmed = await confirm({
    title: 'Remove Member',
    message: 'Are you sure you want to remove this member from the organization? This action cannot be undone.',
    confirmText: 'Remove',
    variant: 'danger',
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/organizations/${orgId.value}/members/${memberId}`);
    showToast('Member removed successfully', 'success');
    refresh();
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to remove member', 'error');
  }
}
</script>

<template>
  <div>
    <Breadcrumbs :items="[
      { label: 'Home', to: '/' },
      { label: organization?.name || orgId, to: `/orgs/${orgId}` },
      { label: 'Members' },
    ]" />
    <div class="page-header">
      <h1 class="page-title">Members</h1>
      <button
        v-if="canManage"
        class="btn btn-primary"
        @click="showInviteModal = true"
      >
        Invite Member
      </button>
    </div>

    <div v-if="pending" class="loading-state">
      <span class="spinner" /> Loading members...
    </div>

    <div v-else-if="error" class="alert alert-error">
      Failed to load members
    </div>

    <div v-else class="members-list">
      <MemberRow
        v-for="member in members"
        :key="member.id"
        :member="member"
        :current-user-role="organization?.role || 'MEMBER'"
        :current-user-id="user?.id || ''"
        @change-role="handleChangeRole"
        @remove="handleRemoveMember"
      />
    </div>

    <!-- Invite Modal -->
    <div v-if="showInviteModal" class="modal-overlay" @click.self="showInviteModal = false">
      <div class="modal card">
        <h2 class="modal-title">Invite Member</h2>

        <div v-if="inviteError" class="alert alert-error">
          {{ inviteError }}
        </div>

        <form @submit.prevent="inviteMember">
          <FormInput
            v-model="inviteEmail"
            label="Email Address"
            type="email"
            placeholder="user@example.com"
            required
          />

          <div class="form-group">
            <label class="form-label">Role</label>
            <select v-model="inviteRole" class="form-input">
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="btn btn-secondary"
              @click="showInviteModal = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="inviteLoading || !inviteEmail"
            >
              {{ inviteLoading ? 'Inviting...' : 'Invite' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: 100%;
  max-width: 400px;
  margin: 1rem;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
