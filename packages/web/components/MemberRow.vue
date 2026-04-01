<script setup lang="ts">
import type { OrganizationMember, OrganizationRole } from '@addon-platform/shared';

const props = defineProps<{
  member: OrganizationMember & {
    user?: {
      id: string;
      email: string;
      name: string;
      avatarUrl?: string;
      githubUsername?: string;
    };
  };
  currentUserRole: OrganizationRole;
  currentUserId: string;
}>();

const emit = defineEmits<{
  (e: 'changeRole', memberId: string, role: OrganizationRole): void;
  (e: 'remove', memberId: string): void;
}>();

const canManage = computed(() => {
  return props.currentUserRole === 'OWNER' || props.currentUserRole === 'ADMIN';
});

const canChangeRole = computed(() => {
  if (!canManage.value) return false;
  if (props.member.role === 'OWNER' && props.currentUserRole !== 'OWNER') return false;
  return true;
});

const canRemove = computed(() => {
  if (props.member.userId === props.currentUserId) return true;
  if (!canManage.value) return false;
  if (props.member.role === 'OWNER' && props.currentUserRole !== 'OWNER') return false;
  return true;
});

const roleOptions: { value: OrganizationRole; label: string }[] = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MEMBER', label: 'Member' },
];

function handleRoleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('changeRole', props.member.id, target.value as OrganizationRole);
}

function handleRemove() {
  if (confirm('Are you sure you want to remove this member?')) {
    emit('remove', props.member.id);
  }
}
</script>

<template>
  <div class="member-row">
    <div class="member-info">
      <div class="member-avatar">
        {{ member.user?.name?.charAt(0).toUpperCase() || 'U' }}
      </div>
      <div class="member-details">
        <span class="member-name">{{ member.user?.name }}</span>
        <span class="member-email">{{ member.user?.email }}</span>
        <span v-if="member.user?.githubUsername" class="member-github">
          @{{ member.user.githubUsername }}
        </span>
      </div>
    </div>

    <div class="member-actions">
      <select
        v-if="canChangeRole"
        :value="member.role"
        class="role-select"
        @change="handleRoleChange"
      >
        <option
          v-for="option in roleOptions"
          :key="option.value"
          :value="option.value"
          :disabled="option.value === 'OWNER' && currentUserRole !== 'OWNER'"
        >
          {{ option.label }}
        </option>
      </select>
      <StatusBadge v-else :status="member.role" variant="secondary" />

      <button
        v-if="canRemove"
        class="btn btn-danger btn-sm"
        @click="handleRemove"
      >
        {{ member.userId === currentUserId ? 'Leave' : 'Remove' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
}

.member-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--color-secondary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.member-details {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-weight: 500;
}

.member-email {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.member-github {
  font-size: 0.75rem;
  color: var(--color-primary);
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.role-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
  font-size: 0.875rem;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}
</style>
