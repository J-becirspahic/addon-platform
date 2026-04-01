<script setup lang="ts">
const { user, isAuthenticated, logout } = useAuth();
</script>

<template>
  <div class="layout-default">
    <AppHeader />
    <main class="main-content">
      <div class="container">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout-default {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 2rem 0;
}
</style>
