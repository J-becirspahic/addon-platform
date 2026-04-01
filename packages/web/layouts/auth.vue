<template>
  <div class="layout-auth">
    <div class="auth-container">
      <div class="auth-logo">
        <NuxtLink to="/">
          <h1>Addon Platform</h1>
        </NuxtLink>
      </div>
      <div class="auth-card card">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout-auth {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-surface);
  padding: 2rem;
}

.auth-container {
  width: 100%;
  max-width: 400px;
}

.auth-logo {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-logo h1 {
  font-size: 1.5rem;
  color: var(--color-text);
}

.auth-logo a {
  text-decoration: none;
}

.auth-card {
  padding: 2rem;
}
</style>
