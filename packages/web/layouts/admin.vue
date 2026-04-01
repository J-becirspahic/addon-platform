<script setup lang="ts">
</script>

<template>
  <div class="layout-admin">
    <AppHeader />
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <nav class="admin-nav">
          <h3 class="admin-nav-title">Admin</h3>
          <NuxtLink to="/admin/builds" class="admin-nav-link">
            Builds
          </NuxtLink>
        </nav>
      </aside>
      <main class="admin-content">
        <div class="admin-container">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout-admin {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.admin-layout {
  flex: 1;
  display: flex;
}

.admin-sidebar {
  width: 200px;
  border-right: 1px solid var(--color-border);
  padding: 1.5rem 1rem;
  background: var(--color-bg);
}

.admin-nav-title {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.admin-nav-link {
  display: block;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--color-text);
  text-decoration: none;
}

.admin-nav-link:hover {
  background: var(--color-surface);
}

.admin-nav-link.router-link-active {
  background: var(--color-surface);
  font-weight: 600;
  color: var(--color-primary);
}

.admin-content {
  flex: 1;
  padding: 1.5rem 2rem;
  background-color: var(--color-surface);
}

.admin-container {
  max-width: 1000px;
}
</style>
