<script setup lang="ts">
interface BreadcrumbItem {
  label: string;
  to?: string;
}

defineProps<{
  items: BreadcrumbItem[];
}>();
</script>

<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <template v-for="(item, index) in items" :key="index">
      <NuxtLink v-if="item.to && index < items.length - 1" :to="item.to" class="breadcrumb-link">
        {{ item.label }}
      </NuxtLink>
      <span v-else class="breadcrumb-current">{{ item.label }}</span>
      <span v-if="index < items.length - 1" class="breadcrumb-separator">/</span>
    </template>
  </nav>
</template>

<style scoped>
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.breadcrumb-link {
  color: var(--color-text-secondary);
  text-decoration: none;
}

.breadcrumb-link:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.breadcrumb-separator {
  color: var(--color-text-secondary);
}

.breadcrumb-current {
  color: var(--color-text);
  font-weight: 500;
}
</style>
