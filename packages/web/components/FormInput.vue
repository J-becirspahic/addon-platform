<script setup lang="ts">
const props = defineProps<{
  label?: string;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}>();

const model = defineModel<string>();
</script>

<template>
  <div class="form-group">
    <label v-if="label" class="form-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    <input
      v-model="model"
      :type="type || 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="['form-input', { error: !!error }]"
    />
    <span v-if="error" class="form-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.required {
  color: var(--color-error);
}
</style>
