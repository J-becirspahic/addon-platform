<script setup lang="ts">
const { state, handleConfirm, handleCancel } = useConfirm();

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && state.isOpen) {
    handleCancel();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div v-if="state.isOpen" class="confirm-overlay" @click.self="handleCancel">
        <div class="confirm-dialog">
          <h3 class="confirm-title">{{ state.title }}</h3>
          <p class="confirm-message">{{ state.message }}</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" @click="handleCancel">
              {{ state.cancelText }}
            </button>
            <button
              class="btn"
              :class="state.variant === 'danger' ? 'btn-danger' : 'btn-primary'"
              @click="handleConfirm"
            >
              {{ state.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
}

.confirm-dialog {
  background-color: var(--color-background);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 1.5rem;
  max-width: 420px;
  width: 90%;
}

.confirm-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.confirm-message {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}
</style>
