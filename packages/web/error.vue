<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{
  error: NuxtError;
}>();

function handleClearError() {
  clearError({ redirect: '/' });
}
</script>

<template>
  <div class="error-page">
    <div class="error-content">
      <h1 class="error-code">{{ error.statusCode || 500 }}</h1>
      <p class="error-message">
        {{ error.statusMessage || error.message || 'An unexpected error occurred' }}
      </p>
      <button class="btn btn-primary" @click="handleClearError">
        Go Home
      </button>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.error-content {
  text-align: center;
}

.error-code {
  font-size: 4rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.error-message {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
  max-width: 400px;
}
</style>
