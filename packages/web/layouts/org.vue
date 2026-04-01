<script setup lang="ts">
import type { OrganizationWithRole } from '@addon-platform/shared';

const route = useRoute();
const api = useApi();

const orgId = computed(() => route.params.slug as string);

const { data: orgData, refresh } = await useAsyncData(
  `org-${orgId.value}`,
  () => api.get<{ organization: OrganizationWithRole }>(`/api/organizations/${orgId.value}`),
  { watch: [orgId] }
);

const organization = computed(() => orgData.value?.organization);

provide('organization', organization);
provide('refreshOrg', refresh);
</script>

<template>
  <div class="layout-org">
    <AppHeader />
    <div class="org-layout">
      <AppSidebar v-if="organization" :organization="organization" />
      <main class="org-content">
        <div class="org-container">
          <OrgTabs v-if="organization" :organization="organization" />
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout-org {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.org-layout {
  flex: 1;
  display: flex;
}

.org-content {
  flex: 1;
  padding: 1.5rem 2rem;
  background-color: var(--color-surface);
}

.org-container {
  max-width: 1000px;
}
</style>
