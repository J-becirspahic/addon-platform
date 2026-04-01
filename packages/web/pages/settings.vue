<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
});

const { user, linkGitHub, unlinkGitHub } = useAuth();

const unlinkLoading = ref(false);
const unlinkError = ref('');

async function handleUnlinkGitHub() {
  if (!confirm('Are you sure you want to unlink your GitHub account?')) {
    return;
  }

  unlinkError.value = '';
  unlinkLoading.value = true;

  try {
    await unlinkGitHub();
  } catch (err) {
    unlinkError.value = err instanceof Error ? err.message : 'Failed to unlink GitHub account';
  } finally {
    unlinkLoading.value = false;
  }
}

function handleLinkGitHub() {
  linkGitHub(window.location.href);
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Settings</h1>
    </div>

    <div class="card section-card">
      <h2 class="section-title">Profile</h2>

      <div class="profile-info">
        <div class="avatar">
          {{ user?.name?.charAt(0).toUpperCase() || 'U' }}
        </div>
        <div class="profile-details">
          <div class="profile-name">{{ user?.name }}</div>
          <div class="profile-email">{{ user?.email }}</div>
        </div>
      </div>
    </div>

    <div class="card section-card">
      <h2 class="section-title">Connected Accounts</h2>

      <div v-if="unlinkError" class="alert alert-error">
        {{ unlinkError }}
      </div>

      <div class="connected-account">
        <div class="account-info">
          <div class="account-icon">GH</div>
          <div class="account-details">
            <div class="account-name">GitHub</div>
            <div v-if="user?.githubUsername" class="account-username">
              @{{ user.githubUsername }}
            </div>
            <div v-else class="account-status">Not connected</div>
          </div>
        </div>

        <div class="account-actions">
          <button
            v-if="user?.githubUsername"
            class="btn btn-secondary"
            :disabled="unlinkLoading"
            @click="handleUnlinkGitHub"
          >
            {{ unlinkLoading ? 'Unlinking...' : 'Unlink' }}
          </button>
          <button
            v-else
            class="btn btn-primary"
            @click="handleLinkGitHub"
          >
            Connect GitHub
          </button>
        </div>
      </div>

      <p class="connected-hint">
        Connecting your GitHub account allows you to access repositories
        associated with your organizations and addons.
      </p>
    </div>
  </div>
</template>

<style scoped>
.section-card {
  max-width: 600px;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.5rem;
}

.profile-name {
  font-weight: 600;
  font-size: 1.125rem;
}

.profile-email {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.connected-account {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.account-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background-color: #24292f;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.account-name {
  font-weight: 500;
}

.account-username {
  font-size: 0.875rem;
  color: var(--color-primary);
}

.account-status {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.connected-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}
</style>
