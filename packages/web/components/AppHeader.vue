<script setup lang="ts">
const { user, isAuthenticated, logout } = useAuth();

const showDropdown = ref(false);
const mobileMenuOpen = ref(false);

function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

function handleLogout() {
  showDropdown.value = false;
  mobileMenuOpen.value = false;
  logout();
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}
</script>

<template>
  <header class="app-header">
    <div class="header-container">
      <div class="header-left">
        <NuxtLink to="/" class="logo">
          Addon Platform
        </NuxtLink>
      </div>

      <button
        class="mobile-menu-toggle"
        aria-label="Toggle menu"
        @click="toggleMobileMenu"
      >
        <span class="hamburger-line" />
        <span class="hamburger-line" />
        <span class="hamburger-line" />
      </button>

      <div class="header-right" :class="{ 'mobile-open': mobileMenuOpen }">
        <template v-if="isAuthenticated">
          <NotificationBell />
          <div class="user-menu" @click="toggleDropdown">
            <div class="user-avatar">
              {{ user?.name?.charAt(0).toUpperCase() || 'U' }}
            </div>
            <span class="user-name">{{ user?.name }}</span>

            <div v-if="showDropdown" class="dropdown-menu">
              <NuxtLink to="/settings" class="dropdown-item" @click="showDropdown = false; mobileMenuOpen = false">
                Settings
              </NuxtLink>
              <button class="dropdown-item" @click="handleLogout">
                Logout
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="btn btn-secondary" @click="mobileMenuOpen = false">
            Login
          </NuxtLink>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  padding: 0 1rem;
  height: 60px;
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  text-decoration: none;
}

.mobile-menu-toggle {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
}

.hamburger-line {
  display: block;
  width: 20px;
  height: 2px;
  background-color: var(--color-text);
  border-radius: 1px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-md);
}

.user-menu:hover {
  background-color: var(--color-surface);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 0.875rem;
}

.user-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  min-width: 150px;
  z-index: 100;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  text-align: left;
  border: none;
  background: none;
  color: var(--color-text);
  font-size: 0.875rem;
  cursor: pointer;
  text-decoration: none;
}

.dropdown-item:hover {
  background-color: var(--color-surface);
}

@media (max-width: 768px) {
  .mobile-menu-toggle {
    display: flex;
  }

  .header-right {
    display: none;
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    background-color: var(--color-background);
    border-bottom: 1px solid var(--color-border);
    padding: 1rem;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    box-shadow: var(--shadow-md);
    z-index: 99;
  }

  .header-right.mobile-open {
    display: flex;
  }

  .user-menu {
    justify-content: center;
  }

  .dropdown-menu {
    position: static;
    margin-top: 0.5rem;
    box-shadow: none;
    border: 1px solid var(--color-border);
  }
}
</style>
