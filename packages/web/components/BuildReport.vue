<script setup lang="ts">
import type { BuildReport } from '@addon-platform/shared';

const props = defineProps<{
  report: BuildReport;
}>();

const expandedSteps = ref<Set<number>>(new Set());

function toggleStep(index: number) {
  if (expandedSteps.value.has(index)) {
    expandedSteps.value.delete(index);
  } else {
    expandedSteps.value.add(index);
  }
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function stepStatusIcon(status: string): string {
  switch (status) {
    case 'success': return '✓';
    case 'failed': return '✗';
    case 'running': return '⟳';
    case 'skipped': return '—';
    default: return '○';
  }
}
</script>

<template>
  <div class="build-report">
    <div class="report-header">
      <span :class="['report-status', report.status]">
        {{ report.status === 'success' ? 'Build Successful' : 'Build Failed' }}
      </span>
      <span class="report-duration">{{ formatDuration(report.duration) }}</span>
    </div>

    <div v-if="report.error" class="report-error">
      <pre>{{ report.error }}</pre>
    </div>

    <div class="steps-list">
      <div
        v-for="(step, index) in report.steps"
        :key="index"
        class="step-item"
      >
        <div class="step-header" @click="toggleStep(index)">
          <span :class="['step-icon', step.status]">{{ stepStatusIcon(step.status) }}</span>
          <span class="step-name">{{ step.name }}</span>
          <span class="step-duration">{{ formatDuration(step.duration) }}</span>
          <span class="step-toggle">{{ expandedSteps.has(index) ? '▼' : '▶' }}</span>
        </div>
        <div v-if="expandedSteps.has(index)" class="step-details">
          <div v-if="step.error" class="step-error">
            <pre>{{ step.error }}</pre>
          </div>
          <div v-if="step.logs" class="step-logs">
            <pre>{{ step.logs }}</pre>
          </div>
        </div>
      </div>
    </div>

    <div v-if="report.artifacts.length > 0" class="artifacts-section">
      <h4 class="section-title">Artifacts</h4>
      <div v-for="artifact in report.artifacts" :key="artifact.name" class="artifact-item">
        <a :href="artifact.url" target="_blank" rel="noopener" class="artifact-link">
          {{ artifact.name }}
        </a>
        <span class="artifact-size">{{ (artifact.size / 1024).toFixed(1) }} KB</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.build-report {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.report-status {
  font-weight: 600;
  font-size: 0.875rem;
}

.report-status.success {
  color: #16a34a;
}

.report-status.failed {
  color: #dc2626;
}

.report-duration {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.report-error {
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border-bottom: 1px solid var(--color-border);
}

.report-error pre {
  margin: 0;
  font-size: 0.8125rem;
  color: #991b1b;
  white-space: pre-wrap;
  word-break: break-word;
}

.steps-list {
  padding: 0;
}

.step-item {
  border-bottom: 1px solid var(--color-border);
}

.step-item:last-child {
  border-bottom: none;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  cursor: pointer;
  user-select: none;
}

.step-header:hover {
  background: var(--color-surface);
}

.step-icon {
  width: 20px;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.step-icon.success { color: #16a34a; }
.step-icon.failed { color: #dc2626; }
.step-icon.running { color: #2563eb; }
.step-icon.skipped { color: #9ca3af; }
.step-icon.pending { color: #9ca3af; }

.step-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
}

.step-duration {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.step-toggle {
  font-size: 0.625rem;
  color: var(--color-text-secondary);
}

.step-details {
  padding: 0.5rem 1rem 0.75rem 2.5rem;
}

.step-error {
  margin-bottom: 0.5rem;
}

.step-error pre {
  margin: 0;
  font-size: 0.75rem;
  color: #991b1b;
  background: #fef2f2;
  padding: 0.5rem;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

.step-logs pre {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  padding: 0.5rem;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.artifacts-section {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border);
}

.section-title {
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.artifact-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0;
  font-size: 0.8125rem;
}

.artifact-link {
  color: var(--color-primary);
  text-decoration: none;
}

.artifact-link:hover {
  text-decoration: underline;
}

.artifact-size {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}
</style>
