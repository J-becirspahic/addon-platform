<script setup lang="ts">
const props = defineProps<{
  status: string;
}>();

const steps = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'BUILDING', 'PUBLISHED'] as const;

const stepLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  BUILDING: 'Building',
  PUBLISHED: 'Published',
};

const isErrorState = computed(() => {
  return props.status === 'FAILED' || props.status === 'CHANGES_REQUESTED';
});

const currentStepIndex = computed(() => {
  if (isErrorState.value) {
    if (props.status === 'CHANGES_REQUESTED') return steps.indexOf('IN_REVIEW');
    if (props.status === 'FAILED') return steps.indexOf('BUILDING');
  }
  return steps.indexOf(props.status as typeof steps[number]);
});

function stepState(index: number): 'completed' | 'current' | 'error' | 'upcoming' {
  if (isErrorState.value && index === currentStepIndex.value) {
    return 'error';
  }
  if (index < currentStepIndex.value) return 'completed';
  if (index === currentStepIndex.value) return 'current';
  return 'upcoming';
}
</script>

<template>
  <div class="progress-indicator">
    <div
      v-for="(step, index) in steps"
      :key="step"
      :class="['step', stepState(index)]"
    >
      <div class="step-dot">
        <svg v-if="stepState(index) === 'completed'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg v-else-if="stepState(index) === 'error'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span v-else class="step-number">{{ index + 1 }}</span>
      </div>
      <div class="step-label">{{ stepLabels[step] }}</div>
      <div v-if="index < steps.length - 1" :class="['step-connector', { completed: index < currentStepIndex }]" />
    </div>

    <div v-if="isErrorState" class="error-label">
      {{ status === 'CHANGES_REQUESTED' ? 'Changes Requested' : 'Failed' }}
    </div>
  </div>
</template>

<style scoped>
.progress-indicator {
  display: flex;
  align-items: flex-start;
  gap: 0;
  position: relative;
  padding: 1rem 0;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  min-width: 0;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 1;
}

.step.upcoming .step-dot {
  background-color: var(--color-surface, #f3f4f6);
  color: var(--color-text-secondary, #9ca3af);
  border: 2px solid var(--color-border, #d1d5db);
}

.step.current .step-dot {
  background-color: var(--color-primary, #3b82f6);
  color: white;
  border: 2px solid var(--color-primary, #3b82f6);
}

.step.completed .step-dot {
  background-color: #22c55e;
  color: white;
  border: 2px solid #22c55e;
}

.step.error .step-dot {
  background-color: #ef4444;
  color: white;
  border: 2px solid #ef4444;
}

.step-label {
  margin-top: 0.5rem;
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  text-align: center;
  white-space: nowrap;
}

.step.current .step-label {
  color: var(--color-primary, #3b82f6);
  font-weight: 600;
}

.step.completed .step-label {
  color: #22c55e;
}

.step.error .step-label {
  color: #ef4444;
  font-weight: 600;
}

.step-connector {
  position: absolute;
  top: 14px;
  left: calc(50% + 18px);
  right: calc(-50% + 18px);
  height: 2px;
  background-color: var(--color-border, #d1d5db);
}

.step-connector.completed {
  background-color: #22c55e;
}

.error-label {
  position: absolute;
  bottom: -0.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: #ef4444;
  font-weight: 500;
  white-space: nowrap;
}

.step-number {
  line-height: 1;
}
</style>
